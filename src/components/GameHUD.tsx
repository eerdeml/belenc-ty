/**
 * Game HUD matching the reference image layout and design.
 * Full mobile & desktop responsive UI with Turkish localization,
 * dedicated settings modal with coin sound toggle, and local leaderboard.
 */

import React, { useState } from 'react';
import {
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Coins,
  ChevronLeft,
  ChevronRight,
  Zap,
  Settings,
  Award,
  Car,
  Music,
  Truck,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { GameStats, GameStatus } from '../game/gameEngine';
import { sound } from '../game/audio';
import { synthwaveBgm } from '../game/synthwaveBgm';
import { LeaderboardModal } from './LeaderboardModal';
import { SettingsModal } from './SettingsModal';
import { AchievementsModal } from './AchievementsModal';
import { GarageModal } from './GarageModal';
import { achievements, Achievement } from '../game/achievements';

import { SpeedometerGauge } from './SpeedometerGauge';

interface GameHUDProps {
  status: GameStatus;
  stats: GameStats;
  latestAchievement?: Achievement | null;
  onLaneChange: (dir: -1 | 1) => void;
  onStartGame: () => void;
  onTogglePause: () => void;
  onRestartGame: () => void;
  onToggleWeather?: () => void;
  onReloadCar?: () => void;
}

const getWeatherIcon = (mode?: string) => {
  switch (mode) {
    case 'sunset':
      return '🌅';
    case 'mist':
      return '🌫️';
    case 'snowy':
      return '❄️';
    case 'sunny':
    default:
      return '☀️';
  }
};

const getWeatherLabel = (mode?: string) => {
  switch (mode) {
    case 'sunset':
      return 'Gün Batımı';
    case 'mist':
      return 'Sahil Sisi';
    case 'snowy':
      return 'Karlı';
    case 'sunny':
    default:
      return 'Güneşli';
  }
};

export const GameHUD: React.FC<GameHUDProps> = ({
  status,
  stats,
  latestAchievement,
  onLaneChange,
  onStartGame,
  onTogglePause,
  onRestartGame,
  onToggleWeather,
  onReloadCar,
}) => {
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [isMusicEnabled, setIsMusicEnabled] = useState(synthwaveBgm.getIsEnabled());
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGarageOpen, setIsGarageOpen] = useState(false);

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = sound.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleMusic = (e: React.MouseEvent) => {
    e.stopPropagation();
    const enabled = synthwaveBgm.toggle();
    setIsMusicEnabled(enabled);
  };

  const isNewHighScore = stats.score > 0 && stats.score >= stats.highScore;
  const isNitroActive = Boolean(stats.activePowerUps?.some((p) => p.type === 'boost'));

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between">
      {/* TOP BAR (Exact reference image layout: PUAN on left, SPEED + CONTROLS on right) */}
      <header className="w-full p-3 sm:p-6 flex items-center justify-between z-20 pointer-events-none">
        {/* Score Pill Card (Left) */}
        <div className="pointer-events-auto bg-[#0d2238]/90 backdrop-blur-none border-2 border-[#1c456e] px-4 sm:px-5 py-2 rounded-2xl shadow-xl flex flex-col items-center min-w-[105px] sm:min-w-[130px] transition-transform active:scale-95">
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

        {/* Speed Dial & Action Buttons (Right) */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          {/* Dynamic Weather Mode Switcher */}
          <button
            onClick={onToggleWeather}
            aria-label="Hava Durumunu Değiştir"
            title={`Hava: ${getWeatherLabel(stats.weatherMode)} (Değiştirmek için tıkla)`}
            className="h-10 sm:h-12 px-2.5 sm:px-3 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center gap-1 text-white/90 hover:text-white hover:border-[#38bdf8] active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            <span className="text-sm sm:text-base leading-none">{getWeatherIcon(stats.weatherMode)}</span>
            <span className="hidden xl:inline text-[11px] font-semibold text-[#a8c7e6]">
              {getWeatherLabel(stats.weatherMode)}
            </span>
          </button>

          {/* Kadranlı (Gauge) Analog Hız Göstergesi */}
          <div className="flex items-center bg-[#0d2238]/95 border-2 border-[#1c456e] p-1 sm:p-1.5 rounded-2xl shadow-2xl">
            <div className="sm:hidden">
              <SpeedometerGauge
                speedKmH={stats.speedKmH}
                size="sm"
                isNitroActive={isNitroActive}
              />
            </div>
            <div className="hidden sm:block">
              <SpeedometerGauge
                speedKmH={stats.speedKmH}
                size="md"
                isNitroActive={isNitroActive}
              />
            </div>
          </div>

          {/* Garage & Cars Button */}
          <button
            onClick={() => setIsGarageOpen(true)}
            aria-label="Garaj & Araba Galerisi"
            title="Garaj & Araba Galerisi"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-amber-300 hover:text-amber-200 hover:border-amber-400 active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            <Car className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-amber-400" />
          </button>

          {/* Synthwave BGM Music Toggle Button */}
          <button
            onClick={handleToggleMusic}
            aria-label={isMusicEnabled ? 'Synthwave Müziğini Kapat' : 'Synthwave Müziğini Aç'}
            title={isMusicEnabled ? 'Synthwave Müziği: Açık' : 'Synthwave Müziği: Kapalı'}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 flex items-center justify-center active:scale-90 transition-all shadow-xl cursor-pointer ${
              isMusicEnabled
                ? 'bg-[#290d38]/95 border-fuchsia-400 text-fuchsia-300 shadow-fuchsia-500/20'
                : 'bg-[#0d2238]/90 border-[#1c456e] text-white/40 hover:text-white/80'
            }`}
          >
            <Music className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>

          {/* Achievements Button */}
          <button
            onClick={() => setIsAchievementsOpen(true)}
            aria-label="Başarımlar ve Görevler"
            title="Başarımlar ve Görevler"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white/90 hover:text-white hover:border-yellow-400 active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            <Award className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-yellow-400" />
          </button>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            aria-label="Ayarlar"
            title="Ayarlar (Ses Tercihleri)"
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white/90 hover:text-white hover:border-[#38bdf8] active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            <Settings className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-sky-400" />
          </button>

          {/* Sound Mute Button */}
          <button
            onClick={handleToggleMute}
            aria-label={isMuted ? 'Sesi Aç' : 'Sesi Kapat'}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white/90 hover:text-white hover:border-[#38bdf8] active:scale-90 transition-all shadow-xl cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-red-400" /> : <Volume2 className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-emerald-400" />}
          </button>

          {/* Pause Button (Visible when playing) */}
          {status === 'playing' && (
            <button
              onClick={onTogglePause}
              aria-label="Duraklat"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#0d2238]/90 border-2 border-[#1c456e] flex items-center justify-center text-white hover:border-[#38bdf8] hover:bg-[#133355] active:scale-90 transition-all shadow-xl cursor-pointer"
            >
              <Pause className="w-4.5 h-4.5 sm:w-5 sm:h-5 fill-white text-white" />
            </button>
          )}
        </div>
      </header>

      {/* IN-GAME ACHIEVEMENT UNLOCKED NOTIFICATION TOAST */}
      {latestAchievement && (
        <div
          onClick={() => setIsAchievementsOpen(true)}
          className="absolute top-16 sm:top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-auto bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 px-4 py-2.5 rounded-2xl shadow-2xl shadow-amber-500/40 border-2 border-yellow-200 flex items-center gap-3 cursor-pointer hover:scale-105 active:scale-95 transition-all animate-bounce"
        >
          <span className="text-2xl sm:text-3xl leading-none">{latestAchievement.icon}</span>
          <div className="flex flex-col text-left">
            <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase text-amber-950">
              🎉 BAŞARIM AÇILDI!
            </span>
            <span className="font-racing font-extrabold text-sm sm:text-base leading-tight text-black">
              {latestAchievement.title}
            </span>
            <span className="text-[11px] font-semibold text-amber-900 line-clamp-1">
              {latestAchievement.description}
            </span>
          </div>
        </div>
      )}

      {/* ACTIVE POWER-UP STATUS BADGES */}
      {status === 'playing' && stats.activePowerUps && stats.activePowerUps.length > 0 && (
        <div className="absolute top-20 sm:top-24 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row gap-2 pointer-events-none z-20">
          {stats.activePowerUps.map((p) => {
            const isMagnet = p.type === 'magnet';
            const percent = Math.max(0, Math.min(100, (p.remaining / p.total) * 100));

            return (
              <div
                key={p.type}
                className={`flex items-center gap-2.5 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-2xl shadow-2xl border-2 backdrop-blur-none transition-all animate-bounce-short ${
                  isMagnet
                    ? 'bg-[#0c243c]/95 border-sky-400 text-sky-200 shadow-sky-500/20'
                    : 'bg-[#3b1204]/95 border-amber-400 text-amber-200 shadow-orange-500/30'
                }`}
              >
                <span className="text-xl sm:text-2xl leading-none">{isMagnet ? '🧲' : '⚡'}</span>
                <div className="flex flex-col">
                  <div className="flex items-center justify-between gap-3 text-xs font-bold font-racing uppercase tracking-wider">
                    <span>{isMagnet ? 'MIKNATIS' : 'HIZ PATLAMASI (DİKKAT: ÇARPIŞMA AKTİF!)'}</span>
                    <span className="text-[11px] tabular-nums font-mono opacity-90">
                      {p.remaining.toFixed(1)}s
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-28 sm:w-36 h-1.5 bg-black/40 rounded-full overflow-hidden mt-1">
                    <div
                      className={`h-full transition-all duration-75 rounded-full ${
                        isMagnet ? 'bg-gradient-to-r from-sky-400 to-cyan-300' : 'bg-gradient-to-r from-amber-400 to-rose-400'
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
            <p className="text-[#89b4de] text-sm font-medium mb-4">
              Üç şeritli sahil yolunda hızlan, altınları topla ve trafiği solla!
            </p>

            {/* High Score Banner with direct Leaderboard Click */}
            <div
              onClick={() => setIsLeaderboardOpen(true)}
              className="w-full bg-[#142944] hover:bg-[#1a375a] border border-[#244b7a] rounded-2xl p-2.5 flex items-center justify-between px-4 mb-4 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-white/80 text-xs font-semibold uppercase tracking-wider">
                  EN YÜKSEK SKOR:
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#ffcc00] font-racing font-bold text-xl">
                  {stats.highScore.toLocaleString('tr-TR')}
                </span>
                <span className="text-xs text-sky-400 font-semibold underline">Tablo</span>
              </div>
            </div>

            {/* How to play quick guide */}
            <div className="w-full bg-[#091524] rounded-2xl p-3.5 text-left text-xs text-[#9bbbd9] space-y-2 mb-4 border border-[#163354]">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-[11px]">1</span>
                <span><strong>Kontroller:</strong> Yön tuşları / <strong>A - D</strong> veya ekrandaki ok butonları</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-300 flex items-center justify-center font-bold text-[11px]">🧲</span>
                <span><strong>Mıknatıs:</strong> 9 saniye boyunca yakındaki tüm altınları arabaya çeker</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">⚡</span>
                <span><strong>Hız Patlaması:</strong> Yüksek hız patlaması! Hız rekoru kır ama dikkat et, araçlara çarpabilirsin!</span>
              </div>
            </div>

            {/* Secondary actions: Leaderboard, Achievements, Garage & Settings */}
            <div className="w-full grid grid-cols-4 gap-1.5 sm:gap-2 mb-3">
              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="py-2.5 px-1.5 rounded-xl bg-[#132742] hover:bg-[#1c385c] border border-[#20456e] text-amber-300 font-racing font-bold text-[10px] sm:text-xs uppercase flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>SKORLAR</span>
              </button>
              <button
                onClick={() => setIsAchievementsOpen(true)}
                className="py-2.5 px-1.5 rounded-xl bg-[#132742] hover:bg-[#1c385c] border border-[#20456e] text-yellow-300 font-racing font-bold text-[10px] sm:text-xs uppercase flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Award className="w-4 h-4 text-yellow-400" />
                <span>GÖREVLER</span>
              </button>
              <button
                onClick={() => setIsGarageOpen(true)}
                className="py-2.5 px-1.5 rounded-xl bg-[#1d3326] hover:bg-[#254634] border border-emerald-500/50 text-emerald-300 font-racing font-bold text-[10px] sm:text-xs uppercase flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Car className="w-4 h-4 text-emerald-400" />
                <span>GARAJ</span>
              </button>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="py-2.5 px-1.5 rounded-xl bg-[#132742] hover:bg-[#1c385c] border border-[#20456e] text-[#84b8e8] font-racing font-bold text-[10px] sm:text-xs uppercase flex flex-col sm:flex-row items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Settings className="w-4 h-4 text-sky-400" />
                <span>AYARLAR</span>
              </button>
            </div>

            {/* Currently Equipped Car Info Strip */}
            <div
              onClick={() => setIsGarageOpen(true)}
              className="w-full mb-3 p-2 rounded-xl bg-[#10243d] border border-[#234d7d] hover:border-amber-400/80 flex items-center justify-between cursor-pointer transition-all active:scale-98"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border border-white/40"
                  style={{
                    backgroundColor: stats.equippedCar?.colorHex
                      ? `#${stats.equippedCar.colorHex.toString(16).padStart(6, '0')}`
                      : '#ee1526',
                  }}
                />
                <span className="text-xs text-white font-racing font-bold">
                  {stats.equippedCar?.name || 'Kırmızı Şimşek'}
                </span>
                <span className="text-[10px] text-amber-300/90 hidden sm:inline">
                  ({stats.equippedCar?.perkText || 'Dengeli'})
                </span>
              </div>
              <span className="text-[11px] font-racing text-sky-300 hover:text-sky-200 underline">
                Garajdan Değiştir →
              </span>
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

            <div className="w-full space-y-2.5">
              <button
                onClick={onTogglePause}
                className="w-full py-3.5 rounded-2xl bg-[#0284c7] hover:bg-[#0ea5e9] text-white font-racing font-bold text-lg tracking-wide uppercase shadow-lg shadow-sky-600/30 cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Play className="w-5 h-5 fill-white" />
                DEVAM ET
              </button>

              <button
                onClick={() => setIsGarageOpen(true)}
                className="w-full py-3 rounded-2xl bg-[#173827] hover:bg-[#1e4833] border border-emerald-500/60 text-emerald-300 font-racing font-bold text-base tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Car className="w-4.5 h-4.5 text-emerald-400" />
                GARAJ: ARABA DEĞİŞTİR
              </button>

              <button
                onClick={() => setIsAchievementsOpen(true)}
                className="w-full py-3 rounded-2xl bg-[#132742] hover:bg-[#1a385f] border border-[#20456e] text-yellow-300 font-racing font-bold text-base tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Award className="w-4.5 h-4.5 text-yellow-400" />
                BAŞARIMLAR & GÖREVLER
              </button>

              <button
                onClick={() => setIsLeaderboardOpen(true)}
                className="w-full py-3 rounded-2xl bg-[#132742] hover:bg-[#1a385f] border border-[#20456e] text-amber-300 font-racing font-bold text-base tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Trophy className="w-4.5 h-4.5 text-amber-400" />
                LİDERLİK TABLOSU
              </button>

              <button
                onClick={() => setIsSettingsOpen(true)}
                className="w-full py-3 rounded-2xl bg-[#132742] hover:bg-[#1a385f] border border-[#20456e] text-sky-300 font-racing font-bold text-base tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <Settings className="w-4.5 h-4.5" />
                SES AYARLARI
              </button>

              <button
                onClick={onRestartGame}
                className="w-full py-3 rounded-2xl bg-[#1e293b] hover:bg-[#334155] border border-[#334155] text-white font-racing font-bold text-base tracking-wide uppercase cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                <RotateCcw className="w-4.5 h-4.5" />
                YENİDEN BAŞLAT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL (With Achievements showcase & Leaderboard) */}
      {status === 'gameover' && (() => {
        const allAchievements = achievements.getAchievements();
        const unlockedCount = allAchievements.filter((a) => a.unlocked).length;
        const progressPct = Math.round((unlockedCount / allAchievements.length) * 100);

        // Highlight achievements: prioritized by new unlocks, then core missions (100 coins, 5 mins survival)
        const spotlight = allAchievements.filter((a) => a.id === 'coins_100' || a.id === 'survival_300' || a.isNew).slice(0, 3);

        return (
          <div className="absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-black/80 pointer-events-auto animate-fade-in overflow-y-auto">
            <div className="bg-[#0e1e33] border-2 border-red-500/70 rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl shadow-red-900/40 text-center flex flex-col items-center my-auto">
              {/* Crash Icon */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-red-600/30 border-2 border-red-500 flex items-center justify-center mb-2">
                <span className="text-3xl">💥</span>
              </div>

              <h2 className="text-2xl sm:text-4xl font-extrabold text-red-500 font-racing tracking-wider uppercase mb-1">
                KAZA YAPTIN!
              </h2>
              <p className="text-white/70 text-xs sm:text-sm mb-3">
                Trafikteki araca çarptın!
              </p>

              {/* New Record Banner */}
              {isNewHighScore && (
                <div className="w-full bg-gradient-to-r from-amber-500/20 via-yellow-400/30 to-amber-500/20 border border-yellow-400/50 rounded-2xl p-2 mb-3 text-yellow-300 font-racing font-bold text-xs sm:text-sm tracking-wider flex items-center justify-center gap-2 animate-bounce">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  YENİ EN YÜKSEK SKOR REKORU!
                </div>
              )}

              {/* Stats Grid */}
              <div className="w-full grid grid-cols-2 gap-2 mb-3">
                <div className="bg-[#12243d] border border-[#20456e] rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[#84b8e8] text-[9px] sm:text-[10px] font-semibold uppercase">BU TURUN PUANI</span>
                  <span className="text-[#ffcc00] font-racing font-extrabold text-xl sm:text-2xl mt-0.5">
                    {stats.score.toLocaleString('tr-TR')}
                  </span>
                </div>

                <div className="bg-[#12243d] border border-[#20456e] rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[#84b8e8] text-[9px] sm:text-[10px] font-semibold uppercase">EN YÜKSEK SKOR</span>
                  <span className="text-white font-racing font-extrabold text-xl sm:text-2xl mt-0.5">
                    {stats.highScore.toLocaleString('tr-TR')}
                  </span>
                </div>

                <div className="bg-[#12243d] border border-[#20456e] rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[#84b8e8] text-[9px] sm:text-[10px] font-semibold uppercase">BU TURDAKİ ALTIN</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Coins className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-300 font-racing font-bold text-lg sm:text-xl">+{stats.coins}</span>
                  </div>
                </div>

                <div className="bg-[#12243d] border border-[#20456e] rounded-xl p-2 flex flex-col items-center">
                  <span className="text-[#84b8e8] text-[9px] sm:text-[10px] font-semibold uppercase">KASADAKİ TOPLAM ALTIN</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-amber-300 font-racing font-extrabold text-lg sm:text-xl">
                      {(stats.bankCoins ?? 0).toLocaleString('tr-TR')}
                    </span>
                    <span className="text-xs text-yellow-400">🪙</span>
                  </div>
                </div>
              </div>

              {/* ACHIEVEMENTS / MISSIONS SHOWCASE ON GAME OVER SCREEN */}
              <div className="w-full bg-[#0a182a] border border-[#1b3d63] rounded-2xl p-3 mb-3 text-left">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-yellow-400 font-racing font-bold text-xs sm:text-sm uppercase tracking-wide">
                    <Award className="w-4 h-4" />
                    <span>GÖREVLER & BAŞARIMLAR</span>
                  </div>
                  <span className="text-[11px] font-mono text-white/70">
                    {unlockedCount} / {allAchievements.length} (%{progressPct})
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/40 h-1.5 rounded-full overflow-hidden mb-2.5">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-300 rounded-full transition-all duration-500"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>

                {/* Spotlight missions */}
                <div className="space-y-1.5">
                  {spotlight.map((ach) => {
                    const pct = Math.min(100, Math.round((ach.current / ach.target) * 100));
                    return (
                      <div
                        key={ach.id}
                        className={`p-2 rounded-xl border flex items-center justify-between text-xs ${
                          ach.unlocked
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                            : 'bg-[#112640]/70 border-[#1c4069] text-white/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-base flex-shrink-0">{ach.icon}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="font-racing font-bold truncate">{ach.title}</span>
                              {ach.isNew && (
                                <span className="px-1 py-0.2 rounded bg-amber-400 text-black text-[8px] font-black uppercase">
                                  YENİ!
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/60 block truncate">{ach.description}</span>
                          </div>
                        </div>

                        <div className="ml-2 flex-shrink-0 text-right font-mono text-[10px]">
                          {ach.unlocked ? (
                            <span className="text-emerald-400 font-bold">✓ Bitti</span>
                          ) : (
                            <span className="text-sky-300">{ach.current}/{ach.target} (%{pct})</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Open Full Achievements Button */}
                <button
                  onClick={() => setIsAchievementsOpen(true)}
                  className="w-full mt-2 py-1.5 text-center text-xs font-racing font-semibold text-yellow-300/90 hover:text-yellow-200 hover:underline flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Tüm Başarımları İncele</span>
                  <span>→</span>
                </button>
              </div>

              {/* Action buttons: Restart, Garage, Achievements & Leaderboard */}
              <div className="w-full space-y-2">
                <button
                  onClick={onRestartGame}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 via-rose-500 to-red-600 hover:from-red-500 hover:to-rose-400 active:scale-98 text-white font-racing font-extrabold text-base sm:text-lg tracking-wider uppercase shadow-xl shadow-red-600/40 cursor-pointer flex items-center justify-center gap-2 transition-all"
                >
                  <RotateCcw className="w-5 h-5" />
                  TEKRAR OYNA
                </button>

                <button
                  onClick={() => setIsGarageOpen(true)}
                  className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-600/30 to-yellow-600/30 border-2 border-yellow-400 text-yellow-300 font-racing font-bold text-sm uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-98 hover:brightness-110 shadow-lg shadow-amber-500/20"
                >
                  <Car className="w-4.5 h-4.5 text-yellow-400" />
                  GARAJ: YENİ ARABA SATIN AL & DEĞİŞTİR
                </button>

                <div className="w-full grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setIsLeaderboardOpen(true)}
                    className="py-2.5 px-2 rounded-xl bg-[#142944] hover:bg-[#1a385f] border border-[#244b7a] text-amber-300 font-racing font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-98"
                  >
                    <Trophy className="w-4 h-4 text-amber-400" />
                    LİDERLİK TABLOSU
                  </button>
                  <button
                    onClick={() => setIsAchievementsOpen(true)}
                    className="py-2.5 px-2 rounded-xl bg-[#142944] hover:bg-[#1a385f] border border-[#244b7a] text-yellow-300 font-racing font-bold text-xs uppercase cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-98"
                  >
                    <Award className="w-4 h-4 text-yellow-400" />
                    BAŞARIMLAR
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODALS */}
      <GarageModal
        isOpen={isGarageOpen}
        onClose={() => setIsGarageOpen(false)}
        onCarEquipped={() => onReloadCar?.()}
      />

      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        highlightRunId={stats.lastRunId}
      />

      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChanged={() => {
          setIsMuted(sound.getMuted());
          setIsMusicEnabled(synthwaveBgm.getIsEnabled());
        }}
      />
    </div>
  );
};
