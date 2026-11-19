import React from 'react';

const customBookmarkModules = import.meta.glob(
  '/assets/bookmarks/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}',
  { eager: true, import: 'default' }
);

const CUSTOM_BOOKMARKS = Object.entries(customBookmarkModules)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, url], idx) => ({
    id: `custom-bm-${idx}`,
    name: path.split('/').pop().replace(/\.[^/.]+$/, ''),
    imageUrl: url,
  }));

export const BUILTIN_BOOKMARKS = [
  {
    id: 'sakura-fuji',
    name: 'Sakura & Fuji',
    bg: 'linear-gradient(180deg, #F4EBDC 0%, #EBD9C3 100%)',
    textColor: '#3C322A',
    accent: '#C44536',
    kanji: '桜の季節',
    motif: 'fuji',
  },
  {
    id: 'pagoda-malam',
    name: 'Pagoda Malam',
    bg: 'linear-gradient(180deg, #1E2E3B 0%, #15212C 100%)',
    textColor: '#E7DFCE',
    accent: '#D7AE54',
    kanji: '心を落ち着けて',
    motif: 'pagoda',
  },
  {
    id: 'lonceng-angin',
    name: 'Lonceng Angin',
    bg: 'linear-gradient(180deg, #F5EFE2 0%, #E7DFCE 100%)',
    textColor: '#324854',
    accent: '#5A7D95',
    kanji: '風鈴',
    motif: 'furin',
  },
  {
    id: 'jembatan-sakura',
    name: 'Jembatan Sakura',
    bg: 'linear-gradient(180deg, #F5E8E2 0%, #E2CBBF 100%)',
    textColor: '#4A362E',
    accent: '#C46C6E',
    kanji: '美しい瞬間',
    motif: 'bridge',
  },
  {
    id: 'bambu-tenang',
    name: 'Rumpun Bambu',
    bg: 'linear-gradient(180deg, #F2EFE4 0%, #DFE3D3 100%)',
    textColor: '#344234',
    accent: '#637A5A',
    kanji: '平常心',
    motif: 'bamboo',
  },
  {
    id: 'lentera-harapan',
    name: 'Lentera Harapan',
    bg: 'linear-gradient(180deg, #2D2622 0%, #1D1815 100%)',
    textColor: '#F2E5CE',
    accent: '#C94B38',
    kanji: '希望',
    motif: 'lantern',
  },
  {
    id: 'ikan-koi',
    name: 'Ikan Koi',
    bg: 'linear-gradient(180deg, #F4EFE4 0%, #DCE6E6 100%)',
    textColor: '#2E3D42',
    accent: '#C85334',
    kanji: '夢を信じて',
    motif: 'koi',
  },
  {
    id: 'torii-senja',
    name: 'Torii Senja',
    bg: 'linear-gradient(180deg, #2B2433 0%, #8A4A38 55%, #3B2828 100%)',
    textColor: '#F7E7CE',
    accent: '#E29D52',
    kanji: '未来は明るい',
    motif: 'torii',
  },
  {
    id: 'bangau-bebas',
    name: 'Bangau Bebas',
    bg: 'linear-gradient(180deg, #F4ECE0 0%, #E8DCC7 100%)',
    textColor: '#3A3229',
    accent: '#C44536',
    kanji: '自由に生きる',
    motif: 'crane',
  },
  {
    id: 'taman-malam',
    name: 'Taman Malam',
    bg: 'linear-gradient(180deg, #162632 0%, #1D353A 100%)',
    textColor: '#E8E2D2',
    accent: '#D4A553',
    kanji: '静けさの中に力',
    motif: 'garden',
  },
];

export const ALL_BOOKMARKS = [...CUSTOM_BOOKMARKS, ...BUILTIN_BOOKMARKS];

export function getBookmarkStyle(styleId) {
  return ALL_BOOKMARKS.find((b) => b.id === styleId) || BUILTIN_BOOKMARKS[0];
}

