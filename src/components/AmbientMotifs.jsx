import React from 'react';

const PETALS = [
  { id: 1, right: '4%', delay: '0s', duration: '15s', size: 13 },
  { id: 2, right: '11%', delay: '3.5s', duration: '18s', size: 10 },
  { id: 3, right: '18%', delay: '7s', duration: '16s', size: 12 },
  { id: 4, left: '6%', delay: '2s', duration: '19s', size: 11 },
  { id: 5, left: '14%', delay: '9.5s', duration: '17s', size: 9 },
  { id: 6, right: '8%', delay: '11.5s', duration: '20s', size: 11 },
];

export default function AmbientMotifs({ subtle = false }) {
  return (
    <div
      className={`pointer-events-none fixed inset-0 overflow-hidden z-0 transition-opacity duration-700 ${
        subtle ? 'opacity-40' : 'opacity-80'
      }`}
      aria-hidden="true"
    >
      {/* Ranting sakura lembut di sudut kanan atas */}
      <svg
        className="absolute -top-2 -right-3 w-44 h-44 text-[#B67B7B]/25"
        viewBox="0 0 200 200"
        fill="none"
      >
        <path
          d="M210 15 C165 32, 130 58, 92 98 M152 46 C140 24, 122 18, 108 16 M124 68 C116 86, 114 106, 120 120"
          stroke="#6E5A4B"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.45"
        />
        {[
          [148, 44],
          [125, 65],
          [104, 86],
          [116, 22],
          [168, 30],
          [118, 112],
        ].map(([cx, cy], idx) => (
          <g key={idx} transform={`translate(${cx} ${cy})`}>
            <circle cx="0" cy="-4" r="4" fill="#D99B9E" opacity="0.55" />
            <circle cx="4" cy="0" r="4" fill="#E3B1B4" opacity="0.55" />
            <circle cx="0" cy="4" r="4" fill="#D99B9E" opacity="0.55" />
            <circle cx="-4" cy="0" r="4" fill="#E3B1B4" opacity="0.55" />
            <circle cx="0" cy="0" r="1.8" fill="#C4973C" opacity="0.6" />
          </g>
        ))}
      </svg>

      {/* Burung klasik tinta melayang pelan di bagian atas */}
      <div className="bird-glide absolute top-14 left-0 flex items-center gap-6">
        <svg className="w-8 h-5 text-[#4A4036]/45 bird-wing" viewBox="0 0 40 20" fill="none">
          <path
            d="M2 12 C10 3, 17 5, 20 11 C23 5, 30 3, 38 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <svg
          className="w-6 h-4 text-[#4A4036]/35 bird-wing mt-3"
          style={{ animationDelay: '0.7s' }}
          viewBox="0 0 40 20"
          fill="none"
        >
          <path
            d="M2 12 C10 3, 17 5, 20 11 C23 5, 30 3, 38 12"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Kelopak sakura berguguran perlahan */}
      {PETALS.map((petal) => (
        <svg
          key={petal.id}
          className="sakura-petal absolute -top-6"
          style={{
            right: petal.right,
            left: petal.left,
            width: `${petal.size}px`,
            height: `${petal.size}px`,
            animationDelay: petal.delay,
            animationDuration: petal.duration,
          }}
          viewBox="0 0 24 24"
          fill="none"
        >
          <path
            d="M12 2C15 6 19 9 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 9 9 6 12 2Z"
            fill="#DCA3A8"
            opacity="0.7"
          />
        </svg>
      ))}
    </div>
  );
}
