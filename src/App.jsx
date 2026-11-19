import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Quote,
  BarChart3,
  Heart,
  Star,
  Trash2,
  ArrowLeft,
  FolderPlus,
  Sparkles,
  Clock,
  Upload,
} from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import AmbientMotifs from './components/AmbientMotifs';
import PdfReader from './components/PdfReader';
import BookReviewModal from './components/BookReviewModal';
import {
  deleteBook,
  getAllAnnotations,
  getAllBooks,
  getAnnotations,
  getCategories,
  saveBook,
  saveCategories,
} from './utils/db';
import { extractPdfMeta } from './utils/pdfHelper';

function formatDuration(totalSeconds = 0) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}j ${m}m`;
  return `${m}m`;
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tab, setTab] = useState('library'); // 'library' | 'quotes' | 'stats'
  const [books, setBooks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  const [activeBook, setActiveBook] = useState(null); // Detail buku
  const [readingBook, setReadingBook] = useState(null); // Reader aktif
  const [reviewingBook, setReviewingBook] = useState(null); // Modal penilaian 1-10
  const [activeBookQuotes, setActiveBookQuotes] = useState([]);
  const [allQuotes, setAllQuotes] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modal metadata upload PDF
  const [pendingUpload, setPendingUpload] = useState(null);
  const fileInputRef = useRef(null);

  const loadData = async () => {
    const [bList, cats, allAnn] = await Promise.all([
      getAllBooks(),
      getCategories(),
      getAllAnnotations(),
    ]);
    setBooks(bList);
    setCategories(cats);

    const bookMap = Object.fromEntries(bList.map((b) => [b.id, b]));
    const flatQuotes = [];
    allAnn.forEach((ann) => {
      const b = bookMap[ann.id];
      if (!b) return;
      (ann.highlights || []).forEach((h) => {
        flatQuotes.push({
          ...h,
          bookId: b.id,
          bookTitle: b.title,
          bookAuthor: b.author,
        });
      });
    });
    setAllQuotes(flatQuotes.sort((a, b) => b.createdAt - a.createdAt));
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!activeBook) return;
    getAnnotations(activeBook.id).then((ann) => {
      setActiveBookQuotes((ann.highlights || []).sort((a, b) => a.page - b.page));
    });
  }, [activeBook, readingBook]);

  // Filter buku berdasarkan pencarian judul/penulis & kategori
  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return books.filter((b) => {
      const matchSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        (b.author || '').toLowerCase().includes(q);
      const matchCat =
        selectedCategory === 'Semua'
          ? true
          : selectedCategory === 'Favorit'
          ? b.isFavorite || b.category === 'Favorit'
          : b.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [books, searchQuery, selectedCategory]);

  const continueReadingBook = useMemo(() => {
    return books.find((b) => (b.currentPage || 1) >= 1) || null;
  }, [books]);

  const handleFileChosen = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const { totalPages, coverDataUrl } = await extractPdfMeta(buffer);
      const cleanName = file.name.replace(/\.pdf$/i, '').replace(/[_-]+/g, ' ');
      setPendingUpload({
        buffer,
        title: cleanName,
        author: 'Penulis Pilihan',
        category: selectedCategory !== 'Semua' ? selectedCategory : categories[0] || 'Fiksi',
        totalPages,
        coverDataUrl,
      });
    } catch (err) {
      alert('Gagal membaca file PDF. Pastikan file tidak terkunci password.');
      console.error(err);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const confirmUploadBook = async (e) => {
    e.preventDefault();
    if (!pendingUpload) return;
    const newBook = {
      id: `book-${Date.now()}`,
      title: pendingUpload.title.trim() || 'Tanpa Judul',
      author: pendingUpload.author.trim() || 'Anonim',
      category: pendingUpload.category,
      coverDataUrl: pendingUpload.coverDataUrl,
      totalPages: pendingUpload.totalPages,
      currentPage: 1,
      addedAt: Date.now(),
      lastReadAt: Date.now(),
      readingSeconds: 0,
      sessions: 0,
      rating: 0,
      reviewPoints: ['', '', ''],
      isFavorite: false,
    };
    await saveBook(newBook, pendingUpload.buffer);
    setPendingUpload(null);
    await loadData();
  };

  const handleUpdateBook = async (updated) => {
    await saveBook(updated);
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
    if (activeBook?.id === updated.id) setActiveBook(updated);
  };

  const handleDeleteBook = async (bookId) => {
    if (!window.confirm('Hapus buku ini beserta catatan stabilo dan pembatasnya?')) return;
    await deleteBook(bookId);
    setActiveBook(null);
    await loadData();
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const clean = newCategoryName.trim();
    if (!clean || categories.includes(clean)) return;
    const next = [...categories, clean];
    setCategories(next);
    await saveCategories(next);
    setNewCategoryName('');
    setShowAddCategory(false);
  };

  const totalReadingSeconds = books.reduce((sum, b) => sum + (b.readingSeconds || 0), 0);
  const totalSessions = books.reduce((sum, b) => sum + (b.sessions || 0), 0);
  const ratedBooks = books.filter((b) => b.rating > 0);
  const avgRating =
    ratedBooks.length > 0
      ? (ratedBooks.reduce((s, b) => s + b.rating, 0) / ratedBooks.length).toFixed(1)
      : '—';

  return (
    <div className="min-h-screen paper-grain text-[#2E2721] relative flex flex-col">
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}

      {/* Latar klasik bunga sakura berguguran & burung terbang pelan */}
      <AmbientMotifs subtle={Boolean(readingBook)} />

      {/* Input PDF tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={handleFileChosen}
        className="hidden"
      />

      {/* LAYAR READER FULLSCREEN */}
      {readingBook && (
        <PdfReader
          book={readingBook}
          onBack={async () => {
            setReadingBook(null);
            await loadData();
          }}
          onUpdateBook={handleUpdateBook}
          onOpenReview={() => setReviewingBook(readingBook)}
        />
      )}

      {/* LAYAR DETAIL BUKU (Gaya klasik ala Margin) */}
      {!readingBook && activeBook && (
        <div className="relative z-10 flex-1 pb-24 animate-fade-in">
          <div className="bg-[#DFC070]/70 pt-5 pb-8 px-5 relative border-b border-[#D2BA88]">
            <div className="flex items-center justify-between mb-5">
              <button
                type="button"
                onClick={() => setActiveBook(null)}
                className="p-2 -ml-2 rounded-full bg-[#FAF6EE]/70 text-[#2E2721]"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleUpdateBook({ ...activeBook, isFavorite: !activeBook.isFavorite })
                  }
                  className="p-2 rounded-full bg-[#FAF6EE]/75"
                >
                  <Heart
                    className={`w-4 h-4 ${
                      activeBook.isFavorite ? 'fill-[#C44536] text-[#C44536]' : 'text-[#5E5245]'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBook(activeBook.id)}
                  className="p-2 rounded-full bg-[#FAF6EE]/75 text-[#8A463B]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-36 h-52 rounded-lg overflow-hidden shadow-[0_16px_32px_rgba(46,39,33,0.28)] border border-[#FAF6EE]/80 bg-[#F2E8D5]">
                {activeBook.coverDataUrl ? (
                  <img
                    src={activeBook.coverDataUrl}
                    alt={activeBook.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3 text-center font-serif">
                    {activeBook.title}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setReadingBook(activeBook)}
                className="-mt-5 px-7 py-2.5 rounded-full bg-[#4A3F35] text-[#FAF6EE] font-sans text-xs tracking-[0.18em] uppercase shadow-lg hover:bg-[#3A3129] active:scale-95 transition-all"
              >
                Mulai Membaca
              </button>
            </div>
          </div>

          <div className="max-w-lg mx-auto px-5 pt-6 space-y-6">
            {/* Meta Buku Bergaris Tipis Klasik */}
            <div className="border-y border-[#D8C9B0] divide-y divide-[#E4D8C3] text-sm">
              <div className="py-2.5 flex gap-2">
                <span className="font-serif text-[#8A7A68] w-24 shrink-0">Judul:</span>
                <span className="font-body font-medium">{activeBook.title}</span>
              </div>
              <div className="py-2.5 flex gap-2">
                <span className="font-serif text-[#8A7A68] w-24 shrink-0">Penulis:</span>
                <span className="font-body">{activeBook.author}</span>
              </div>
              <div className="py-2.5 flex gap-2">
                <span className="font-serif text-[#8A7A68] w-24 shrink-0">Kategori:</span>
                <span className="font-sans text-xs px-2.5 py-0.5 rounded-full bg-[#EBE1CE] text-[#5E5245]">
                  {activeBook.category}
                </span>
              </div>
              <div className="py-2.5 flex gap-2">
                <span className="font-serif text-[#8A7A68] w-24 shrink-0">Progres:</span>
                <span className="font-body">
                  Halaman {activeBook.currentPage || 1} dari {activeBook.totalPages || 1} (
                  {Math.round(((activeBook.currentPage || 1) / (activeBook.totalPages || 1)) * 100)}
                  %)
                </span>
              </div>
            </div>

            {/* Kartu Penilaian 1-10 & 3 Poin Ringkas */}
            <div className="rounded-2xl bg-[#FAF6EE]/85 border border-[#DFD2BC] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-sans text-[10px] tracking-[0.2em] uppercase text-[#8A7A68]">
                    Penilaian & Refleksi
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-[#C4973C] fill-[#C4973C]" />
                    <span className="font-serif text-xl font-semibold">
                      {activeBook.rating > 0 ? `${activeBook.rating} / 10` : 'Belum dinilai'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReviewingBook(activeBook)}
                  className="px-3.5 py-1.5 rounded-full border border-[#C4973C] text-[#9A6F1E] font-sans text-xs hover:bg-[#C4973C]/10"
                >
                  {activeBook.rating > 0 ? 'Ubah Penilaian' : 'Beri Penilaian'}
                </button>
              </div>

              {activeBook.reviewPoints?.some((p) => p) && (
                <ul className="space-y-2 pt-2 border-t border-[#E6DAC6]">
                  {activeBook.reviewPoints.map(
                    (pt, idx) =>
                      pt && (
                        <li key={idx} className="font-body text-sm text-[#4A4036] flex gap-2">
                          <span className="font-serif text-[#C4973C] font-semibold">{idx + 1}.</span>
                          <span>{pt}</span>
                        </li>
                      )
                  )}
                </ul>
              )}
            </div>

            {/* Kutipan yang Distabilo */}
            <div>
              <h3 className="font-serif text-2xl tracking-wider uppercase text-[#3A3229] mb-3">
                Kutipan
              </h3>
              {activeBookQuotes.length === 0 ? (
                <p className="font-serif italic text-sm text-[#8A7A68]">
                  Belum ada kalimat yang distabilo. Gunakan mode Blok saat membaca untuk menyimpan
                  kutipan berharga.
                </p>
              ) : (
                <div className="space-y-3">
                  {activeBookQuotes.map((q) => (
                    <div
                      key={q.id}
                      className="pl-3.5 border-l-2 border-[#C4973C] py-1 bg-[#FAF6EE]/60 rounded-r-lg pr-3"
                    >
                      <p className="font-sans text-[10px] text-[#8A7A68] mb-1">Hal. {q.page}</p>
                      <p className="font-body italic text-sm text-[#3A3229] leading-relaxed">
                        “{q.text}”
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LAYAR UTAMA (HOME LIBRARY / QUOTES / STATS) */}
      {!readingBook && !activeBook && (
        <div className="relative z-10 flex-1 pb-28 max-w-lg w-full mx-auto px-5 pt-6 animate-fade-in">
          {/* Header Personalisasi */}
          <header className="flex items-center justify-between mb-5">
            <div>
              <p className="font-sans text-[10px] tracking-[0.26em] uppercase text-[#8A7A68]">
                Selamat membaca, Rafiqatul Ulya
              </p>
              <h1 className="font-serif text-3xl font-semibold tracking-wide text-[#2E2721]">
                Le Bibliothèque
              </h1>
            </div>
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#4A3F35] text-[#FAF6EE] font-sans text-xs font-medium shadow-md active:scale-95 transition-transform"
            >
              <Plus className="w-4 h-4 text-[#E4C275]" />
              {uploading ? 'Memuat...' : 'Unggah PDF'}
            </button>
          </header>

          {tab === 'library' && (
            <div className="space-y-6 animate-fade-in">
              {/* Bilah Pencarian Judul Buku */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#8A7A68] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari judul buku atau penulis..."
                  className="w-full pl-11 pr-4 py-3 rounded-2xl bg-[#FAF6EE]/90 border border-[#DFD2BC] font-sans text-sm text-[#2E2721] placeholder:text-[#A69888] focus:outline-none focus:border-[#C4973C] shadow-sm transition-colors"
                />
              </div>

              {/* Kartu Lanjutkan Membaca */}
              {continueReadingBook && !searchQuery && (
                <div
                  onClick={() => setReadingBook(continueReadingBook)}
                  className="cursor-pointer rounded-2xl bg-gradient-to-br from-[#EFE3CC] via-[#F7EFE0] to-[#E9D9BB] border border-[#D8C6A5] p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-16 h-24 rounded-md overflow-hidden shadow-md shrink-0 bg-[#E6D8BE]">
                    {continueReadingBook.coverDataUrl && (
                      <img
                        src={continueReadingBook.coverDataUrl}
                        alt={continueReadingBook.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="inline-flex items-center gap-1 font-sans text-[10px] tracking-[0.18em] uppercase text-[#9A6F1E]">
                      <Sparkles className="w-3 h-3" /> Lanjutkan Membaca
                    </span>
                    <h2 className="font-serif text-xl font-semibold truncate mt-0.5">
                      {continueReadingBook.title}
                    </h2>
                    <p className="font-sans text-xs text-[#786B5D] truncate">
                      {continueReadingBook.author}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[#D8C9B0] overflow-hidden">
                        <div
                          className="h-full bg-[#C4973C] rounded-full"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                ((continueReadingBook.currentPage || 1) /
                                  (continueReadingBook.totalPages || 1)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="font-sans text-[10px] text-[#786B5D]">
                        Hal. {continueReadingBook.currentPage}/{continueReadingBook.totalPages}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rak Kategori Horizontal */}
              <div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {['Semua', ...categories].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3.5 py-1.5 rounded-full font-sans text-xs whitespace-nowrap transition-all ${
                        selectedCategory === cat
                          ? 'bg-[#4A3F35] text-[#FAF6EE] shadow-sm'
                          : 'bg-[#FAF6EE]/80 text-[#6B5E50] border border-[#E2D5BE]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setShowAddCategory(true)}
                    className="px-3 py-1.5 rounded-full font-sans text-xs whitespace-nowrap border border-dashed border-[#BFA988] text-[#786B5D] flex items-center gap-1"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                    Baru
                  </button>
                </div>
              </div>

              {/* Rak Buku Koleksi PDF */}
              {filteredBooks.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#CBBBA0] bg-[#FAF6EE]/65 p-10 text-center space-y-3">
                  <Upload className="w-8 h-8 mx-auto text-[#B09B7C]" />
                  <p className="font-serif text-xl text-[#4A4036]">
                    {books.length === 0
                      ? 'Rak bukumu masih menanti kisah pertama'
                      : 'Tidak ada judul buku yang cocok'}
                  </p>
                  <p className="font-sans text-xs text-[#8A7A68]">
                    Unggah e-book PDF favoritmu untuk merasakan sensasi balik kertas klasik.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {filteredBooks.map((b) => {
                    const pct = Math.round(((b.currentPage || 1) / (b.totalPages || 1)) * 100);
                    return (
                      <div
                        key={b.id}
                        onClick={() => setActiveBook(b)}
                        className="cursor-pointer group rounded-2xl bg-[#FAF6EE]/90 border border-[#E4D7C0] p-3 flex flex-col shadow-sm hover:shadow-md transition-all"
                      >
                        <div className="relative aspect-[3/4.2] w-full rounded-lg overflow-hidden bg-[#EAE0CE] shadow-inner mb-2.5">
                          {b.coverDataUrl ? (
                            <img
                              src={b.coverDataUrl}
                              alt={b.title}
                              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-3 text-center font-serif text-sm text-[#5E5245]">
                              {b.title}
                            </div>
                          )}
                          {b.rating > 0 && (
                            <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#2E2721]/80 text-[#F2D28B] font-sans text-[10px] flex items-center gap-0.5">
                              <Star className="w-2.5 h-2.5 fill-current" />
                              {b.rating}
                            </span>
                          )}
                        </div>
                        <h3 className="font-serif text-base font-semibold leading-tight line-clamp-2">
                          {b.title}
                        </h3>
                        <p className="font-sans text-[11px] text-[#8A7A68] truncate mt-0.5">
                          {b.author}
                        </p>
                        <div className="mt-auto pt-2.5 flex items-center justify-between text-[10px] font-sans text-[#9A8B7A]">
                          <span>{b.category}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="w-full h-1 bg-[#E7DAC3] rounded-full mt-1 overflow-hidden">
                          <div
                            className="h-full bg-[#C4973C] rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB KUTIPAN BERHARGA */}
          {tab === 'quotes' && (
            <div className="space-y-4 animate-fade-in">
              <div className="border-b border-[#D8C9B0] pb-2">
                <h2 className="font-serif text-2xl">Brankas Kutipan</h2>
                <p className="font-sans text-xs text-[#8A7A68]">
                  Semua kalimat berharga yang kamu stabilo tersimpan rapi di sini.
                </p>
              </div>
              {allQuotes.length === 0 ? (
                <p className="font-serif italic text-center text-[#8A7A68] py-14">
                  Belum ada kutipan yang tersimpan.
                </p>
              ) : (
                allQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-[#FAF6EE]/90 border border-[#E2D5BE] p-4 space-y-2 shadow-sm"
                  >
                    <p className="font-body italic text-sm leading-relaxed text-[#2E2721]">
                      “{q.text}”
                    </p>
                    <div className="flex items-center justify-between text-[11px] font-sans text-[#8A7A68] pt-1 border-t border-[#EFE5D4]">
                      <span className="truncate max-w-[70%] font-medium text-[#5E5245]">
                        {q.bookTitle}
                      </span>
                      <span>Hal. {q.page}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB STATISTIK BACA */}
          {tab === 'stats' && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-[#D8C9B0] pb-2">
                <h2 className="font-serif text-2xl">Jejak Membaca Rafiqatul Ulya</h2>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="rounded-2xl bg-[#FAF6EE]/90 border border-[#E2D5BE] p-4">
                  <Clock className="w-4 h-4 text-[#C4973C] mb-1.5" />
                  <p className="font-sans text-[11px] text-[#8A7A68]">Waktu Membaca</p>
                  <p className="font-serif text-3xl font-semibold mt-0.5">
                    {formatDuration(totalReadingSeconds)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[#FAF6EE]/90 border border-[#E2D5BE] p-4">
                  <BookOpen className="w-4 h-4 text-[#C4973C] mb-1.5" />
                  <p className="font-sans text-[11px] text-[#8A7A68]">Total Sesi</p>
                  <p className="font-serif text-3xl font-semibold mt-0.5">{totalSessions}</p>
                </div>
                <div className="rounded-2xl bg-[#FAF6EE]/90 border border-[#E2D5BE] p-4">
                  <Quote className="w-4 h-4 text-[#C4973C] mb-1.5" />
                  <p className="font-sans text-[11px] text-[#8A7A68]">Kutipan Disimpan</p>
                  <p className="font-serif text-3xl font-semibold mt-0.5">{allQuotes.length}</p>
                </div>
                <div className="rounded-2xl bg-[#FAF6EE]/90 border border-[#E2D5BE] p-4">
                  <Star className="w-4 h-4 text-[#C4973C] mb-1.5" />
                  <p className="font-sans text-[11px] text-[#8A7A68]">Rata-rata Rating</p>
                  <p className="font-serif text-3xl font-semibold mt-0.5">{avgRating}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NAVIGASI BAWAH */}
      {!readingBook && !activeBook && (
        <nav className="fixed bottom-0 inset-x-0 z-30 bg-[#FAF6EE]/95 backdrop-blur-md border-t border-[#DFD2BC] px-6 py-2.5">
          <div className="max-w-lg mx-auto flex items-center justify-around">
            {[
              { id: 'library', label: 'Pustaka', icon: BookOpen },
              { id: 'quotes', label: 'Kutipan', icon: Quote },
              { id: 'stats', label: 'Statistik', icon: BarChart3 },
            ].map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-5 py-1 rounded-xl transition-all ${
                    active ? 'text-[#2E2721]' : 'text-[#A29382]'
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? 'text-[#A47A28]' : ''}`} />
                  <span className="font-sans text-[10px] tracking-wider uppercase font-medium">
                    {item.label}
                  </span>
                  {active && <span className="w-5 h-0.5 rounded-full bg-[#C4973C] mt-0.5" />}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      {/* MODAL SIMPAN DETAIL UPLOAD PDF */}
      {pendingUpload && (
        <div className="fixed inset-0 z-50 bg-[#2E2721]/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={confirmUploadBook}
            className="w-full max-w-md rounded-2xl paper-grain border border-[#D8C9B0] p-6 space-y-4 shadow-2xl"
          >
            <h3 className="font-serif text-2xl font-semibold">Simpan ke Rak Buku</h3>
            <div className="flex gap-4 items-center">
              {pendingUpload.coverDataUrl && (
                <img
                  src={pendingUpload.coverDataUrl}
                  alt="Cover"
                  className="w-16 h-24 rounded-md object-cover shadow"
                />
              )}
              <p className="font-sans text-xs text-[#786B5D]">
                Cover halaman pertama otomatis diekstrak ({pendingUpload.totalPages} halaman).
              </p>
            </div>
            <div>
              <label className="font-sans text-xs text-[#6B5E50]">Judul Buku</label>
              <input
                type="text"
                required
                value={pendingUpload.title}
                onChange={(e) => setPendingUpload({ ...pendingUpload, title: e.target.value })}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD0B8] text-sm"
              />
            </div>
            <div>
              <label className="font-sans text-xs text-[#6B5E50]">Penulis</label>
              <input
                type="text"
                value={pendingUpload.author}
                onChange={(e) => setPendingUpload({ ...pendingUpload, author: e.target.value })}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD0B8] text-sm"
              />
            </div>
            <div>
              <label className="font-sans text-xs text-[#6B5E50]">Kategori Rak</label>
              <select
                value={pendingUpload.category}
                onChange={(e) => setPendingUpload({ ...pendingUpload, category: e.target.value })}
                className="w-full mt-1 px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD0B8] text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPendingUpload(null)}
                className="px-4 py-2 rounded-xl text-xs font-sans text-[#786B5D]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#4A3F35] text-[#FAF6EE] text-xs font-sans font-medium"
              >
                Simpan Buku
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL TAMBAH KATEGORI BARU */}
      {showAddCategory && (
        <div className="fixed inset-0 z-50 bg-[#2E2721]/45 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleAddCategory}
            className="w-full max-w-sm rounded-2xl paper-grain border border-[#D8C9B0] p-5 space-y-4"
          >
            <h3 className="font-serif text-xl font-semibold">Buat Kategori Rak Baru</h3>
            <input
              type="text"
              autoFocus
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Contoh: Novel Jepang, Puisi..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#FAF6EE] border border-[#DDD0B8] text-sm"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCategory(false)}
                className="px-4 py-2 text-xs font-sans text-[#786B5D]"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#4A3F35] text-[#FAF6EE] text-xs font-sans"
              >
                Tambah
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL PENILAIAN AKHIR BUKU (1-10 + 3 POIN) */}
      {reviewingBook && (
        <BookReviewModal
          book={reviewingBook}
          onClose={() => setReviewingBook(null)}
          onSave={async (reviewData) => {
            await handleUpdateBook({ ...reviewingBook, ...reviewData });
            setReviewingBook(null);
          }}
        />
      )}
    </div>
  );
}