function MotifArt({ motif, accent }) {
  switch (motif) {
    case 'fuji':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <circle cx="24" cy="24" r="10" fill={accent} opacity="0.85" />
          <path d="M2 74 L26 36 L58 74 Z" fill="#637079" opacity="0.7" />
          <path d="M18 48 L26 36 L34 48 L29 45 L26 49 L22 45 Z" fill="#FAF6EE" />
          <circle cx="14" cy="64" r="4" fill="#DCA0A4" />
          <circle cx="22" cy="70" r="3.5" fill="#E6B6B9" />
          <circle cx="42" cy="60" r="3.5" fill="#DCA0A4" />
        </svg>
      );
    case 'pagoda':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <path d="M40 16 A8 8 0 1 0 46 28 A6 6 0 1 1 40 16 Z" fill={accent} />
          <path d="M12 78 L48 78 L44 68 L16 68 Z" fill="#0F1820" />
          <path d="M15 64 L45 64 L40 55 L20 55 Z" fill="#0F1820" />
          <path d="M19 51 L41 51 L30 40 Z" fill="#0F1820" />
          <rect x="27" y="69" width="6" height="5" fill={accent} opacity="0.85" />
          <rect x="28" y="57" width="4" height="4" fill={accent} opacity="0.75" />
        </svg>
      );
    case 'furin':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <line x1="30" y1="6" x2="30" y2="20" stroke="#5A7D95" strokeWidth="1.5" />
          <circle cx="30" cy="30" r="12" fill="#FFFFFF" fillOpacity="0.65" stroke="#5A7D95" />
          <rect x="24" y="44" width="12" height="32" rx="1" fill="#7D9FB3" opacity="0.85" />
          <path d="M24 68 Q30 63 36 68" stroke="#FAF6EE" fill="none" strokeWidth="1.5" />
        </svg>
      );
    case 'koi':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <circle cx="18" cy="72" r="7" fill="#89A396" opacity="0.55" />
          <circle cx="44" cy="62" r="5" fill="#89A396" opacity="0.45" />
          <path
            d="M22 30 C35 38, 42 54, 34 72 C24 60, 18 46, 22 30 Z"
            fill={accent}
            opacity="0.85"
          />
          <circle cx="28" cy="45" r="3" fill="#FAF6EE" opacity="0.85" />
          <circle cx="32" cy="57" r="2.5" fill="#FAF6EE" opacity="0.85" />
        </svg>
      );
    case 'torii':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <circle cx="30" cy="42" r="11" fill={accent} opacity="0.7" />
          <rect x="10" y="44" width="40" height="4" rx="1" fill="#231618" />
          <rect x="14" y="52" width="32" height="3" fill="#231618" />
          <rect x="18" y="46" width="4" height="32" fill="#231618" />
          <rect x="38" y="46" width="4" height="32" fill="#231618" />
        </svg>
      );
    case 'bamboo':
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <line x1="38" y1="8" x2="40" y2="85" stroke={accent} strokeWidth="3.5" />
          <line x1="48" y1="18" x2="46" y2="85" stroke={accent} strokeWidth="2.2" opacity="0.7" />
          <path d="M38 30 Q24 24 18 32 Q28 34 38 30 Z" fill={accent} opacity="0.85" />
          <path d="M39 50 Q22 46 16 55 Q29 56 39 50 Z" fill={accent} opacity="0.75" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 60 90" className="w-full h-full">
          <circle cx="30" cy="34" r="11" fill={accent} opacity="0.75" />
          <path
            d="M12 58 Q24 46 32 56 Q40 46 50 58"
            stroke="#FAF6EE"
            strokeWidth="2.2"
            fill="none"
            opacity="0.8"
          />
          <circle cx="20" cy="70" r="3" fill={accent} opacity="0.6" />
          <circle cx="40" cy="74" r="4" fill={accent} opacity="0.5" />
        </svg>
      );
  }
}

export default function BookmarkRibbon({ styleId, size = 'md', onClick }) {
  const style = getBookmarkStyle(styleId);
  const dims =
    size === 'sm'
      ? 'w-12 h-32 rounded-b-lg'
      : size === 'picker'
      ? 'w-16 h-44 rounded-lg'
      : 'w-14 h-40 rounded-b-xl';

  if (style.imageUrl) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`relative ${dims} overflow-hidden shadow-[0_8px_18px_rgba(46,39,33,0.28)] border border-[#FAF6EE]/60 transition-transform active:scale-95`}
      >
        <img src={style.imageUrl} alt={style.name} className="w-full h-full object-cover" />
        <span className="absolute top-2 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[#F5EFE4] shadow-inner" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ background: style.bg, color: style.textColor }}
      className={`relative ${dims} overflow-hidden shadow-[0_8px_18px_rgba(46,39,33,0.25)] border border-[#D8C9B0]/60 flex flex-col items-center justify-between py-2 px-1 transition-transform active:scale-95`}
    >
      {/* Lubang pita pembatas buku */}
      <span className="w-2.5 h-2.5 rounded-full bg-[#F5EFE4]/90 border border-black/15 shrink-0 z-10" />

      {/* Kaligrafi vertikal */}
      <span
        className="font-serif text-[10px] tracking-[0.22em] opacity-90 z-10 my-1"
        style={{ writingMode: 'vertical-rl' }}
      >
        {style.kanji}
      </span>

      {/* Ilustrasi cat air */}
      <div className="absolute inset-x-0 bottom-0 h-[62%] opacity-90 pointer-events-none">
        <MotifArt motif={style.motif} accent={style.accent} />
      </div>

      {/* Cap stempel merah klasik */}
      <span className="relative z-10 text-[7px] font-serif px-1 py-0.5 border border-[#B23A32] text-[#B23A32] bg-[#FAF6EE]/70 rounded-[2px] leading-none">
        栞
      </span>
    </button>
  );
}
