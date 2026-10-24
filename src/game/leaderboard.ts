/**
 * LocalStorage Leaderboard manager for Coastal Highway Racing.
 * Stores, sorts, and retrieves top session runs.
 */

export interface LeaderboardEntry {
  id: string;
  timestamp: number;
  dateStr: string;
  score: number;
  coins: number;
  distanceMeters: number;
  maxSpeedKmH: number;
}

const STORAGE_KEY = 'coastal_racer_leaderboard_records';
const MAX_ENTRIES = 10;

export function getLeaderboard(): LeaderboardEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.score - a.score).slice(0, MAX_ENTRIES);
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

export function saveScoreToLeaderboard(data: {
  score: number;
  coins: number;
  distanceMeters: number;
  maxSpeedKmH: number;
}): { entry: LeaderboardEntry; rank: number; isNewRecord: boolean } {
  const currentEntries = getLeaderboard();
  const now = new Date();
  const dateStr = now.toLocaleDateString('tr-TR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const newEntry: LeaderboardEntry = {
    id: `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    dateStr,
    score: Math.floor(data.score),
    coins: data.coins,
    distanceMeters: Math.floor(data.distanceMeters),
    maxSpeedKmH: Math.round(data.maxSpeedKmH),
  };

  const updated = [...currentEntries, newEntry].sort((a, b) => b.score - a.score);
  const rank = updated.findIndex((e) => e.id === newEntry.id) + 1;
  const isNewRecord = rank === 1;

  const topEntries = updated.slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(topEntries));

  // Also update high score record
  if (topEntries.length > 0) {
    localStorage.setItem('coastal_racer_highscore', String(topEntries[0].score));
  }

  return { entry: newEntry, rank, isNewRecord };
}

export function clearLeaderboard(): void {
  localStorage.removeItem(STORAGE_KEY);
}
