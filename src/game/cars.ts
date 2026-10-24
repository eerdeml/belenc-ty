/**
 * Vehicle Garage Catalog and Bank Economy System.
 * Stores purchased vehicles, current equipped vehicle, and total collected bank coins.
 */

export interface CarDefinition {
  id: string;
  name: string;
  subtitle: string;
  price: number;
  colorHex: number;
  neonColorHex?: number;
  accentColorHex?: number;
  hasSpoiler: boolean;
  spoilerStyle?: 'classic' | 'gt_wing' | 'cyber_fins' | 'hyper_dual';
  hasNeonUnderglow: boolean;
  description: string;
  perkText: string;
  stats: {
    speed: number;    // 1 - 5
    handling: number; // 1 - 5
    nitro: number;    // 1 - 5
  };
  bonusType?: 'coin_boost' | 'magnet_boost' | 'speed_boost';
  bonusValue?: number;
}

export const CAR_CATALOG: CarDefinition[] = [
  {
    id: 'red_roadster',
    name: 'Kırmızı Şimşek',
    subtitle: 'Klasik Sahil Roadsterı',
    price: 0,
    colorHex: 0xee1526,
    hasSpoiler: false,
    hasNeonUnderglow: false,
    description: 'Sahil yolunun efsanevi kırmızı yarışçısı. Dengeli kontrol ve atik viraj kabiliyeti.',
    perkText: 'Dengeli & Çevik',
    stats: {
      speed: 3,
      handling: 4,
      nitro: 3,
    },
  },
  {
    id: 'night_phantom',
    name: 'Gece Hayaleti',
    subtitle: 'Mat Siyah & Turkuaz Neon',
    price: 350,
    colorHex: 0x111317,
    neonColorHex: 0x06b6d4,
    accentColorHex: 0x06b6d4,
    hasSpoiler: true,
    spoilerStyle: 'classic',
    hasNeonUnderglow: true,
    description: 'Gece sürüşleri için tasarlanmış karbon gövde ve turkuaz zemin neonu.',
    perkText: '+%15 Hızlanma Bonusu',
    stats: {
      speed: 4,
      handling: 4,
      nitro: 3,
    },
    bonusType: 'speed_boost',
    bonusValue: 1.15,
  },
  {
    id: 'sunset_gt',
    name: 'Gün Batımı GT',
    subtitle: 'Lav Turuncusu Geniş Gövde',
    price: 650,
    colorHex: 0xf97316,
    neonColorHex: 0xf59e0b,
    accentColorHex: 0x18181b,
    hasSpoiler: true,
    spoilerStyle: 'gt_wing',
    hasNeonUnderglow: true,
    description: 'Genişletilmiş aerodinamik gövde ve güçlü manyetik altın çekim aurası.',
    perkText: '+%35 Mıknatıs Çekim Menzili',
    stats: {
      speed: 4,
      handling: 3,
      nitro: 4,
    },
    bonusType: 'magnet_boost',
    bonusValue: 1.35,
  },
  {
    id: 'cyber_pulse',
    name: 'Siber Nabız',
    subtitle: 'Synthwave Mor & Çift Kanat',
    price: 1100,
    colorHex: 0x8b5cf6,
    neonColorHex: 0xec4899,
    accentColorHex: 0xec4899,
    hasSpoiler: true,
    spoilerStyle: 'cyber_fins',
    hasNeonUnderglow: true,
    description: 'Synthwave dalgasından fırlamış fütüristik mor tasarım. Altın kazancını katlar.',
    perkText: '+%50 Ekstra Altın Kazancı',
    stats: {
      speed: 4,
      handling: 5,
      nitro: 4,
    },
    bonusType: 'coin_boost',
    bonusValue: 1.5,
  },
  {
    id: 'golden_storm',
    name: 'Altın Fırtına',
    subtitle: 'Titanyum Altın Şampiyon',
    price: 1900,
    colorHex: 0xfacc15,
    neonColorHex: 0xfef08a,
    accentColorHex: 0x171717,
    hasSpoiler: true,
    spoilerStyle: 'hyper_dual',
    hasNeonUnderglow: true,
    description: 'Saf altın kaplama ve çift titanyum egzozlu nihai otoyol canavarı.',
    perkText: 'Maksimum Hız & Altın Bonusu',
    stats: {
      speed: 5,
      handling: 4,
      nitro: 5,
    },
    bonusType: 'speed_boost',
    bonusValue: 1.25,
  },
];

const STORAGE_KEY_BANK_COINS = 'coastal_racer_bank_coins';
const STORAGE_KEY_UNLOCKED_CARS = 'coastal_racer_unlocked_cars';
const STORAGE_KEY_EQUIPPED_CAR = 'coastal_racer_equipped_car';

/**
 * Returns total bank coins saved in localStorage.
 */
export function getBankCoins(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BANK_COINS);
    if (saved !== null) {
      const val = parseInt(saved, 10);
      return Number.isNaN(val) ? 0 : Math.max(0, val);
    }
    // Also migrate any coins already tracked in achievements if available
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Adds coins to player bank.
 */
export function addBankCoins(amount: number): number {
  if (amount <= 0) return getBankCoins();
  const current = getBankCoins();
  const updated = current + amount;
  try {
    localStorage.setItem(STORAGE_KEY_BANK_COINS, updated.toString());
  } catch {
    // Ignore storage errors
  }
  return updated;
}

/**
 * Deducts coins from bank if sufficient balance.
 */
export function spendBankCoins(amount: number): boolean {
  const current = getBankCoins();
  if (current < amount) return false;
  try {
    localStorage.setItem(STORAGE_KEY_BANK_COINS, (current - amount).toString());
    return true;
  } catch {
    return false;
  }
}

/**
 * Gets list of unlocked car IDs.
 */
export function getUnlockedCarIds(): string[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_UNLOCKED_CARS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.includes('red_roadster')) {
        return parsed;
      }
    }
  } catch {
    // Fallback
  }
  return ['red_roadster'];
}

/**
 * Gets the currently equipped car ID.
 */
export function getEquippedCarId(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_EQUIPPED_CAR);
    if (saved && CAR_CATALOG.some((c) => c.id === saved)) {
      return saved;
    }
  } catch {
    // Fallback
  }
  return 'red_roadster';
}

/**
 * Equips a car if unlocked.
 */
export function equipCar(carId: string): boolean {
  const unlocked = getUnlockedCarIds();
  if (!unlocked.includes(carId)) return false;
  try {
    localStorage.setItem(STORAGE_KEY_EQUIPPED_CAR, carId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Buys a car and unlocks it.
 */
export function buyCar(carId: string): boolean {
  const car = CAR_CATALOG.find((c) => c.id === carId);
  if (!car) return false;

  const unlocked = getUnlockedCarIds();
  if (unlocked.includes(carId)) return true;

  if (spendBankCoins(car.price)) {
    unlocked.push(carId);
    try {
      localStorage.setItem(STORAGE_KEY_UNLOCKED_CARS, JSON.stringify(unlocked));
      equipCar(carId);
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Gets the CarDefinition of the equipped vehicle.
 */
export function getEquippedCar(): CarDefinition {
  const id = getEquippedCarId();
  return CAR_CATALOG.find((c) => c.id === id) || CAR_CATALOG[0];
}
