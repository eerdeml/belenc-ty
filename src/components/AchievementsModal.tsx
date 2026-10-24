/**
 * Achievements Modal Component.
 * Displays all game achievements, progress bars, and unlocked status.
 */

import React, { useState, useEffect } from 'react';
import { Award, CheckCircle2, Lock, X } from 'lucide-react';
import { achievements, Achievement } from '../game/achievements';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ isOpen, onClose }) => {
  const [list, setList] = useState<Achievement[]>([]);

  useEffect(() => {
    if (isOpen) {
      setList(achievements.getAchievements());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const unlockedCount = list.filter((a) => a.unlocked).length;
  const progressPercent = Math.round((unlockedCount / (list.length || 1)) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 pointer-events-auto">
      <div className="bg-[#0b1728] border-2 border-[#204975] rounded-3xl p-5 sm:p-7 max-w-lg w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c3f66] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide uppercase">
                BAŞARIMLAR & GÖREVLER
              </h3>
              <p className="text-[#84b8e8] text-xs font-medium">
                {unlockedCount} / {list.length} Görev Tamamlandı (%{progressPercent})
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

        {/* Global Progress Bar */}
        <div className="w-full bg-[#10243d] rounded-full h-2 mb-4 overflow-hidden border border-[#1b3d63]">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Achievement Items List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar min-h-[240px]">
          {list.map((ach) => {
            const pct = Math.min(100, Math.round((ach.current / (ach.target || 1)) * 100));

            return (
              <div
                key={ach.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between ${
                  ach.unlocked
                    ? 'bg-amber-500/10 border-amber-500/40 shadow-sm shadow-amber-500/10'
                    : 'bg-[#10243d]/80 border-[#1d436c] opacity-80'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 pr-3">
                  <div className="text-2xl sm:text-3xl flex-shrink-0">{ach.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-racing font-bold text-sm sm:text-base text-white">
                        {ach.title}
                      </span>
                      {ach.isNew && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-400 text-black text-[9px] font-black font-racing uppercase">
                          YENİ!
                        </span>
                      )}
                    </div>
                    <p className="text-white/60 text-xs mt-0.5">{ach.description}</p>

                    {/* Progress Bar for ongoing missions */}
                    {!ach.unlocked && (
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-black/40 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-sky-400 h-full rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-white/50 font-mono">
                          {ach.current} / {ach.target}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 flex items-center justify-center">
                  {ach.unlocked ? (
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-white/5 text-white/30 flex items-center justify-center">
                      <Lock className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#1c3f66] mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-racing font-bold text-sm tracking-wide uppercase transition-all cursor-pointer shadow-lg"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
};
