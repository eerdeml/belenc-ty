/**
 * Settings Modal Component.
 * Provides audio controls including dedicated volume sliders,
 * music style preset selector, and granular sound toggles.
 */

import React, { useState } from 'react';
import {
  Settings,
  Volume2,
  VolumeX,
  Volume1,
  Coins,
  Gauge,
  Sparkles,
  Music,
  X,
  Sliders,
  Disc,
} from 'lucide-react';
import { sound, AudioSettings } from '../game/audio';
import { synthwaveBgm, MUSIC_STYLES, MusicStyle } from '../game/synthwaveBgm';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChanged?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsChanged,
}) => {
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(sound.getSettings());
  const [musicVolume, setMusicVolume] = useState<number>(Math.round(synthwaveBgm.getVolume() * 100));
  const [musicStyle, setMusicStyle] = useState<MusicStyle>(synthwaveBgm.getStyle());

  if (!isOpen) return null;

  const handleToggle = (key: keyof AudioSettings) => {
    const nextVal = !audioSettings[key];
    sound.setSetting(key, nextVal);
    const updated = sound.getSettings();
    setAudioSettings(updated);
    onSettingsChanged?.();

    if (key === 'coin' && nextVal) {
      sound.playCoin();
    } else if (key !== 'coin') {
      sound.playClick();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setMusicVolume(val);
    synthwaveBgm.setVolume(val / 100);
    onSettingsChanged?.();
  };

  const handleStyleChange = (styleId: MusicStyle) => {
    setMusicStyle(styleId);
    synthwaveBgm.setStyle(styleId);
    sound.playClick();
    onSettingsChanged?.();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-none pointer-events-auto animate-fade-in">
      <div className="bg-[#0b1728] border-2 border-[#204975] rounded-3xl p-5 sm:p-7 max-w-md w-full shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1c3f66] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide uppercase">
                OYUN AYARLARI
              </h3>
              <p className="text-[#84b8e8] text-xs font-medium">
                Müzik sesi, synthwave tarzı ve efektler
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

        {/* Scrollable Settings Content */}
        <div className="space-y-3.5 mb-5 overflow-y-auto pr-1">
          {/* Music Volume Slider Section */}
          <div className="p-3.5 rounded-2xl bg-[#10243d] border border-[#1d436c]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 flex items-center justify-center text-fuchsia-400">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">Müzik Ses Seviyesi</span>
                  <span className="text-[11px] text-white/50">Synthwave BGM ses yüksekliği</span>
                </div>
              </div>
              <span className="text-xs font-racing font-bold text-fuchsia-300 tabular-nums">
                %{musicVolume}
              </span>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <Volume1 className="w-4 h-4 text-white/50 flex-shrink-0" />
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={handleVolumeChange}
                className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-fuchsia-400"
              />
              <Volume2 className="w-4 h-4 text-fuchsia-400 flex-shrink-0" />
            </div>
          </div>

          {/* Music Style / Preset Selector */}
          <div className="p-3.5 rounded-2xl bg-[#10243d] border border-[#1d436c]">
            <div className="flex items-center gap-2 mb-2.5">
              <Disc className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-bold text-white">Müzik Tarzı & Melodi</span>
            </div>

            <div className="space-y-1.5">
              {MUSIC_STYLES.map((style) => {
                const isSelected = musicStyle === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => handleStyleChange(style.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col ${
                      isSelected
                        ? 'bg-fuchsia-950/60 border-fuchsia-400 shadow-md shadow-fuchsia-500/20'
                        : 'bg-[#0d1d33] border-[#1b3b61] hover:border-sky-400/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-racing font-bold ${isSelected ? 'text-fuchsia-300' : 'text-white'}`}>
                        {style.name}
                      </span>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-fuchsia-400 bg-fuchsia-400/20 px-1.5 py-0.5 rounded">
                          Aktif
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-white/60 mt-0.5 leading-snug">
                      {style.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Master Audio Toggle */}
          <div className="p-3 rounded-2xl bg-[#10243d] border border-[#1d436c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-400">
                {audioSettings.master ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Genel Ses</span>
                <span className="text-[11px] text-white/50">Tüm sesleri sustur veya aç</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle('master')}
              role="switch"
              aria-checked={audioSettings.master}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                audioSettings.master ? 'bg-sky-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  audioSettings.master ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Synthwave Arka Plan Müziği Switch */}
          <div className="p-3 rounded-2xl bg-[#10243d] border border-[#1d436c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/15 flex items-center justify-center text-fuchsia-400">
                <Music className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Arka Plan Müziği</span>
                <span className="text-[11px] text-white/50">Outrun synthwave müziğini aç/kapat</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle('music')}
              role="switch"
              aria-checked={audioSettings.music}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                audioSettings.music && audioSettings.master ? 'bg-fuchsia-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  audioSettings.music && audioSettings.master ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Altın Alma Sesi Switch */}
          <div className="p-3 rounded-2xl bg-[#10243d] border border-[#1d436c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Coins className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Altın Alma Sesi</span>
                <span className="text-[11px] text-white/50">Altın toplandığında çalan tını</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle('coin')}
              role="switch"
              aria-checked={audioSettings.coin}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                audioSettings.coin && audioSettings.master ? 'bg-amber-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  audioSettings.coin && audioSettings.master ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Motor Sesi Switch */}
          <div className="p-3 rounded-2xl bg-[#10243d] border border-[#1d436c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500/15 flex items-center justify-center text-rose-400">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Motor Uğultusu</span>
                <span className="text-[11px] text-white/50">Hıza bağlı motor sesi</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle('engine')}
              role="switch"
              aria-checked={audioSettings.engine}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                audioSettings.engine && audioSettings.master ? 'bg-rose-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  audioSettings.engine && audioSettings.master ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Efekt Sesleri Switch */}
          <div className="p-3 rounded-2xl bg-[#10243d] border border-[#1d436c] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 flex items-center justify-center text-purple-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-sm font-bold text-white block">Oyun Efektleri</span>
                <span className="text-[11px] text-white/50">Çarpışma, nitro ve şerit sesleri</span>
              </div>
            </div>

            <button
              onClick={() => handleToggle('sfx')}
              role="switch"
              aria-checked={audioSettings.sfx}
              className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                audioSettings.sfx && audioSettings.master ? 'bg-purple-500' : 'bg-gray-700'
              }`}
            >
              <div
                className={`w-5.5 h-5.5 rounded-full bg-white shadow-md transform transition-transform ${
                  audioSettings.sfx && audioSettings.master ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-racing font-bold text-base tracking-wide uppercase transition-all cursor-pointer shadow-lg active:scale-98 mt-auto"
        >
          Tamam
        </button>
      </div>
    </div>
  );
};
