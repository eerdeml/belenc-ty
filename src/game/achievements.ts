/**
 * Achievement & Mission tracking system for Coastal Highway Racing.
 * Persists cumulative progress, unlocks, and recent unlocks in localStorage.
 */

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  unlocked: boolean;
  unlockedAt?: number;
  isNew?: boolean;
}

export interface CumulativeStats {
  totalCoins: number;
  longestSurvivalSec: number;
  maxSpeedKmH: number;
  totalOvertakes: number;
  nitroUsedCount: number;
  magnetUsedCount: number;
  maxDistanceMeters: number;
}

const ACHIEVEMENTS_STORAGE_KEY = 'coastal_racer_achievements';
const STATS_STORAGE_KEY = 'coastal_racer_cumulative_stats';

const DEFAULT_ACHIEVEMENTS: Omit<Achievement, 'current' | 'unlocked'>[] = [
  {
    id: 'coins_25',
    title: 'Altın Avcısı',
    description: 'Toplam 25 altın topla',
    icon: '🪙',
    target: 25,
  },
  {
    id: 'coins_100',
    title: 'Hazine Ustası',
    description: 'Toplam 100 altın topla',
    icon: '💰',
    target: 100,
  },
  {
    id: 'survival_60',
    title: 'Sahil Turisti',
    description: 'Tek turda 1 dakika (60 sn) kaza yapmadan hayatta kal',
    icon: '⏱️',
    target: 60,
  },
  {
    id: 'survival_300',
    title: 'Yolun Efendisi',
    description: 'Tek turda 5 dakika (300 sn) hayatta kal',
    icon: '👑',
    target: 300,
  },
  {
    id: 'speed_160',
    title: 'Hız Canavarı',
    description: '160 km/sa veya daha yüksek hıza ulaş',
    icon: '🏎️',
    target: 160,
  },
  {
    id: 'overtake_15',
    title: 'Usta Solcu',
    description: 'Tek turda 15 aracı kaza yapmadan solla',
    icon: '🚗',
    target: 15,
  },
  {
    id: 'nitro_run',
    title: 'Nitro Tutkunu',
    description: 'Hız Patlaması güçlendirmesini alıp hızlan',
    icon: '⚡',
    target: 1,
  },
  {
    id: 'magnet_run',
    title: 'Manyetik Güç',
    description: 'Mıknatıs güçlendirmesini alıp altınları topla',
    icon: '🧲',
    target: 1,
  },
  {
    id: 'distance_2000',
    title: 'Uzun Yol Şoförü',
    description: 'Tek turda 2.000 metre yol kat et',
    icon: '🛣️',
    target: 2000,
  },
];

class AchievementSystem {
  private achievements: Achievement[] = [];
  private stats: CumulativeStats = {
    totalCoins: 0,
    longestSurvivalSec: 0,
    maxSpeedKmH: 0,
    totalOvertakes: 0,
    nitroUsedCount: 0,
    magnetUsedCount: 0,
    maxDistanceMeters: 0,
  };

  private listeners: ((achievement: Achievement) => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    // Load cumulative stats
    try {
      const statsRaw = localStorage.getItem(STATS_STORAGE_KEY);
      if (statsRaw) {
        this.stats = { ...this.stats, ...JSON.parse(statsRaw) };
      }
    } catch {
      // Ignore
    }

    // Load saved achievements
    let savedMap: Record<string, { unlocked: boolean; unlockedAt?: number }> = {};
    try {
      const achRaw = localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
      if (achRaw) {
        savedMap = JSON.parse(achRaw);
      }
    } catch {
      // Ignore
    }

    this.achievements = DEFAULT_ACHIEVEMENTS.map((def) => {
      const saved = savedMap[def.id];
      const isUnlocked = !!saved?.unlocked;
      const current = this.calcCurrent(def.id);

      return {
        ...def,
        current: Math.min(def.target, current),
        unlocked: isUnlocked,
        unlockedAt: saved?.unlockedAt,
        isNew: false,
      };
    });
  }

  private calcCurrent(id: string): number {
    switch (id) {
      case 'coins_25':
      case 'coins_100':
        return this.stats.totalCoins;
      case 'survival_60':
      case 'survival_300':
        return Math.floor(this.stats.longestSurvivalSec);
      case 'speed_160':
        return Math.round(this.stats.maxSpeedKmH);
      case 'overtake_15':
        return this.stats.totalOvertakes;
      case 'nitro_run':
        return this.stats.nitroUsedCount;
      case 'magnet_run':
        return this.stats.magnetUsedCount;
      case 'distance_2000':
        return Math.floor(this.stats.maxDistanceMeters);
      default:
        return 0;
    }
  }

  private save() {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(this.stats));

    const map: Record<string, { unlocked: boolean; unlockedAt?: number }> = {};
    this.achievements.forEach((a) => {
      if (a.unlocked) {
        map[a.id] = { unlocked: true, unlockedAt: a.unlockedAt };
      }
    });
    localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(map));
  }

  public onUnlock(cb: (achievement: Achievement) => void) {
    this.listeners.push(cb);
  }

  public getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  public resetNewFlags() {
    this.achievements.forEach((a) => {
      a.isNew = false;
    });
  }

  public updateLiveRun(data: {
    runSurvivalSec: number;
    coinsCollectedThisRun: number;
    currentSpeedKmH: number;
    overtakesThisRun: number;
    nitroTriggered: boolean;
    magnetTriggered: boolean;
    distanceMeters: number;
  }) {
    let changed = false;

    // Update longest survival
    if (data.runSurvivalSec > this.stats.longestSurvivalSec) {
      this.stats.longestSurvivalSec = data.runSurvivalSec;
      changed = true;
    }

    // Update max speed
    if (data.currentSpeedKmH > this.stats.maxSpeedKmH) {
      this.stats.maxSpeedKmH = data.currentSpeedKmH;
      changed = true;
    }

    // Update max distance
    if (data.distanceMeters > this.stats.maxDistanceMeters) {
      this.stats.maxDistanceMeters = data.distanceMeters;
      changed = true;
    }

    // Nitro & Magnet
    if (data.nitroTriggered && this.stats.nitroUsedCount === 0) {
      this.stats.nitroUsedCount = 1;
      changed = true;
    }
    if (data.magnetTriggered && this.stats.magnetUsedCount === 0) {
      this.stats.magnetUsedCount = 1;
      changed = true;
    }

    // Single run overtakes check
    if (data.overtakesThisRun > this.stats.totalOvertakes) {
      this.stats.totalOvertakes = data.overtakesThisRun;
      changed = true;
    }

    // Check unlocks
    this.achievements.forEach((a) => {
      a.current = Math.min(a.target, this.calcCurrent(a.id));

      if (!a.unlocked && a.current >= a.target) {
        a.unlocked = true;
        a.unlockedAt = Date.now();
        a.isNew = true;
        changed = true;

        // Notify listeners
        this.listeners.forEach((cb) => cb(a));
      }
    });

    if (changed) {
      this.save();
    }
  }

  public recordCoinsCollected(count: number) {
    if (count <= 0) return;
    this.stats.totalCoins += count;
    let changed = true;

    this.achievements.forEach((a) => {
      if (a.id === 'coins_25' || a.id === 'coins_100') {
        a.current = Math.min(a.target, this.stats.totalCoins);
        if (!a.unlocked && a.current >= a.target) {
          a.unlocked = true;
          a.unlockedAt = Date.now();
          a.isNew = true;
          this.listeners.forEach((cb) => cb(a));
        }
      }
    });

    this.save();
  }
}

export const achievements = new AchievementSystem();
