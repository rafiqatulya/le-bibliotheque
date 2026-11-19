import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  ArrowLeft,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Eraser,
  Highlighter,
  PenTool,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  BookOpen,
  Star,
  Check,
  Undo2,
  List,
  X,
} from 'lucide-react';
import { loadPdfDocument } from '../utils/pdfHelper';
import { getAnnotations, getPdfBuffer, saveAnnotations } from '../utils/db';
import { playPageFlipSound } from '../utils/sound';
import BookmarkRibbon, { ALL_BOOKMARKS } from './BookmarkRibbon';

const HIGHLIGHT_COLORS = [
  { id: 'gold', label: 'Mustar', hex: 'rgba(232, 194, 96, 0.48)', solid: '#E0B856' },
  { id: 'rose', label: 'Sakura', hex: 'rgba(222, 152, 158, 0.48)', solid: '#DA9298' },
  { id: 'sage', label: 'Sage', hex: 'rgba(154, 186, 144, 0.48)', solid: '#94B68A' },
  { id: 'sky', label: 'Langit', hex: 'rgba(146, 184, 212, 0.48)', solid: '#8BB4D0' },
];

const PAPER_THEMES = [
  { id: 'classic', label: 'Kertas Klasik', icon: BookOpen },
  { id: 'soft', label: 'HVS Lembut', icon: Sun },
  { id: 'night', label: 'Malam Hangat', icon: Moon },
];

