import React, { useEffect, useMemo, useState } from 'react';

// Otomatis memuat SEMUA gambar yang ada di folder assets/splash/
const splashModules = import.meta.glob(
  '/assets/splash/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  { eager: true, import: 'default' }
);

// Poster klasik bawaan jika folder assets/splash/ masih kosong
const FALLBACK_POSTERS = [
  {
    id: 'botanical',
    bg: 'from-[#F4ECE0] via-[#EFE3CE] to-[#E5D3B3]',
    accent: '#7A8C64',
    title: 'LE BIBLIOTHÈQUE',
    subtitle: 'Musim Semi & Halaman yang Tenang',
    quote: '“Books are a uniquely portable magic.”',
    author: 'Stephen King',
    kanji: '静寂の書斎',
  },
  {
    id: 'heritage',
    bg: 'from-[#EFE7DA] via-[#E3D5BD] to-[#D4C3A3]',
    accent: '#9E4B3A',
    title: 'LE BIBLIOTHÈQUE',
    subtitle: 'Arsip Kisah & Catatan Berharga',
    quote: '“A room without books is like a body without a soul.”',
    author: 'Cicero',
    kanji: '物語の旅',
  },
  {
    id: 'editorial',
    bg: 'from-[#F6F0E4] via-[#EAE0CC] to-[#DED1B7]',
    accent: '#4A6473',
    title: 'LE BIBLIOTHÈQUE',
    subtitle: 'Ruang Baca Pribadi',
    quote: '“Reading is dreaming with open eyes.”',
    author: 'Anissa Trisdianty',
    kanji: '心の余白',
  },
  {
    id: 'twilight',
    bg: 'from-[#2A2624] via-[#3A312C] to-[#231F1D]',
    accent: '#D7AE54',
    dark: true,
    title: 'LE BIBLIOTHÈQUE',
    subtitle: 'Senja, Kertas, dan Imajinasi',
    quote: '“So many books, so little time.”',
    author: 'Frank Zappa',
    kanji: '夜の読書',
  },
];

