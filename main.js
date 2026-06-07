import { renderCarSelect } from './ui/car-select-view.js';
import { renderDealer } from './ui/dealer-view.js';
import { renderRaceSetup } from './ui/race-view.js';
import { renderResults } from './ui/results-view.js';
import { runRace, loadEngineDamage, repairEngine, getEngineDamage } from './game.js';
import { CARS } from './cars.js';
import { loadHistory, saveRace, getStats, getLifetimeStats, loadCarRecords, saveCarRecord, syncProfileStats, getPlayerId } from './storage.js';
import { sanitizeNickname, sanitizeColor, getRank } from './ui/sanitize.js';
import { getState, setCurrentPlayer } from './lobby/state.js';
import { renderLobby, setRaceCallback, cleanupLobby } from './lobby/view.js';
import {
  hasProfile, getProfile, updateProfile, buildShareData,
  getShareUrl, checkForSharedProfile,
  renderProfileSetup, renderProfileModal,
  showSharedProfileBanner,
} from './ui/profile-view.js';
import { initI18n, renderLangToggle, removeLangToggle } from './i18n.js';
import { submitLeaderboardEntry } from './supabase.js';
import { initEconomy, loadWallet, loadGarage, getBalance, getOwnedCars, applyRaceStake, buyCar, calculateRaceReward } from './economy.js';
import { renderWalletBadge, showTransactionHistory, hideTransactionHistory } from './ui/economy-view.js';
import { getTransactionLog } from './economy.js';
import { initParts, applyUpgrades, installPart, removeInstalledParts, getPartById } from './parts.js';
import { renderPartsShop } from './ui/parts-view.js';
import { spendMoney, logTransaction } from './economy.js';

const t = (key, vals) => window.miniappI18n?.t(key, vals) ?? key;

