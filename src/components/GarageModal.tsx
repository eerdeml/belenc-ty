/**
 * Garage & Vehicle Dealership Modal (Garaj & Araba Galerisi).
 * Displays vehicle catalog, stat bars, perks, purchase & equip actions,
 * and persistent gold coin bank balance.
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Coins,
  Check,
  Zap,
  Gauge,
  Shield,
  Sparkles,
  Car,
  Lock,
  ArrowRight,
} from 'lucide-react';
import {
  CAR_CATALOG,
  CarDefinition,
  getBankCoins,
  getUnlockedCarIds,
  getEquippedCarId,
  buyCar,
  equipCar,
} from '../game/cars';
import { sound } from '../game/audio';

interface GarageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCarEquipped: () => void;
}

export const GarageModal: React.FC<GarageModalProps> = ({
  isOpen,
  onClose,
  onCarEquipped,
}) => {
  const [bankCoins, setBankCoins] = useState<number>(getBankCoins());
  const [unlockedIds, setUnlockedIds] = useState<string[]>(getUnlockedCarIds());
  const [equippedId, setEquippedId] = useState<string>(getEquippedCarId());
  const [selectedCarId, setSelectedCarId] = useState<string>(getEquippedCarId());
  const [message, setMessage] = useState<string | null>(null);

  // Synchronize live bank coins, unlocked vehicles, and equipped selection every time the garage is opened
  useEffect(() => {
    if (isOpen) {
      const liveCoins = getBankCoins();
      const currentUnlocked = getUnlockedCarIds();
      const currentEquipped = getEquippedCarId();
      setBankCoins(liveCoins);
      setUnlockedIds(currentUnlocked);
      setEquippedId(currentEquipped);
      setSelectedCarId(currentEquipped);
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectedCar = CAR_CATALOG.find((c) => c.id === selectedCarId) || CAR_CATALOG[0];
  const isUnlocked = unlockedIds.includes(selectedCar.id);
  const isEquipped = equippedId === selectedCar.id;
  const canAfford = bankCoins >= selectedCar.price;

  const handleSelect = (carId: string) => {
    setSelectedCarId(carId);
    setMessage(null);
    sound.playClick();
  };

  const handleEquip = (carId: string) => {
    if (equipCar(carId)) {
      setEquippedId(carId);
      sound.playPowerUp();
      setMessage(`${selectedCar.name} seçildi ve yarışa hazır!`);
      onCarEquipped();
    }
  };

  const handleBuy = (carId: string) => {
    if (buyCar(carId)) {
      sound.playCoin();
      sound.playPowerUp();
      setBankCoins(getBankCoins());
      setUnlockedIds(getUnlockedCarIds());
      setEquippedId(carId);
      setMessage(`Tebrikler! ${selectedCar.name} başarıyla satın alındı ve seçildi!`);
      onCarEquipped();
    } else {
      setMessage('Yetersiz altın! Sahil yolunda daha fazla altın topla.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-none pointer-events-auto animate-fade-in overflow-y-auto">
      <div className="bg-[#0b1728] border-2 border-[#1e4875] rounded-3xl p-4 sm:p-7 max-w-2xl w-full shadow-2xl flex flex-col my-auto max-h-[92vh]">
        {/* Header with Coin Bank Balance */}
        <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-[#1c3f66] mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/30 border border-amber-500/50 flex items-center justify-center text-amber-400">
              <Car className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h3 className="text-xl sm:text-2xl font-extrabold text-white font-racing tracking-wide uppercase">
                GARAJI & ARABA MAĞAZASI
              </h3>
              <p className="text-[#84b8e8] text-xs">
                Altınlarınla yeni arabalar aç ve performansını katla
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Gold Coin Bank Pill */}
            <div className="flex items-center gap-1.5 bg-[#142842] border-2 border-yellow-500/60 px-3 py-1.5 rounded-full shadow-lg">
              <Coins className="w-4 h-4 text-yellow-400 fill-yellow-400 animate-pulse" />
              <span className="text-yellow-300 font-racing font-extrabold text-sm sm:text-base tabular-nums">
                {bankCoins.toLocaleString('tr-TR')}
              </span>
            </div>

            <button
              onClick={onClose}
              aria-label="Kapat"
              className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="w-full mb-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-center gap-2 animate-bounce-short">
            <Sparkles className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {/* Horizontal Car Selector Bar */}
        <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mb-4">
          {CAR_CATALOG.map((car) => {
            const unlocked = unlockedIds.includes(car.id);
            const isCurrentEquipped = equippedId === car.id;
            const isSelected = selectedCarId === car.id;

            return (
              <button
                key={car.id}
                onClick={() => handleSelect(car.id)}
                className={`p-2 sm:p-3 rounded-2xl border-2 flex flex-col items-center justify-center text-center transition-all cursor-pointer relative ${
                  isSelected
                    ? 'bg-[#18395f] border-sky-400 shadow-lg shadow-sky-500/30 scale-102'
                    : 'bg-[#0e2138] border-[#1c3f66] hover:border-[#2f6399] opacity-80 hover:opacity-100'
                }`}
              >
                {/* Equipped Badge */}
                {isCurrentEquipped && (
                  <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[10px] font-black shadow">
                    ✓
                  </span>
                )}

                {/* Lock Badge if locked */}
                {!unlocked && (
                  <span className="absolute -top-1.5 -right-1 w-5 h-5 rounded-full bg-slate-800 text-amber-400 border border-amber-500/60 flex items-center justify-center text-[10px] font-bold shadow">
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}

                {/* Car Color Dot / Swatch */}
                <div
                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white/40 shadow-inner mb-1 flex items-center justify-center"
                  style={{
                    backgroundColor: `#${car.colorHex.toString(16).padStart(6, '0')}`,
                    boxShadow: car.hasNeonUnderglow && car.neonColorHex
                      ? `0 0 10px #${car.neonColorHex.toString(16).padStart(6, '0')}`
                      : undefined,
                  }}
                />

                <span className="font-racing font-bold text-[10px] sm:text-xs text-white truncate max-w-full">
                  {car.name}
                </span>

                <span className="text-[9px] text-yellow-400/90 font-mono mt-0.5">
                  {car.price === 0 ? 'Ücretsiz' : `${car.price} 🪙`}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Car Showcase Card */}
        <div className="bg-[#0e2139] border border-[#1b3d64] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4">
          {/* Visual Showcase Graphic / 3D Silhouette */}
          <div className="w-full sm:w-48 h-32 sm:h-36 rounded-2xl bg-gradient-to-b from-[#162e4d] to-[#0a182a] border border-[#224c7a] flex flex-col items-center justify-center relative overflow-hidden flex-shrink-0">
            {/* Neon ground glow under silhouette */}
            {selectedCar.hasNeonUnderglow && selectedCar.neonColorHex && (
              <div
                className="absolute bottom-4 w-28 h-6 rounded-full blur-md opacity-80"
                style={{
                  backgroundColor: `#${selectedCar.neonColorHex.toString(16).padStart(6, '0')}`,
                }}
              />
            )}

            {/* Stylized sports car vector icon */}
            <Car
              className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-2xl relative z-10 transition-transform transform hover:scale-110"
              style={{
                color: `#${selectedCar.colorHex.toString(16).padStart(6, '0')}`,
              }}
            />

            {/* Spoiler and Feature Tags */}
            <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
              {selectedCar.hasSpoiler && (
                <span className="text-[8px] sm:text-[9px] bg-black/60 border border-white/20 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                  GT KANAT
                </span>
              )}
              {selectedCar.hasNeonUnderglow && (
                <span className="text-[8px] sm:text-[9px] bg-sky-950/80 border border-sky-400/50 text-sky-300 px-1.5 py-0.5 rounded font-mono font-bold">
                  NEON
                </span>
              )}
            </div>
          </div>

          {/* Details & Specs */}
          <div className="flex-1 w-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-lg sm:text-xl font-racing font-extrabold text-white">
                    {selectedCar.name}
                  </h4>
                  <p className="text-xs text-[#84b8e8] font-medium">
                    {selectedCar.subtitle}
                  </p>
                </div>

                {/* Perk Badge */}
                <div className="bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/50 px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-amber-300 text-xs font-racing font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>{selectedCar.perkText}</span>
                </div>
              </div>

              <p className="text-xs text-white/70 mt-2 mb-3 leading-relaxed">
                {selectedCar.description}
              </p>
            </div>

            {/* Stat Bars */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/60 font-semibold w-20 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-rose-400" /> Hız
                </span>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden flex gap-1 p-0.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-sm ${
                        lvl <= selectedCar.stats.speed
                          ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/60 font-semibold w-20 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-sky-400" /> Yol Tutuş
                </span>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden flex gap-1 p-0.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-sm ${
                        lvl <= selectedCar.stats.handling
                          ? 'bg-gradient-to-r from-sky-500 to-blue-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] text-white/60 font-semibold w-20 flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" /> Nitro Gücü
                </span>
                <div className="flex-1 h-2 bg-black/40 rounded-full overflow-hidden flex gap-1 p-0.5">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <div
                      key={lvl}
                      className={`flex-1 h-full rounded-sm ${
                        lvl <= selectedCar.stats.nitro
                          ? 'bg-gradient-to-r from-yellow-400 to-orange-500'
                          : 'bg-white/10'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button Footer */}
        <div className="mt-auto pt-2">
          {isEquipped ? (
            <button
              disabled
              className="w-full py-3.5 rounded-2xl bg-emerald-600/30 border-2 border-emerald-500 text-emerald-300 font-racing font-bold text-base uppercase tracking-wider flex items-center justify-center gap-2 cursor-default"
            >
              <Check className="w-5 h-5 text-emerald-400" />
              ŞU AN KULLANILIYOR
            </button>
          ) : isUnlocked ? (
            <button
              onClick={() => handleEquip(selectedCar.id)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 active:scale-98 text-white font-racing font-bold text-base uppercase tracking-wider shadow-lg shadow-sky-600/40 cursor-pointer flex items-center justify-center gap-2 transition-all"
            >
              <Check className="w-5 h-5" />
              BU ARABAYI KULLAN
            </button>
          ) : (
            <button
              onClick={() => handleBuy(selectedCar.id)}
              disabled={!canAfford}
              className={`w-full py-3.5 rounded-2xl font-racing font-extrabold text-base uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                canAfford
                  ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-slate-950 shadow-xl shadow-amber-500/40 hover:brightness-110 active:scale-98 cursor-pointer'
                  : 'bg-slate-800 text-white/40 border border-slate-700 cursor-not-allowed'
              }`}
            >
              <Coins className="w-5 h-5 text-current" />
              {canAfford
                ? `${selectedCar.price.toLocaleString('tr-TR')} ALTIN İLE SATIN AL`
                : `YETERSİZ ALTIN (${(selectedCar.price - bankCoins).toLocaleString('tr-TR')} DAHA GEREKLİ)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