export default function SplashScreen({ onDone }) {
  const customImages = useMemo(
    () =>
      Object.entries(splashModules)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([path, url], idx) => ({
          id: `custom-${idx}`,
          src: url,
          name: path.split('/').pop(),
        })),
    []
  );

  const items = customImages.length > 0 ? customImages : FALLBACK_POSTERS;

  // Rotasi berurutan setiap aplikasi dibuka agar semua poster kebagian tampil
  const [activeIndex, setActiveIndex] = useState(() => {
    const saved = Number(localStorage.getItem('lb_splash_index') || '0');
    const nextIdx = saved % items.length;
    localStorage.setItem('lb_splash_index', String((nextIdx + 1) % items.length));
    return nextIdx;
  });

  const [exiting, setExiting] = useState(false);

  const handleClose = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      onDone();
    }, 680);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      handleClose();
    }, 3900);
    return () => clearTimeout(timer);
  }, []);

  const current = items[activeIndex];
  const isImagePoster = Boolean(current?.src);

  return (
    <div
      onClick={handleClose}
      className={`fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#F5EFE4] cursor-pointer ${
        exiting ? 'animate-fade-out' : 'animate-fade-in'
      }`}
    >
      {/* Filter SVG halus untuk efek watery/riak air organik yang bergerak pelan */}
      <svg className="hidden" aria-hidden="true">
        <defs>
          <filter id="watery-poster-filter">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.008 0.014"
              numOctaves="2"
              result="noise"
            >
              <animate
                attributeName="baseFrequency"
                values="0.007 0.012;0.011 0.018;0.007 0.012"
                dur="9s"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="5" />
          </filter>
        </defs>
      </svg>

      {isImagePoster ? (
        <div className="relative w-full h-full flex items-center justify-center bg-[#EFE6D5]">
          {/* Latar blur lembut agar poster rasio apa pun tetap penuh & elegan */}
          <img
            src={current.src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-35"
          />

          {/* Poster utama dengan gerak watery float pelan */}
          <div className="relative z-10 w-[88%] max-w-[390px] h-[78%] rounded-2xl overflow-hidden shadow-[0_22px_60px_rgba(46,39,33,0.22)] border border-[#FAF6EE]/70 animate-watery-float">
            <img
              src={current.src}
              alt="Le Bibliothèque Poster"
              className="w-full h-full object-cover"
              style={{ filter: 'url(#watery-poster-filter)' }}
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#241E18]/80 via-[#241E18]/35 to-transparent p-6 text-[#FAF6EE]">
              <p className="font-sans text-[10px] tracking-[0.28em] uppercase opacity-80">
                Koleksi Pribadi • Rafiqatul Ulya
              </p>
              <h1 className="font-serif text-3xl tracking-wide mt-1">Le Bibliothèque</h1>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`relative w-full h-full flex items-center justify-center bg-gradient-to-b ${current.bg} p-7`}
        >
          <div
            className={`relative w-full max-w-[360px] h-[78%] rounded-2xl border p-8 flex flex-col justify-between shadow-[0_20px_55px_rgba(46,39,33,0.14)] animate-watery-float ${
              current.dark
                ? 'border-[#D7AE54]/30 bg-[#2C2622]/80 text-[#F5EFE4]'
                : 'border-[#C4973C]/30 bg-[#FAF6EE]/85 text-[#2E2721]'
            }`}
            style={{ filter: 'url(#watery-poster-filter)' }}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-sans text-[10px] tracking-[0.26em] uppercase opacity-65">
                  Perpustakaan Pribadi
                </p>
                <p className="font-serif italic text-base mt-0.5 text-[#C4973C]">
                  Rafiqatul Ulya
                </p>
              </div>
              <span
                className="font-serif text-sm tracking-[0.35em] px-2 py-1 border rounded-sm opacity-75"
                style={{ writingMode: 'vertical-rl', borderColor: current.accent }}
              >
                {current.kanji}
              </span>
            </div>

            <div className="my-auto text-center space-y-5">
              <div
                className="w-24 h-24 mx-auto rounded-full border flex items-center justify-center"
                style={{ borderColor: `${current.accent}66` }}
              >
                <svg className="w-12 h-12" viewBox="0 0 64 64" fill="none">
                  <path
                    d="M12 18 C20 14, 28 16, 32 20 C36 16, 44 14, 52 18 V48 C44 44, 36 46, 32 50 C28 46, 20 44, 12 48 Z"
                    stroke={current.accent}
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                  <path d="M32 20 V50" stroke={current.accent} strokeWidth="1.6" />
                </svg>
              </div>

              <div>
                <h1 className="font-serif text-3xl tracking-[0.08em] font-semibold">
                  {current.title}
                </h1>
                <p className="font-sans text-[11px] tracking-[0.18em] uppercase opacity-60 mt-1.5">
                  {current.subtitle}
                </p>
              </div>

              <div className="pt-3">
                <p className="font-serif italic text-lg leading-relaxed opacity-90">
                  {current.quote}
                </p>
                <p className="font-sans text-xs opacity-60 mt-2">— {current.author}</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] font-sans opacity-60 pt-3 border-t border-current/15">
              <span>Sentuh untuk masuk</span>
              <span>
                {activeIndex + 1} / {items.length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Indikator kecil ganti poster manual jika ingin melihat poster lain */}
      {items.length > 1 && (
        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2E2721]/25 backdrop-blur-sm"
          onClick={(e) => {
            e.stopPropagation();
            setActiveIndex((prev) => (prev + 1) % items.length);
          }}
        >
          {items.map((item, idx) => (
            <span
              key={item.id}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx === activeIndex ? 'w-5 bg-[#FAF6EE]' : 'w-1.5 bg-[#FAF6EE]/45'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
