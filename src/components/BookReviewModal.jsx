import React, { useState } from 'react';
import { Star, X, Feather, Check } from 'lucide-react';

const POINT_LABELS = [
  '1. Momen atau gagasan paling berkesan',
  '2. Pelajaran atau kutipan inti yang ingin diingat',
  '3. Rasa yang tertinggal setelah menutup buku',
];

const MAX_CHARS = 140;

export default function BookReviewModal({ book, onSave, onClose }) {
  const [rating, setRating] = useState(book.rating || 0);
  const [points, setPoints] = useState(
    Array.isArray(book.reviewPoints) && book.reviewPoints.length === 3
      ? [...book.reviewPoints]
      : ['', '', '']
  );

  const handlePointChange = (idx, val) => {
    if (val.length > MAX_CHARS) return;
    const next = [...points];
    next[idx] = val;
    setPoints(next);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      rating,
      reviewPoints: points.map((p) => p.trim()),
      reviewUpdatedAt: Date.now(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2E2721]/45 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl paper-grain border border-[#D8C9B0] shadow-[0_24px_60px_rgba(46,39,33,0.3)] p-6">
        <div className="flex items-start justify-between border-b border-[#D8C9B0]/70 pb-4">
          <div>
            <p className="font-sans text-[10px] tracking-[0.22em] uppercase text-[#8A7A68]">
              Kartu Penilaian Akhir Buku
            </p>
            <h2 className="font-serif text-2xl font-semibold text-[#2E2721] mt-0.5 leading-snug">
              {book.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-[#786B5D] hover:bg-[#E7DAC3]/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Penilaian Bintang 1-10 */}
          <div className="bg-[#FAF6EE]/80 rounded-xl border border-[#E2D5BE] p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="font-serif text-base text-[#4A4036]">
                Penilaian Keseluruhan
              </span>
              <span className="font-serif text-xl font-semibold text-[#A47A28]">
                {rating > 0 ? `${rating} / 10` : '— / 10'}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const active = num <= rating;
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setRating(num)}
                    className={`flex flex-col items-center justify-center py-2 rounded-lg border transition-all duration-300 ${
                      active
                        ? 'bg-[#EFE2C2] border-[#C4973C] text-[#9A6F1E] scale-[1.03]'
                        : 'bg-[#F5EFE4]/60 border-[#E2D5BE] text-[#A69888] hover:border-[#C4973C]/50'
                    }`}
                  >
                    <Star
                      className={`w-4 h-4 ${active ? 'fill-[#C4973C] text-[#C4973C]' : ''}`}
                    />
                    <span className="font-sans text-[10px] mt-1 font-medium">{num}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3 Poin Ringkas Terbatas */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-[#5E5245]">
              <Feather className="w-4 h-4 text-[#C4973C]" />
              <h3 className="font-serif text-lg">Tiga Poin Ringkas</h3>
            </div>

            {POINT_LABELS.map((label, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-body text-[#4A4036]">{label}</label>
                  <span className="font-sans text-[10px] text-[#9A8C7C]">
                    {points[idx].length}/{MAX_CHARS}
                  </span>
                </div>
                <textarea
                  rows={2}
                  value={points[idx]}
                  onChange={(e) => handlePointChange(idx, e.target.value)}
                  placeholder="Tulis catatan singkat yang hangat..."
                  className="w-full rounded-xl bg-[#FAF6EE]/90 border border-[#DDD0B8] px-3.5 py-2.5 text-sm font-body text-[#2E2721] placeholder:text-[#B2A493] focus:outline-none focus:border-[#C4973C] resize-none transition-colors"
                />
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#4A3F35] hover:bg-[#3A3129] text-[#FAF6EE] font-sans text-sm font-medium tracking-wide flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
          >
            <Check className="w-4 h-4 text-[#E4C275]" />
            Simpan Penilaian Buku
          </button>
        </form>
      </div>
    </div>
  );
}