document.addEventListener('DOMContentLoaded', async () => {
  const root = document.getElementById('app');
  let cleanupRace = null;
  let sessionPlayer = null;

  // Mutable stats — updated after each race
  let history = await loadHistory();
  let stats = await getLifetimeStats(history);
  let carRecords = await loadCarRecords();
  let pendingSave = null; // Tracks background save promise for race-result persistence

  // ── Economy ────────────────────────────────────────────────
  await initEconomy(stats);
  await initParts();
  await loadEngineDamage();
  let wallet = await loadWallet();
  let garage = await loadGarage();
  let balance = wallet?.balance ?? 5000;
  let ownedCars = garage?.ownedCars || ['civic95'];

  // ── i18n — custom system with working language toggle ───────
  await initI18n(() => {
    refreshStats().then(() => showCarSelect(stats, carRecords));
  });

  // ── Helper: reload all stats from storage ───────────────────
  async function refreshStats() {
    // Wait for any in-flight background save before reloading from storage
    if (pendingSave) { try { await pendingSave; } catch {} pendingSave = null; }
    history = await loadHistory();
    stats = await getLifetimeStats(history);
    carRecords = await loadCarRecords();
    // Reload economy data
    wallet = await loadWallet();
    garage = await loadGarage();
    balance = wallet?.balance ?? balance;
    ownedCars = garage?.ownedCars || ownedCars;
  }

  // ── Check for shared profile in URL ────────────────────────
  const sharedProfile = checkForSharedProfile();
  if (sharedProfile) {
    // Clear hash silently
    window.history.replaceState('', document.title, window.location.pathname + window.location.search);
    // Save to sessionStorage for display
    try { sessionStorage.setItem('_sharedProfile', JSON.stringify(sharedProfile)); } catch {}
  }

  // Check sessionStorage for shared profile (from URL hash)
  let pendingShared = null;
  try {
    const raw = sessionStorage.getItem('_sharedProfile');
    if (raw) {
      pendingShared = JSON.parse(raw);
      sessionStorage.removeItem('_sharedProfile');
    }
  } catch {}

  showCarSelect(stats, carRecords);

  // Show shared profile banner after a brief delay (so car select renders first)
  if (pendingShared) {
    setTimeout(() => {
      showSharedProfileBanner(root, pendingShared, null);
    }, 600);
  }

  // ── Car Select ──────────────────────────────────────────────
  async function showCarSelect(currentStats, currentRecords) {
    if (cleanupRace) { cleanupRace(); cleanupRace = null; }
    cleanupLobby();

    // Build profile bar HTML if profile exists
    let profileBarHtml = '';
    const profileExists = await hasProfile();
    if (profileExists) {
      // Sync profile stats BEFORE rendering — ensures wins/races are fresh
      await syncProfileStats(currentStats).catch(() => {});
      const profile = await getProfile();
      profileBarHtml = buildProfileBarHtml(profile, currentRecords, currentStats);
    } else {
      // Show setup prompt for new users
      profileBarHtml = buildSetupPromptHtml();
    }

    // Build economy data for car select
    const economyData = {
      balance,
      ownedCars,
      onWalletClick: () => showTransactionHistory(getTransactionLog()),
      onBuy: async (car) => {
        const result = await buyCar(car.id);
        if (result.success) {
          balance = result.wallet.balance;
          ownedCars = result.ownedCars;
          showCarSelect(currentStats, currentRecords);
        }
      },
    };

    renderCarSelect(root, (car) => enterLobby(car), currentRecords, profileBarHtml, economyData, () => showDealer(currentStats, currentRecords), (car) => showPartsShop(car, currentStats, currentRecords));
    updateStatsFooter(currentStats);

    // Show language toggle only on car select screen
    renderLangToggle(root, () => refreshStats().then(() => showCarSelect(stats, carRecords)));

    // Wire profile bar click
    const bar = root.querySelector('.profile-card-bar');
    if (bar) {
      bar.addEventListener('click', () => openProfile(root, currentStats, currentRecords));
      bar.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openProfile(root, currentStats, currentRecords);
        }
      });
    }
  }

  function buildProfileBarHtml(profile, records, liveStats) {
    const color = sanitizeColor(profile.color);
    const nickname = sanitizeNickname(profile.nickname || '').value || 'Racer';
    const wins = liveStats?.wins ?? profile.wins ?? 0;
    const rank = profile.rank || getRank(wins);
    const allTimes = Object.values(records || {});
    const bestTime = allTimes.length > 0 ? Math.min(...allTimes) : null;

    return `
      <div class="profile-card-bar" tabindex="0" role="button"
           aria-label="${t('profile.title')}: ${nickname}">
        <div class="profile-bar-avatar" style="background:${color}">
          ${nickname[0].toUpperCase()}
        </div>
        <div class="profile-bar-info">
          <span class="profile-bar-name">${nickname} <span class="profile-bar-rank" title="${t(rank.key)}">${rank.icon}</span></span>
          <span class="profile-bar-stats">
            🏆 ${wins}${bestTime ? ` · ⚡ ${bestTime.toFixed(3)}s` : ''}
          </span>
        </div>
        <span class="profile-bar-arrow">→</span>
      </div>
    `;
  }

  function buildSetupPromptHtml() {
    return `
      <div class="profile-card-bar" tabindex="0" role="button"
           aria-label="${t('profile.setup')}">
        <div class="profile-bar-avatar" style="background:var(--accent)">
          ?
        </div>
        <div class="profile-bar-info">
          <span class="profile-bar-name">${t('profile.setupTitle')}</span>
          <span class="profile-bar-stats">${t('profile.setupSubtitle')}</span>
        </div>
        <span class="profile-bar-arrow">→</span>
      </div>
    `;
  }

  // ── Open Profile (view or create) ──────────────────────────
  async function openProfile(root, currentStats, currentRecords) {
    const profile = await getProfile();
    if (profile && profile.nickname) {
      // Force-sync profile stats BEFORE reading — ensures wins/races are current
      await syncProfileStats(currentStats).catch(() => {});
      // Re-read profile after sync to get updated wins/races/rank
      const freshProfile = await getProfile() || profile;
      // Build display-friendly data (NOT the compact share array)
      const topTimes = Object.entries(currentRecords || {})
        .map(([carId, time]) => {
          const car = CARS.find(c => c.id === carId);
          return { n: car ? car.name : carId, t: Number(time) || 0 };
        })
        .filter(e => e.t > 0)
        .sort((a, b) => a.t - b.t)
        .slice(0, 3);
      // Use live stats for wins/races (authoritative), profile for identity
      const liveWins = currentStats.wins ?? freshProfile.wins ?? 0;
      const liveRaces = currentStats.total ?? freshProfile.races ?? 0;
      // Rank must be calculated from liveWins, not stored rank
      const liveRank = getRank(liveWins);
      const displayData = { ...freshProfile, n: freshProfile.nickname, c: freshProfile.color, w: liveWins, r: liveRaces, t: topTimes, rank: liveRank, liveWins, liveRaces };
      renderProfileModal(displayData, true, {
        onEdit: () => editProfile(root, currentStats, currentRecords),
        onShare: () => shareProfile(freshProfile, currentRecords),
      });
    } else {
      // First time — show setup
      renderProfileSetup(root, profile, async (updates) => {
        const newProfile = await updateProfile({
          ...updates,
          wins: currentStats.wins || 0,
          races: currentStats.total || 0,
          createdAt: Date.now(),
        });
        // Refresh stats from storage before re-showing — prevents
        // syncProfileStats from overwriting the just-created profile
        await refreshStats();
        showCarSelect(stats, carRecords);
      });
    }
  }

  // ── Edit Profile ───────────────────────────────────────────
  function editProfile(root, currentStats, currentRecords) {
    getProfile().then(profile => {
      renderProfileSetup(root, profile, async (updates) => {
        await updateProfile(updates);
        // MUST refresh stats before showing car select — otherwise
        // syncProfileStats inside showCarSelect overwrites the
        // freshly-saved profile with stale closure stats.
        await refreshStats();
        showCarSelect(stats, carRecords);
      });
    });
  }

  // ── Share Profile ──────────────────────────────────────────
  async function shareProfile(profile, records) {
    const url = getShareUrl(profile, records);
    if (!url) return;

    // Try native share first (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.nickname} — La Calle Racing`,
          text: `🏎️ La Calle Racing`,
          url: url,
        });
        return;
      } catch (e) {
        // User cancelled or not supported — fall through to copy
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(url);
      const resultEl = document.getElementById('profileShareResult');
      if (resultEl) {
        resultEl.innerHTML = `<span class="share-success">✅ ${t('profile.shareLinkCopied')}</span>`;
        setTimeout(() => { resultEl.innerHTML = ''; }, 3000);
      }
    } catch (e) {
      // Last resort: show URL in a prompt-like way
      const resultEl = document.getElementById('profileShareResult');
      if (resultEl) {
        resultEl.innerHTML = `<span style="font-size:0.6rem;word-break:break-all;opacity:0.7">${url}</span>`;
      }
    }
  }

  // ── Dealer ──────────────────────────────────────────────────
  async function showDealer(currentStats, currentRecords) {
    if (cleanupRace) { cleanupRace(); cleanupRace = null; }
    cleanupLobby();
    removeLangToggle();

    renderDealer(root, {
      balance,
      ownedCars,
      onBuy: async (car) => {
        const result = await buyCar(car.id);
        if (result.success) {
          balance = result.wallet.balance;
          ownedCars = result.ownedCars;
          showDealer(currentStats, currentRecords);
        }
      },
      onBack: () => showCarSelect(currentStats, currentRecords),
    });
  }

  // ── Parts & Tuning Shop ─────────────────────────────────────
  async function showPartsShop(car, currentStats, currentRecords) {
    if (cleanupRace) { cleanupRace(); cleanupRace = null; }
    cleanupLobby();
    removeLangToggle();

    renderPartsShop(root, car, balance,
      () => showCarSelect(currentStats, currentRecords),
      async (partId) => {
        const part = getPartById(partId);
        if (!part || balance < part.price) return;
        const walletResult = await spendMoney(part.price, 'part_' + partId);
        if (!walletResult) return;
        installPart(car.id, partId);
        balance = walletResult.balance;
        logTransaction('part_buy', -part.price, { carId: car.id, partId });
        showPartsShop(car, currentStats, currentRecords);
      }
    );
  }

  // ── Lobby ───────────────────────────────────────────────────
  async function enterLobby(car) {
    if (cleanupRace) { cleanupRace(); cleanupRace = null; }
    removeLangToggle(); // Only visible on car select screen

    // Get or create session player identity — always sync with profile
    const profile = await getProfile();
    if (!sessionPlayer) {
      const stableId = await getPlayerId();
      sessionPlayer = {
        id: stableId,
        name: sanitizeNickname(profile?.nickname || '').value || 'Corredor_' + Math.random().toString(36).slice(2, 5).toUpperCase(),
        color: sanitizeColor(profile?.color),
      };
    } else if (profile?.nickname) {
      // Always update name/color from profile — reflects edits in real-time
      sessionPlayer.name = sanitizeNickname(profile.nickname).value || sessionPlayer.name;
      sessionPlayer.color = sanitizeColor(profile.color || sessionPlayer.color);
    }

    // Always use current stats.wins
    setCurrentPlayer({
      ...sessionPlayer,
      carId: car.id,
      wins: stats.wins,
    });

    renderLobby(root, getCurrentPlayer(), carRecords, () => {
      cleanupLobby();
      // Reload stats when returning from lobby
      refreshStats().then(() => showCarSelect(stats, carRecords));
    }, () => refreshStats());

    // Wire race callback — main.js shows results DIRECTLY (no lobby dependency)
    setRaceCallback((opponentCar, onResult, stake) => {
      runLobbyRace(car, opponentCar, (result) => {
        // 1) Show results IMMEDIATELY from main.js (never blocked by lobby/async)
        try {
          showResultsDirect(car, opponentCar, result, stake);
        } catch (e) {
          console.error('[Race] Results render failed:', e);
          // Emergency fallback: reload
          renderEmergencyResult(root, result, car, opponentCar);
        }

        // 2) Notify lobby (for sim/Firebase submission only — non-blocking)
        try { onResult(result); } catch (e) {
          console.error('[Race] Lobby onResult failed:', e);
        }

        // 3) Background: save stats (never blocks results)
        pendingSave = (async () => {
          try {
            const updatedHistory = await saveRace(result);
            const newStats = await getLifetimeStats(updatedHistory);
            stats = newStats;
            if (result.won && !result.jumped) sessionPlayer.wins = newStats.wins;
            if (!result.jumped) {
              try {
                const recordResult = await saveCarRecord(car.id, result.playerTime);
                carRecords = recordResult.records;
              } catch {}
            }
            updateStatsFooter(newStats);
            syncProfileStats(newStats).catch(() => {});
            // ── Apply economy rewards ──
            try {
              const oppName = opponentCar.name || opponentCar.id;
              const newRecord = !result.jumped && checkIsNewRecord(car.id, result.playerTime);
              const appliedEarnings = await applyRaceStake(result, stake, car.id, opponentCar.id, oppName, newRecord);
              // Clean up installed parts if car was lost in pink slip
              if (appliedEarnings.pinkSlipLost) {
                removeInstalledParts(appliedEarnings.pinkSlipLost);
              }
              // Reload economy data
              wallet = await loadWallet();
              garage = await loadGarage();
              balance = wallet?.balance ?? balance;
              ownedCars = garage?.ownedCars || ownedCars;
            } catch (econErr) {
              console.error('[Race] Economy reward failed:', econErr);
            }
            const profile = await getProfile().catch(() => null);
            if (!result.jumped && profile?.nickname) {
              const pid = profile.playerId || await getPlayerId().catch(() => null);
              console.log(`[Race] Submitting leaderboard: car=${car.id}, time=${result.playerTime?.toFixed(3)}s, player=${profile.nickname}, pid=${pid}`);
              submitLeaderboardEntry(car.id, result.playerTime, profile.nickname, profile.color || '#00ff88', pid)
                .then(ok => { console.log(`[Race] Leaderboard result: ${ok}`); })
                .catch(e => { console.error('[Race] Leaderboard submit error:', e); });
            } else {
              console.log(`[Race] Skipping leaderboard: jumped=${result.jumped}, hasProfile=${!!profile?.nickname}`);
            }
          } catch (e) {
            console.error('[Race] Background save failed:', e);
          }
        })();
      });
    });
  }

  function getCurrentPlayer() {
    return getState().currentPlayer;
  }

  // ── Race (called from lobby challenge) ──────────────────────
  function runLobbyRace(playerCar, opponentCar, onResult) {
    const upgradedCar = applyUpgrades(playerCar);
    renderRaceSetup(root, upgradedCar, opponentCar);
    cleanupRace = runRace(upgradedCar, opponentCar, (result) => {
      try { onResult(result); } catch (e) {
        console.error('[Race] runLobbyRace onResult error:', e);
      }
    });
  }

  // ── Show results DIRECTLY from main.js — no lobby dependency ──
  function showResultsDirect(playerCar, opponentCar, result, stake) {
    const isNewRecord = !result.jumped && checkIsNewRecord(playerCar.id, result.playerTime);

    const earnings = calculateRaceReward(result, stake, isNewRecord);

    renderResults(root, {
      playerTime: result.playerTime,
      opponentTime: result.opponentTime,
      playerReaction: result.playerReaction,
      playerShifts: result.playerShifts,
      won: result.won,
      jumped: result.jumped,
      playerCar,
      opponent: opponentCar,
      engineDamage: result.engineDamage ?? 0,
      engineBlown: result.engineBlown ?? false,
    },
    // onPlayAgain: re-enter lobby with same car
    () => { cleanupLobby(); enterLobby(playerCar); },
    // onNewCar: go to car select
    () => { cleanupLobby(); refreshStats().then(() => showCarSelect(stats, carRecords)); },
    isNewRecord,
    // onBackToLobby: re-enter lobby with same car
    () => { cleanupLobby(); enterLobby(playerCar); },
    // earnings from economy
    earnings
    );

    // Verify buttons exist after 100ms — emergency fallback if not
    setTimeout(() => {
      const btn = document.getElementById('newCarBtn');
      if (!btn) {
        console.error('[Race] No result buttons found! Emergency fallback.');
        renderEmergencyResult(root, result, playerCar, opponentCar);
      }
    }, 100);
  }

  function checkIsNewRecord(carId, time) {
    const current = carRecords[carId];
    return !current || time < current;
  }

  // Emergency result rendering — always works
  function renderEmergencyResult(root, result, playerCar, opponentCar) {
    try {
      root.innerHTML = `
        <div class="screen results-screen">
          <div class="result-banner ${result.won ? 'win' : 'lose'}">
            <span class="result-emoji">${result.jumped ? '🚨' : result.won ? '🏆' : '💨'}</span>
            <h2 class="result-title">${result.jumped ? t('results.falseStart') : result.won ? t('results.youWon') : t('results.youLost')}</h2>
          </div>
          <div class="result-cards">
            <div class="result-card">
              <h3>${playerCar.name}</h3>
              <p class="result-time">${result.playerTime ? result.playerTime.toFixed(3) + 's' : '---'}</p>
            </div>
            <div class="result-card">
              <h3>${opponentCar.name}</h3>
              <p class="result-time">${result.opponentTime ? result.opponentTime.toFixed(3) + 's' : '---'}</p>
            </div>
          </div>
          <div class="result-actions">
            <button type="button" class="btn btn-primary" id="newCarBtn">${t('results.newCar')}</button>
          </div>
        </div>
      `;
      document.getElementById('newCarBtn')?.addEventListener('click', () => { cleanupLobby(); refreshStats().then(() => showCarSelect(stats, carRecords)); });
    } catch (e2) {
      console.error('[Race] Emergency render also failed:', e2);
      root.innerHTML = '<div style="padding:20px;text-align:center"><h2 style="color:#00ff88">' + (result.won ? '¡GANASTE!' : 'PERDISTE') + '</h2><button onclick="window.location.reload()" style="padding:12px 24px;font-size:1rem;background:#ff2d2d;color:#fff;border:none;border-radius:10px;cursor:pointer">Reload</button></div>';
    }
  }

  function updateStatsFooter(s) {
    let footer = document.getElementById('statsFooter');
    if (!footer) {
      footer = document.createElement('div');
      footer.id = 'statsFooter';
      footer.className = 'stats-footer';
      root.parentElement.appendChild(footer);
    }
    footer.innerHTML = s.total > 0 ? `
      <div class="stats-row">
        <span>🏁 ${t('stats.races')}: <strong>${s.total}</strong></span>
        <span>🏆 ${t('stats.wins')}: <strong>${s.wins}</strong></span>
        ${s.bestTime ? `<span>⚡ ${t('stats.best')}: <strong>${s.bestTime.toFixed(3)}s</strong></span>` : ''}
      </div>
    ` : '';
  }
});