export default function PdfReader({ book, onBack, onUpdateBook, onOpenReview }) {
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(book.currentPage || 1);
  const [totalPages, setTotalPages] = useState(book.totalPages || 1);
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);

  // Mode interaksi: 'read' | 'text-highlight' | 'draw-highlight'
  const [mode, setMode] = useState('read');
  const [paperTheme, setPaperTheme] = useState('classic');
  const [colorIdx, setColorIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [showChrome, setShowChrome] = useState(true);
  const [showBookmarkPicker, setShowBookmarkPicker] = useState(false);
  const [showBookmarkList, setShowBookmarkList] = useState(false);

  // Data anotasi
  const [annotations, setAnnotations] = useState({
    id: book.id,
    highlights: [],
    strokes: {},
    bookmarks: [],
  });

  // State stabilo coret bebas
  const [activeStroke, setActiveStroke] = useState(null);

  // State stabilo block teks
  const [pendingSelection, setPendingSelection] = useState(null);

  // State gestur balik kertas 3D dari semua sisi & sudut
  const [dragState, setDragState] = useState(null);
  const [flipAnim, setFlipAnim] = useState(null); // 'next' | 'prev' | null

  const canvasRef = useRef(null);
  const textLayerRef = useRef(null);
  const pageBoxRef = useRef(null);
  const sessionStartRef = useRef(Date.now());
  const renderTaskRef = useRef(null);

  const activeColor = HIGHLIGHT_COLORS[colorIdx];

  // Muat PDF dan anotasi dari IndexedDB
  useEffect(() => {
    let mounted = true;
    sessionStartRef.current = Date.now();

    async function init() {
      try {
        const [buffer, savedAnn] = await Promise.all([
          getPdfBuffer(book.id),
          getAnnotations(book.id),
        ]);
        if (!mounted || !buffer) return;
        const doc = await loadPdfDocument(buffer);
        if (!mounted) return;
        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setAnnotations(savedAnn);
        setLoading(false);
      } catch (err) {
        console.error('Gagal membuka PDF:', err);
        setLoading(false);
      }
    }
    init();

    return () => {
      mounted = false;
      const elapsedSec = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 1000));
      onUpdateBook({
        ...book,
        currentPage: pageNum,
        lastReadAt: Date.now(),
        readingSeconds: (book.readingSeconds || 0) + elapsedSec,
        sessions: (book.sessions || 0) + 1,
      });
    };
  }, [book.id]);

  // Simpan progres halaman setiap berpindah
  useEffect(() => {
    if (!loading) {
      onUpdateBook({
        ...book,
        currentPage: pageNum,
        totalPages,
        lastReadAt: Date.now(),
      });
    }
  }, [pageNum]);

  // Render halaman PDF + text layer
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;
    let cancelled = false;

    async function renderPage() {
      setRendering(true);
      setPendingSelection(null);

      try {
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {}
        }

        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const containerWidth = Math.min(window.innerWidth - 28, 520);
        const unscaled = page.getViewport({ scale: 1 });
        const scale = containerWidth / unscaled.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, viewport.width, viewport.height);

        const task = page.render({ canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;

        // Render text layer agar teks PDF bisa di-block untuk stabilo
        if (textLayerRef.current && !cancelled) {
          const textLayerDiv = textLayerRef.current;
          textLayerDiv.innerHTML = '';
          textLayerDiv.style.width = `${viewport.width}px`;
          textLayerDiv.style.height = `${viewport.height}px`;
          textLayerDiv.style.setProperty('--scale-factor', String(scale));

          const textContent = await page.getTextContent();
          if (cancelled) return;

          pdfjsLib.renderTextLayer({
            textContentSource: textContent,
            container: textLayerDiv,
            viewport,
            textDivs: [],
          });
        }
      } catch (err) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn('Render halaman:', err);
        }
      } finally {
        if (!cancelled) setRendering(false);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pdfDoc, pageNum]);

  const persistAnnotations = async (next) => {
    setAnnotations(next);
    await saveAnnotations(book.id, next);
  };

  // Fungsi ganti halaman dengan efek animasi kertas + suara
  const turnPage = (dir) => {
    if (dir === 'next' && pageNum < totalPages) {
      playPageFlipSound(muted);
      setFlipAnim('next');
      setTimeout(() => {
        setPageNum((p) => Math.min(totalPages, p + 1));
        setFlipAnim(null);
      }, 240);
    } else if (dir === 'prev' && pageNum > 1) {
      playPageFlipSound(muted);
      setFlipAnim('prev');
      setTimeout(() => {
        setPageNum((p) => Math.max(1, p - 1));
        setFlipAnim(null);
      }, 240);
    }
  };

  // --- GESTUR BALIK KERTAS 3D SEMUA SISI & SUDUT ---
  const handlePagePointerDown = (e) => {
    if (mode !== 'read' || !pageBoxRef.current) return;
    const rect = pageBoxRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const zoneY = y < rect.height * 0.33 ? 'top' : y > rect.height * 0.67 ? 'bottom' : 'mid';
    const side = x > rect.width * 0.5 ? 'right' : 'left';

    setDragState({
      startX: e.clientX,
      startY: e.clientY,
      dx: 0,
      dy: 0,
      width: rect.width,
      side,
      zoneY,
      moved: false,
    });
  };

  const handlePagePointerMove = (e) => {
    if (!dragState || mode !== 'read') return;
    const dx = e.clientX - dragState.startX;
    const dy = e.clientY - dragState.startY;
    setDragState((prev) => ({
      ...prev,
      dx,
      dy,
      moved: prev.moved || Math.abs(dx) > 6 || Math.abs(dy) > 6,
    }));
  };

  const handlePagePointerUp = () => {
    if (!dragState || mode !== 'read') return;
    const { dx, side, moved } = dragState;
    setDragState(null);

    if (!moved) {
      // Sentuh tepi kanan/kiri untuk balik halaman, tengah untuk toggle toolbar
      if (side === 'right' && dragState.startX > window.innerWidth * 0.72) {
        turnPage('next');
      } else if (side === 'left' && dragState.startX < window.innerWidth * 0.28) {
        turnPage('prev');
      } else {
        setShowChrome((v) => !v);
      }
      return;
    }

    if (dx < -45) {
      turnPage('next');
    } else if (dx > 45) {
      turnPage('prev');
    }
  };

  // Hitung transformasi 3D lengkungan halaman saat jari menggeser dari sisi/sudut mana pun
  const getPageTransformStyle = () => {
    if (flipAnim === 'next') {
      return {
        transform: 'perspective(1400px) rotateY(-28deg) translateX(-18px) scale(0.98)',
        opacity: 0.78,
        transition: 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease',
      };
    }
    if (flipAnim === 'prev') {
      return {
        transform: 'perspective(1400px) rotateY(28deg) translateX(18px) scale(0.98)',
        opacity: 0.78,
        transition: 'transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.24s ease',
      };
    }
    if (!dragState || !dragState.moved) {
      return {
        transform: 'perspective(1400px) rotateY(0deg) rotateX(0deg)',
        transition: 'transform 0.42s cubic-bezier(0.22, 1, 0.36, 1)',
      };
    }

    const ratio = Math.max(-1, Math.min(1, dragState.dx / (dragState.width * 0.85)));
    const rotateY = ratio * 38;
    const tiltFactor = dragState.zoneY === 'top' ? -1 : dragState.zoneY === 'bottom' ? 1 : 0;
    const rotateX = Math.abs(ratio) * 6 * tiltFactor;
    const skewY = ratio * 2.5 * tiltFactor;

    return {
      transform: `perspective(1400px) rotateY(${rotateY}deg) rotateX(${rotateX}deg) skewY(${skewY}deg) translateX(${
        dragState.dx * 0.16
      }px)`,
      transformOrigin: ratio < 0 ? 'left center' : 'right center',
      transition: 'none',
    };
  };

  // --- MODE STABILO 1: BLOCK TEKS ---
  const captureTextSelection = () => {
    if (mode !== 'text-highlight' || !pageBoxRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      setPendingSelection(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const pageRect = pageBoxRef.current.getBoundingClientRect();
    const clientRects = Array.from(range.getClientRects());

    const rects = clientRects
      .filter((r) => r.width > 2 && r.height > 2)
      .map((r) => ({
        left: ((r.left - pageRect.left) / pageRect.width) * 100,
        top: ((r.top - pageRect.top) / pageRect.height) * 100,
        width: (r.width / pageRect.width) * 100,
        height: (r.height / pageRect.height) * 100,
      }));

    if (rects.length > 0) {
      setPendingSelection({
        text: sel.toString().trim(),
        rects,
      });
    }
  };

  const applyTextHighlight = async () => {
    if (!pendingSelection) return;
    const newItem = {
      id: `hl-${Date.now()}`,
      page: pageNum,
      text: pendingSelection.text,
      rects: pendingSelection.rects,
      color: activeColor.hex,
      createdAt: Date.now(),
    };
    const next = {
      ...annotations,
      highlights: [...annotations.highlights, newItem],
    };
    await persistAnnotations(next);
    window.getSelection()?.removeAllRanges();
    setPendingSelection(null);
  };

  // --- MODE STABILO 2: CORET BEBAS (FREEHAND) ---
  const getNormalizedPoint = (e) => {
    const rect = pageBoxRef.current.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    };
  };

  const handleDrawDown = (e) => {
    if (mode !== 'draw-highlight' || !pageBoxRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = getNormalizedPoint(e);
    setActiveStroke({
      id: `st-${Date.now()}`,
      color: activeColor.hex,
      points: [pt],
    });
  };

  const handleDrawMove = (e) => {
    if (!activeStroke || mode !== 'draw-highlight') return;
    const pt = getNormalizedPoint(e);
    setActiveStroke((prev) => ({
      ...prev,
      points: [...prev.points, pt],
    }));
  };

  const handleDrawUp = async () => {
    if (!activeStroke) return;
    const pageStrokes = annotations.strokes[pageNum] || [];
    const next = {
      ...annotations,
      strokes: {
        ...annotations.strokes,
        [pageNum]: [...pageStrokes, activeStroke],
      },
    };
    setActiveStroke(null);
    await persistAnnotations(next);
  };

  const undoLastStroke = async () => {
    const pageStrokes = annotations.strokes[pageNum] || [];
    if (pageStrokes.length === 0) return;
    const next = {
      ...annotations,
      strokes: {
        ...annotations.strokes,
        [pageNum]: pageStrokes.slice(0, -1),
      },
    };
    await persistAnnotations(next);
  };

  // --- PEMBATAS BUKU ---
  const currentBookmark = annotations.bookmarks.find((b) => b.page === pageNum);

  const toggleBookmarkStyle = async (styleId) => {
    const filtered = annotations.bookmarks.filter((b) => b.page !== pageNum);
    const nextBookmarks = [
      ...filtered,
      {
        id: `bm-${Date.now()}`,
        page: pageNum,
        styleId,
        createdAt: Date.now(),
      },
    ].sort((a, b) => a.page - b.page);

    await persistAnnotations({ ...annotations, bookmarks: nextBookmarks });
    setShowBookmarkPicker(false);
  };

  const removeCurrentBookmark = async () => {
    const filtered = annotations.bookmarks.filter((b) => b.page !== pageNum);
    await persistAnnotations({ ...annotations, bookmarks: filtered });
    setShowBookmarkPicker(false);
  };

  const pageHighlights = annotations.highlights.filter((h) => h.page === pageNum);
  const pageStrokes = annotations.strokes[pageNum] || [];
  const curlAmount = dragState?.moved ? Math.min(1, Math.abs(dragState.dx) / 220) : 0;

  const paperClass =
    paperTheme === 'classic'
      ? 'pdf-paper-classic'
      : paperTheme === 'night'
      ? 'pdf-paper-night'
      : 'pdf-paper-soft';

  const canvasClass =
    paperTheme === 'classic'
      ? 'pdf-canvas-classic'
      : paperTheme === 'night'
      ? 'pdf-canvas-night'
      : 'pdf-canvas-soft';

  const cyclePaperTheme = () => {
    const idx = PAPER_THEMES.findIndex((t) => t.id === paperTheme);
    setPaperTheme(PAPER_THEMES[(idx + 1) % PAPER_THEMES.length].id);
  };

  const currentThemeObj = PAPER_THEMES.find((t) => t.id === paperTheme) || PAPER_THEMES[0];
  const ThemeIcon = currentThemeObj.icon;

  return (
    <div
      className={`fixed inset-0 z-40 flex flex-col animate-fade-in transition-colors duration-500 ${
        paperTheme === 'night' ? 'bg-[#191613] text-[#EAE2D6]' : 'bg-[#EAE0CE] text-[#2E2721]'
      }`}
    >
      {/* Bar Atas */}
      <header
        className={`flex items-center justify-between px-4 py-3 z-30 transition-all duration-300 ${
          showChrome ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        } ${
          paperTheme === 'night'
            ? 'bg-[#221E1A]/95 border-b border-white/10'
            : 'bg-[#F5EFE4]/95 border-b border-[#DDD0B8]'
        }`}
      >
        <button
          type="button"
          onClick={onBack}
          className="p-2 -ml-2 rounded-full hover:bg-black/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="text-center max-w-[56%]">
          <p className="font-serif text-base font-semibold truncate">{book.title}</p>
          <p className="font-sans text-[10px] opacity-60">
            Halaman {pageNum} dari {totalPages}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setShowBookmarkList(true)}
            className="p-2 rounded-full hover:bg-black/5"
            title="Daftar Pembatas"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowBookmarkPicker(true)}
            className={`p-2 rounded-full hover:bg-black/5 ${
              currentBookmark ? 'text-[#C44536]' : ''
            }`}
            title="Pasang Pembatas Buku"
          >
            <Bookmark className={`w-4 h-4 ${currentBookmark ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-2 rounded-full hover:bg-black/5"
            title="Suara Balik Kertas"
          >
            {muted ? <VolumeX className="w-4 h-4 opacity-50" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Area Lembar Buku */}
      <main
        className="relative flex-1 flex flex-col items-center justify-center overflow-auto px-3 py-4 touch-none"
        onPointerDown={handlePagePointerDown}
        onPointerMove={handlePagePointerMove}
        onPointerUp={handlePagePointerUp}
        onPointerCancel={() => setDragState(null)}
      >
        {loading ? (
          <div className="text-center space-y-2 animate-pulse">
            <BookOpen className="w-8 h-8 mx-auto text-[#C4973C]" />
            <p className="font-serif italic text-base opacity-70">Membuka lembar buku...</p>
          </div>
        ) : (
          <div className="relative flex flex-col items-center">
            {/* Wadah Halaman dengan Efek Lipatan & Bayangan Kertas Nyata */}
            <div
              ref={pageBoxRef}
              style={getPageTransformStyle()}
              className={`relative rounded-r-lg rounded-l-[3px] shadow-[0_14px_38px_rgba(38,30,22,0.24),inset_12px_0_24px_rgba(62,48,32,0.12)] border border-[#D4C3A3]/70 overflow-hidden select-none ${paperClass}`}
            >
              {/* Lipatan tulang buku di sisi kiri */}
              <div className="pointer-events-none absolute inset-y-0 left-0 w-5 bg-gradient-to-r from-[#3A2E22]/15 via-[#3A2E22]/5 to-transparent z-20" />

              {/* Efek lipatan sudut / bayangan saat jari menggeser kertas */}
              {curlAmount > 0.04 && (
                <div
                  className="pointer-events-none absolute inset-0 z-30"
                  style={{
                    background:
                      dragState?.dx < 0
                        ? `linear-gradient(255deg, rgba(250,244,230,${
                            curlAmount * 0.85
                          }) 0%, rgba(196,178,148,${
                            curlAmount * 0.45
                          }) 14%, rgba(46,39,33,${curlAmount * 0.22}) 24%, transparent 45%)`
                        : `linear-gradient(105deg, rgba(250,244,230,${
                            curlAmount * 0.85
                          }) 0%, rgba(196,178,148,${
                            curlAmount * 0.45
                          }) 14%, rgba(46,39,33,${curlAmount * 0.22}) 24%, transparent 45%)`,
                  }}
                />
              )}

              {/* Pembatas buku ilustrasi yang menyelip di tepi atas */}
              {currentBookmark && (
                <div className="absolute -top-2 right-5 z-30 animate-fade-in">
                  <BookmarkRibbon
                    styleId={currentBookmark.styleId}
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowBookmarkPicker(true);
                    }}
                  />
                </div>
              )}

              {/* Kanvas PDF */}
              <canvas ref={canvasRef} className={`block ${canvasClass}`} />

              {/* Lapisan Stabilo Block Teks yang sudah tersimpan */}
              <div className="pointer-events-none absolute inset-0 z-10">
                {pageHighlights.map((hl) =>
                  hl.rects.map((r, idx) => (
                    <div
                      key={`${hl.id}-${idx}`}
                      style={{
                        left: `${r.left}%`,
                        top: `${r.top}%`,
                        width: `${r.width}%`,
                        height: `${r.height}%`,
                        backgroundColor: hl.color,
                        mixBlendMode: paperTheme === 'night' ? 'screen' : 'multiply',
                      }}
                      className="absolute rounded-[2px]"
                    />
                  ))
                )}
              </div>

              {/* Lapisan Stabilo Coret Bebas (SVG) */}
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className={`absolute inset-0 w-full h-full z-20 ${
                  mode === 'draw-highlight'
                    ? 'pointer-events-auto cursor-crosshair touch-none'
                    : 'pointer-events-none'
                }`}
                style={{ mixBlendMode: paperTheme === 'night' ? 'screen' : 'multiply' }}
                onPointerDown={handleDrawDown}
                onPointerMove={handleDrawMove}
                onPointerUp={handleDrawUp}
              >
                {[...pageStrokes, ...(activeStroke ? [activeStroke] : [])].map((st) => (
                  <polyline
                    key={st.id}
                    fill="none"
                    stroke={st.color}
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={st.points.map((p) => `${p.x},${p.y}`).join(' ')}
                  />
                ))}
              </svg>

              {/* Lapisan Teks PDF Interaktif (aktif saat Mode Stabilo Block Teks) */}
              <div
                ref={textLayerRef}
                onPointerUp={captureTextSelection}
                onTouchEnd={() => setTimeout(captureTextSelection, 120)}
                className={`pdf-text-layer z-20 ${
                  mode === 'text-highlight' ? 'pointer-events-auto' : 'pointer-events-none'
                }`}
              />

              {rendering && (
                <div className="absolute inset-0 bg-[#F2E8D5]/25 pointer-events-none z-30" />
              )}
            </div>

            {/* Tombol Simpan Kutipan saat teks selesai di-block */}
            {mode === 'text-highlight' && pendingSelection && (
              <div className="mt-3 flex items-center gap-2 bg-[#2E2721] text-[#FAF6EE] px-4 py-2 rounded-full shadow-lg z-30 animate-fade-in">
                <span className="text-xs font-sans max-w-[170px] truncate opacity-85">
                  “{pendingSelection.text}”
                </span>
                <button
                  type="button"
                  onClick={applyTextHighlight}
                  className="flex items-center gap-1 bg-[#D7AE54] text-[#2E2721] px-3 py-1 rounded-full text-xs font-sans font-semibold"
                >
                  <Check className="w-3.5 h-3.5" />
                  Stabilo
                </button>
              </div>
            )}

            {/* Ajakan Penilaian Akhir saat tiba di halaman terakhir */}
            {pageNum === totalPages && totalPages > 0 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenReview();
                }}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#4A3F35] text-[#FAF6EE] shadow-md font-serif text-base hover:bg-[#3A3129] transition-all animate-fade-in"
              >
                <Star className="w-4 h-4 text-[#E0B856] fill-[#E0B856]" />
                Tutup Buku & Beri Penilaian (1–10)
              </button>
            )}
          </div>
        )}
      </main>

      {/* Bar Bawah Kontrol Baca & Stabilo */}
      <footer
        className={`px-4 pt-2.5 pb-4 z-30 transition-all duration-300 ${
          showChrome ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-full pointer-events-none'
        } ${
          paperTheme === 'night'
            ? 'bg-[#221E1A]/95 border-t border-white/10'
            : 'bg-[#F5EFE4]/95 border-t border-[#DDD0B8]'
        }`}
      >
        {/* Pemilih warna stabilo muncul saat mode stabilo aktif */}
        {mode !== 'read' && (
          <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-current/10 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] opacity-70">
                {mode === 'text-highlight' ? 'Blok kalimat:' : 'Coret bebas:'}
              </span>
              {HIGHLIGHT_COLORS.map((c, idx) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setColorIdx(idx)}
                  style={{ backgroundColor: c.solid }}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${
                    colorIdx === idx ? 'border-[#2E2721] scale-110' : 'border-transparent'
                  }`}
                  title={c.label}
                />
              ))}
            </div>
            {mode === 'draw-highlight' && (
              <button
                type="button"
                onClick={undoLastStroke}
                className="flex items-center gap-1 text-xs font-sans px-2.5 py-1 rounded-full bg-black/5"
              >
                <Undo2 className="w-3.5 h-3.5" />
                Urungkan
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {/* Navigasi Halaman */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={pageNum <= 1}
              onClick={() => turnPage('prev')}
              className="p-2 rounded-xl bg-black/5 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={pageNum >= totalPages}
              onClick={() => turnPage('next')}
              className="p-2 rounded-xl bg-black/5 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* 3 Mode: Baca | Block Teks | Coret Bebas */}
          <div className="flex items-center gap-1 bg-black/5 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setMode('read')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-medium flex items-center gap-1 transition-all ${
                mode === 'read' ? 'bg-[#4A3F35] text-[#FAF6EE]' : 'opacity-70'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Geser
            </button>
            <button
              type="button"
              onClick={() => setMode('text-highlight')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-medium flex items-center gap-1 transition-all ${
                mode === 'text-highlight' ? 'bg-[#C4973C] text-[#FAF6EE]' : 'opacity-70'
              }`}
            >
              <Highlighter className="w-3.5 h-3.5" />
              Blok
            </button>
            <button
              type="button"
              onClick={() => setMode('draw-highlight')}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-sans font-medium flex items-center gap-1 transition-all ${
                mode === 'draw-highlight' ? 'bg-[#C4973C] text-[#FAF6EE]' : 'opacity-70'
              }`}
            >
              <PenTool className="w-3.5 h-3.5" />
              Coret
            </button>
          </div>

          {/* Ganti Tema Kertas Klasik / Lembut / Malam */}
          <button
            type="button"
            onClick={cyclePaperTheme}
            className="p-2 rounded-xl bg-black/5 flex items-center gap-1"
            title={`Tema: ${currentThemeObj.label}`}
          >
            <ThemeIcon className="w-4 h-4 text-[#C4973C]" />
          </button>
        </div>
      </footer>

      {/* Modal Pemilih Pembatas Buku Lucu */}
      {showBookmarkPicker && (
        <div
          className="fixed inset-0 z-50 bg-[#2E2721]/45 backdrop-blur-sm flex items-end justify-center animate-fade-in"
          onClick={() => setShowBookmarkPicker(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-t-3xl paper-grain border-t border-[#D8C9B0] p-5 pb-8 text-[#2E2721]"
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-serif text-xl font-semibold">Pilih Pembatas Buku</h3>
                <p className="font-sans text-xs text-[#786B5D]">
                  Tandai halaman {pageNum} dengan pembatas favoritmu
                </p>
              </div>
              <div className="flex items-center gap-2">
                {currentBookmark && (
                  <button
                    type="button"
                    onClick={removeCurrentBookmark}
                    className="text-xs font-sans text-[#B23A32] px-2.5 py-1 rounded-full bg-[#B23A32]/10 flex items-center gap-1"
                  >
                    <Eraser className="w-3 h-3" />
                    Lepas
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowBookmarkPicker(false)}
                  className="p-1.5 rounded-full hover:bg-black/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {ALL_BOOKMARKS.map((bm) => (
                <div key={bm.id} className="flex flex-col items-center gap-1.5 shrink-0">
                  <BookmarkRibbon
                    styleId={bm.id}
                    size="picker"
                    onClick={() => toggleBookmarkStyle(bm.id)}
                  />
                  <span className="font-sans text-[10px] text-[#5E5245] max-w-[70px] truncate">
                    {bm.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Daftar Pembatas Buku di Buku Ini */}
      {showBookmarkList && (
        <div
          className="fixed inset-0 z-50 bg-[#2E2721]/45 backdrop-blur-sm flex items-end justify-center animate-fade-in"
          onClick={() => setShowBookmarkList(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[65vh] overflow-y-auto rounded-t-3xl paper-grain border-t border-[#D8C9B0] p-5 pb-8 text-[#2E2721]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl font-semibold">Halaman yang Ditandai</h3>
              <button
                type="button"
                onClick={() => setShowBookmarkList(false)}
                className="p-1.5 rounded-full hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {annotations.bookmarks.length === 0 ? (
              <p className="font-serif italic text-center text-[#786B5D] py-8">
                Belum ada pembatas buku di e-book ini.
              </p>
            ) : (
              <div className="space-y-2.5">
                {annotations.bookmarks.map((bm) => (
                  <button
                    key={bm.id}
                    type="button"
                    onClick={() => {
                      setPageNum(bm.page);
                      setShowBookmarkList(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#FAF6EE] border border-[#E2D5BE] hover:border-[#C4973C] transition-colors"
                  >
                    <span className="font-serif text-base">Halaman {bm.page}</span>
                    <span className="font-sans text-xs text-[#A47A28]">Lompat →</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
