// Storage module for persisting race history, per-car records, and player profiles
import { sanitizeProfileData, migrateProfileSchema, generatePlayerId, getRank } from './ui/sanitize.js';

const HISTORY_KEY = 'raceHistory';
const RECORDS_KEY = 'carRecords';
const PROFILE_KEY = 'playerProfile';
const LIFETIME_STATS_KEY = 'lifetimeStats';
const PLAYER_ID_KEY = 'playerId';

// ── Player ID (stable per device) ────────────────────────────
let _playerIdCache = null;

/**
 * Get or create a stable player ID for this device.
 * Generated once and persisted — survives profile edits.
 * Used for leaderboard dedup and multiplayer identity.
 */
export async function getPlayerId() {
  if (_playerIdCache) return _playerIdCache;
  try {
    let id = await window.miniappsAI.storage.getItem(PLAYER_ID_KEY);
    if (!id || typeof id !== 'string' || !/^plr_[a-z0-9]{8,}$/.test(id)) {
      id = generatePlayerId();
      await window.miniappsAI.storage.setItem(PLAYER_ID_KEY, id);
    }
    _playerIdCache = id;
    return id;
  } catch {
    const id = generatePlayerId();
    _playerIdCache = id;
    return id;
  }
}

// ── Lifetime Stats (persistent counters, never shrink) ─────
let _lifetimeCache = null;


// ── Race History ──────────────────────────────────────────────

export async function loadHistory() {
  try {
    const raw = await window.miniappsAI.storage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveRace(raceData) {
  try {
    const history = await loadHistory();
    history.unshift({
      ...raceData,
      timestamp: Date.now(),
    });
    // Keep last 20 races
    const trimmed = history.slice(0, 20);
    await window.miniappsAI.storage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
    // Update lifetime counters (never shrink)
    await addLifetimeRace(raceData);
    return trimmed;
  } catch (e) {
    console.warn('Could not save race history:', e);
    return [];
  }
}

// ── Lifetime counters — persistent across all time ──────────

async function loadLifetimeStats() {
  if (_lifetimeCache) return _lifetimeCache;
  try {
    const raw = await window.miniappsAI.storage.getItem(LIFETIME_STATS_KEY);
    _lifetimeCache = raw ? JSON.parse(raw) : { wins: 0, races: 0 };
  } catch {
    _lifetimeCache = { wins: 0, races: 0 };
  }
  return _lifetimeCache;
}

async function saveLifetimeStats(stats) {
  _lifetimeCache = stats;
  try {
    await window.miniappsAI.storage.setItem(LIFETIME_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.warn('Could not save lifetime stats:', e);
  }
}

async function addLifetimeRace(raceData) {
  const stats = await loadLifetimeStats();
  if (!raceData.jumped) {
    stats.races += 1;
    if (raceData.won) stats.wins += 1;
  }
  await saveLifetimeStats(stats);
  return stats;
}

export function getStats(history) {
  const valid = history.filter(r => !r.jumped);
  const wins = valid.filter(r => r.won).length;
  const total = valid.length;
  const bestTime = total > 0
    ? Math.min(...valid.map(r => r.playerTime))
    : null;
  return { wins, total, bestTime };
}

/**
 * Get the REAL lifetime wins/total — not limited to 20-entry history.
 * Falls back to history count if lifetime stats haven't been initialized yet.
 */
export async function getLifetimeStats(history) {
  const lifetime = await loadLifetimeStats();
  // If lifetime has data, use it (authoritative)
  if (lifetime.races > 0) {
    // Best time still comes from history (last 20)
    const valid = history.filter(r => !r.jumped);
    const bestTime = valid.length > 0
      ? Math.min(...valid.map(r => r.playerTime))
      : null;
    return { wins: lifetime.wins, total: lifetime.races, bestTime };
  }
  // Fallback: use history-based count (for users who played before this update)
  return getStats(history);
}

// ── Per-Car Records ──────────────────────────────────────────

export async function loadCarRecords() {
  try {
    const raw = await window.miniappsAI.storage.getItem(RECORDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveCarRecord(carId, time) {
  try {
    const records = await loadCarRecords();
    const isNew = !records[carId] || time < records[carId];
    if (isNew) {
      records[carId] = time;
      await window.miniappsAI.storage.setItem(RECORDS_KEY, JSON.stringify(records));
    }
    return { records, isNew };
  } catch (e) {
    console.warn('Could not save car record:', e);
    return { records: {}, isNew: false };
  }
}

// ── Player Profile (sanitized & migrated) ────────────────────

export async function loadProfile() {
  try {
    const raw = await window.miniappsAI.storage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migrate schema if needed
    const migrated = migrateProfileSchema(parsed);
    if (migrated && migrated !== parsed) {
      // Persist the migrated version
      await window.miniappsAI.storage.setItem(PROFILE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return null;
  }
}

/**
 * Save profile with full sanitization.
 * Rejects invalid data and returns sanitized profile or null on error.
 */
export async function saveProfile(profile) {
  try {
    const { profile: sanitized, errors } = sanitizeProfileData(profile);
    if (errors.length > 0 || !sanitized) {
      console.warn('Profile save rejected:', errors);
      return { success: false, errors };
    }
    await window.miniappsAI.storage.setItem(PROFILE_KEY, JSON.stringify(sanitized));
    return { success: true, profile: sanitized };
  } catch (e) {
    console.warn('Could not save profile:', e);
    return { success: false, errors: ['storage.error'] };
  }
}

/**
 * Sync profile stats from race history.
 * Updates wins, races count, rank, and ensures profile stays in sync.
 */
export async function syncProfileStats(stats) {
  try {
    const profile = await loadProfile();
    if (!profile) return;
    const newWins = stats.wins || 0;
    const newRaces = stats.total || 0;
    const currentWins = profile.wins || 0;
    const currentRaces = profile.races || 0;
    // Never overwrite with stale/lower values — only update if stats grew
    // This prevents syncProfileStats(stats_with_0) from wiping out profile data
    if (newWins < currentWins && currentWins > 0) return profile;
    if (newRaces < currentRaces && currentRaces > 0) return profile;
    const updated = {
      ...profile,
      wins: Math.max(newWins, currentWins),
      races: Math.max(newRaces, currentRaces),
      rank: getRank(Math.max(newWins, currentWins)),
      updatedAt: Date.now(),
    };
    const result = await saveProfile(updated);
    return result.success ? result.profile : null;
  } catch (e) {
    console.warn('Could not sync profile stats:', e);
    return null;
  }
}
