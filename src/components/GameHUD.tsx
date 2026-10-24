/**
 * Game HUD matching the reference image layout and design.
 * Full mobile & desktop responsive UI with Turkish localization.
 */

import React, { useState } from 'react';
import { Pause, Play, RotateCcw, Volume2, VolumeX, Trophy, Coins, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { GameStats, GameStatus } from '../game/gameEngine';
import { sound } from '../game/audio';

interface GameHUDProps {
  status: GameStatus;
  stats: GameStats;
  onLaneChange: (dir: -1 | 1) => void;
  onStartGame: () => void;
  onTogglePause: () => void;
  onRestartGame: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  status,
  stats,
  onLaneChange,
  onStartGame,
  onTogglePause,
  onRestartGame,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const isNewHighScore = stats.score > 0 && stats.score >= stats.highScore;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between">
      {/* TOP BAR (Reference image exact style: PUAN on left, SPEED + PAUSE on right) */}
      <header className="w-full p-4 sm:p-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Score Pill Card (Left) */}
        <div className="pointer-events-auto bg-[#0d2238]/90 backdrop-blur-none border-2 border-[#1c456e] px-5 py-2 rounded-2xl shadow-xl flex flex-col items-center min-w-[110px] sm:min-w-[130px] transition-transform active:scale-95">
          <span className="text-[#84b8e8] text-[11px] sm:text-xs font-bold tracking-widest uppercase">
            PUAN
          </span>
          <span className="text-[#ffcc00] font-racing font-extrabold text-2xl sm:text-3xl tracking-wide tabular-nums leading-none mt-0.5 drop-shadow-[0_2px_8px_rgba(255,204,0,0.3)]">
            {stats.score.toLocaleString('tr-TR')}
          </span>
        </div>

        {/* Coins indicator in top middle */}
        {status === 'playing' && (
          <div className="hidden sm:flex items-center gap-1.5 bg-[#0d2238]/80 border border-[#1c456e]/80 px-3.5 py-1.5 rounded-full shadow-lg">
            <Coins className="w-4 h-4 text-[#ffc719]" />
            <span className="text-[#ffdf6d] font-racing font-bold text-sm tabular-nums">
              {stats.coins}
            </span>
          </div>
        )}

        {/* Speed Pill Card & Action Buttons (Right) */}
        <div className="pointer-events-auto flex items-center gap-2.5 sm:gap-3">
          {/* Speed Card */}
          <div className="bg-[#0d2238]/90 backdrop-blur-none border-2 border-[#1c456e] px-4 sm:px-5 py-2 rounded-2xl shadow-xl flex items-baseline gap-1.5 min-w-[120px] sm:min-w-[140px] justify-center">
            <span className="text-white font-racing font-extrabold text-2xl sm:text-3xl tracking-tight tabular-nums leading-none">
              {stats.speedKmH}
            </span>
            <span className="text-[#9fc7eb] text-xs sm:text-sm font-semibold italic">
              km/sa
            </span>
          </div>

          {/* Sound Mute Button */}
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white/90 hover:text-white hover:border-[#38bdf8] active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-emerald-400" />}
          </button>

          {/* Pause Button (Visible when playing) */}
          {status === 'playing' && (
            <button
              onClick={onTogglePause}
              aria-label="Duraklat"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white hover:border-[#38bdf8] hover:bg-[#133355] active:scale-90 transition-all shadow-xl cursor-pointer"
            >
              <Pause className="w-5 h-5 fill-white text-white" />
            </button>
          )}
        </div>
      </header>

      {/* MOBILE TOUCH CONTROLS (Bottom-left & Bottom-right big translucent buttons matching image) */}
      <footer className="w-full p-5 sm:p-8 flex items-end justify-between z-20 pointer-events-none">
        {/* Left Lane Change Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onLaneChange(-1);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onLaneChange(-1);
          }}
          aria-label="Sola Geç"
          className="pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 active:scale-90 border-2 border-white/40 flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-none group"
        >
          <ChevronLeft className="w-12 h-12 sm:w-14 sm:h-14 text-white stroke-[2.8] transition-transform group-active:-translate-x-1" />
        </button>

        {/* Center Control Hint for Desktop */}
        <div className="hidden md:flex flex-col items-center justify-center bg-[#0d2238]/80 border border-[#1c456e] px-4 py-2 rounded-xl text-center shadow-lg">
          <span className="text-[#a8c7e6] text-xs font-semibold">
            Şerit Değiştir: <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-white font-mono text-[11px] mx-0.5">←</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-white font-mono text-[11px] mx-0.5">→</kbd> veya <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-white font-mono text-[11px] mx-0.5">A</kbd> <kbd className="px-1.5 py-0.5 rounded bg-black/40 text-white font-mono text-[11px] mx-0.5">D</kbd>
          </span>
          <span className="text-white/60 text-[10px] mt-0.5">
            Duraklat: <kbd className="px-1 py-0.5 rounded bg-black/40 text-white font-mono text-[10px]">P</kbd> / <kbd className="px-1 py-0.5 rounded bg-black/40 text-white font-mono text-[10px]">Boşluk</kbd>
          </span>
        </div>

        {/* Right Lane Change Button */}
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onLaneChange(1);
          }}
          onMouseDown={(e) => {
            e.preventDefault();
            onLaneChange(1);
          }}
          aria-label="Sağa Geç"
          className="pointer-events-auto w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/15 hover:bg-white/25 active:bg-white/35 active:scale-90 border-2 border-white/40 flex items-center justify-center shadow-2xl transition-all cursor-pointer backdrop-blur-none group"
        >
          <ChevronRight className="w-12 h-12 sm:w-14 sm:h-14 text-white stroke-[2.8] transition-transform group-active:translate-x-1" />
        </button>
      </footer>

      {/* START MODAL */}
      {status === 'start' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60 pointer-events-auto">
          <div className="bg-[#0e1e33] border-2 border-[#225080] rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center flex flex-col items-center">
            {/* High-speed sport emblem */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 to-rose-400 flex items-center justify-center shadow-lg shadow-red-500/30 mb-3">
              <Zap className="w-9 h-9 text-white fill-white" />
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white font-racing tracking-wider uppercase mb-1 drop-shadow-md">
              SAHİL OTOBANI
            </h1>
            <p className="text-[#89b4de] text-sm font-medium mb-5">
              Üç şeritli sahil yolunda hızlan, altınları topla ve trafiği solla!
            </p>

            {/* High Score Banner */}
            {stats.highScore > 0 && (
              <div className="w-full bg-[#142944] border border-[#244b7a] rounded-2xl p-3 flex items-center justify-center gap-3 mb-5">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                  EN YÜKSEK SKOR:
                </span>
                <span className="text-[#ffcc00] font-racing font-bold text-xl">
                  {stats.highScore.toLocaleString('tr-TR')}
                </span>
              </div>
            )}

            {/* How to play quick guide */}
            <div className="w-full bg-[#091524] rounded-2xl p-4 text-left text-xs text-[#9bbbd9] space-y-2 mb-6 border border-[#163354]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">1</span>
                <span><strong>Bilgisayar:</strong> Yön tuşları veya <strong>A - D</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">2</span>
                <span><strong>Mobil:</strong> Büyük sağ-sol düğmeleri veya ekranı kaydır</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">3</span>
                <span>Altınları topla (+50 puan), araçlara çarpmaktan kaçın!</span>
              </div>
            </div>

            {/* Start Button */}
            <button
              onClick={onStartGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-400 active:scale-98 text-white font-racing font-extrabold text-xl tracking-wider uppercase shadow-xl shadow-red-600/40 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Play className="w-6 h-6 fill-white" />
              OYUNA BAŞLA
            </button>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {status === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/65 pointer-events-auto">
          <div className="bg-[#0e1e33] border-2 border-[#225080] rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white font-racing tracking-wider uppercase mb-5">
              OYUN DURAKLATILDI
            </h2>

            <div className="w-full space-y-3">
              <button
                onClick={onTogglePause}
                className="w-full py-3.5 rounded-2xl bg-[#0284c7] hover:bg-[#0ea5e9] text-white font-racing font-bold text-lg tracking-wide uppercase shadow-lg shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Play className="w-5 h-5 fill-white" />
                DEVAM ET
              </button>

              <button
                onClick={onRestartGame}
                className="w-full py-3.5 rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-white font-racing font-bold text-lg tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <RotateCcw className="w-5 h-5" />
                YENİDEN BAŞLAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {status === 'gameover' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/75 pointer-events-auto animate-fade-in">
          <div className="bg-[#0e1e33] border-2 border-red-500/70 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl shadow-red-900/30 text-center flex flex-col items-center">
            {/* Crash Icon */}
            <div className="w-16 h-16 rounded-2xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center mb-3">
              <span className="text-3xl">💥</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-red-500 font-racing tracking-wider uppercase mb-1">
              KAZA YAPTIN!
            </h2>
            <p className="text-white/70 text-sm mb-5">
              Trafikteki araca çarptın!
            </p>

            {/* New Record Banner */}
            {isNewHighScore && (
              <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-yellow-400/50 rounded-2xl p-2.5 mb-4 text-yellow-300 font-racing font-bold text-sm tracking-wider flex items-center justify-center gap-2 animate-bounce">
                <Trophy className="w-4 h-4 text-yellow-400" />
                YENİ REKOR KIRILDI!
              </div>
            )}

            {/* Stats Grid */}
            <div className="w-full grid grid-cols-2 gap-3 mb-6">
              <div className="bg-[#12243d] border border-[#20456e] rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[#84b8e8] text-[11px] font-semibold uppercase">TOPLAM PUAN</span>
                <span className="text-[#ffcc00] font-racing font-extrabold text-2xl mt-0.5">
                  {stats.score.toLocaleString('tr-TR')}
                </span>
              </div>

              <div className="bg-[#12243d] border border-[#20456e] rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[#84b8e8] text-[11px] font-semibold uppercase">EN YÜKSEK SKOR</span>
                <span className="text-white font-racing font-extrabold text-2xl mt-0.5">
                  {stats.highScore.toLocaleString('tr-TR')}
                </span>
              </div>

              <div className="bg-[#12243d] border border-[#20456e] rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[#84b8e8] text-[11px] font-semibold uppercase">TOPLANAN ALTIN</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-300 font-racing font-bold text-xl">{stats.coins}</span>
                </div>
              </div>

              <div className="bg-[#12243d] border border-[#20456e] rounded-2xl p-3 flex flex-col items-center">
                <span className="text-[#84b8e8] text-[11px] font-semibold uppercase">ULAŞILAN HIZ</span>
                <span className="text-white font-racing font-bold text-xl mt-0.5">
                  {stats.speedKmH} <span className="text-xs text-white/70">km/sa</span>
                </span>
              </div>
            </div>

            {/* Play Again Button */}
            <button
              onClick={onRestartGame}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-400 active:scale-98 text-white font-racing font-extrabold text-xl tracking-wider uppercase shadow-xl shadow-red-600/40 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <RotateCcw className="w-6 h-6" />
              TEKRAR OYNA
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
