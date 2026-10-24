/**
 * Leaderboard Modal Component.
 * Displays top 10 best runs from localStorage with rank badges and clear stats.
 */

import React, { useState, useEffect } from 'react';
import { Trophy, Coins, Compass, X, Trash2 } from 'lucide-react';
import { getLeaderboard, clearLeaderboard, LeaderboardEntry } from '../game/leaderboard';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  highlightRunId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  highlightRunId,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (isOpen) {
      setEntries(getLeaderboard());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClear = () => {
    if (window.confirm('Liderlik tablosundaki tüm skorları silmek istediğinize emin misiniz?')) {
      clearLeaderboard();
      setEntries([]);
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <span className="text-xl">🥇</span>;
      case 1:
        return <span className="text-xl">🥈</span>;
      case 2:
        return <span className="text-xl">🥉</span>;
      default:
        return (
          <span className="w-6 h-6 rounded-full bg-white/10 text-white/80 font-mono text-xs flex items-center justify-center font-bold">
            {index + 1}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 pointer-events-auto">
      <div className="bg-[#0b1728] border-2 border-[#204975] rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c3f66] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide uppercase">
                LİDERLİK TABLOSU
              </h3>
              <p className="text-[#84b8e8] text-xs font-medium">
                En yüksek 10 sahil yarışı rekoru
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Kapat"
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-[220px]">
          {entries.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-white/50 space-y-2">
              <Trophy className="w-12 h-12 text-white/20" />
              <p className="text-sm">Henüz kaydedilmiş bir yarış skoru yok.</p>
              <p className="text-xs text-white/40">Yarışa başla ve ilk rekorunu kır!</p>
            </div>
          ) : (
            entries.map((entry, idx) => {
              const isCurrent = highlightRunId === entry.id;

              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-2xl flex items-center justify-between border transition-all ${
                    isCurrent
                      ? 'bg-amber-500/15 border-amber-400/80 shadow-lg shadow-amber-500/20 scale-[1.01]'
                      : 'bg-[#10243d] border-[#1d436c] hover:border-[#2b5e94]'
                  }`}
                >
                  {/* Left: Rank & Date */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 flex items-center justify-center">
                      {getRankBadge(idx)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-racing font-extrabold text-lg sm:text-xl text-yellow-300">
                          {entry.score.toLocaleString('tr-TR')}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-extrabold uppercase font-racing">
                            SON TUR
                          </span>
                        )}
                      </div>
                      <span className="text-white/40 text-[11px] block">{entry.dateStr}</span>
                    </div>
                  </div>

                  {/* Right: Stats badges */}
                  <div className="flex items-center gap-3 text-right">
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-amber-300 text-xs font-semibold">
                        <Coins className="w-3.5 h-3.5" />
                        <span>{entry.coins}</span>
                      </div>
                      <div className="flex items-center gap-1 text-[#84b8e8] text-[11px]">
                        <Compass className="w-3 h-3" />
                        <span>{entry.distanceMeters}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-4 border-t border-[#1c3f66] mt-4 flex items-center justify-between">
          {entries.length > 0 && (
            <button
              onClick={handleClear}
              className="px-3 py-2 rounded-xl text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Skorları Sıfırla
            </button>
          )}

          <button
            onClick={onClose}
            className="ml-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-racing font-bold text-sm tracking-wide uppercase transition-all cursor-pointer shadow-lg"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  );
};
