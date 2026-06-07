import { showStakePicker, renderStakeInfo, hideStakePicker } from '../ui/economy-view.js';
import { getBalance, getOwnedCars } from '../economy.js';
// Lobby view — dual-mode: Firebase real players + local bot simulation
import { CARS } from '../cars.js';
import { t } from '../ui/dom.js';
import {
  getState, setState, getPlayers,
  setPlayers, setMessages, setChallenges,
  setConnected, setLoading,
} from './state.js';
import {
  initLobbyMsgs, getLobbyMsgs, addLobbyMsg,
  cleanupOldLobbyMsgs, clearLobbyMsgs,
} from './lobby-state.js';
// Supabase (real multiplayer)
import {
  initFirebase, isFirebaseReady, getLastConnectionError,
  healthCheck as fbHealthCheck, reconnect as fbReconnect,
  onConnectionChange as fbOnConnectionChange,
  joinLobby as fbJoin, leaveLobby as fbLeave,
  watchConnection as fbWatchConn, watchPlayers as fbWatchPlayers,
  watchMessages as fbWatchMsgs, watchChallenges as fbWatchChallenges,
  sendMessage as fbSendMsg, sendChallenge as fbSendChallenge,
  respondChallenge as fbRespond, createRace as fbCreateRace,
  submitRaceResult as fbSubmitResult, finishRace as fbFinishRace,
  watchRace as fbWatchRace, cleanupOldChallenges as fbCleanup,
  cleanupOldPlayers as fbCleanupPlayers,
  watchRacesForChallenge as fbWatchRacesForChallenge,
  broadcastRaceEvent as fbBroadcastRaceEvent,
  watchRaceFeed as fbWatchRaceFeed,
  findRaceForChallenge as fbFindRaceForChallenge,
  fetchMyChallenges as fbFetchMyChallenges,
  fetchIncomingChallenges as fbFetchIncomingChallenges,
  fetchRaceResults as fbFetchRaceResults,
  deleteChallenge as fbDeleteChallenge,
  // Global race sync
  createLobbyRace as fbCreateLobbyRace,
  updateLobbyRaceStatus as fbUpdateLobbyRaceStatus,
  deleteLobbyRace as fbDeleteLobbyRace,
  cleanupOldLobbyRaces as fbCleanupOldLobbyRaces,
  watchLobbyRaces as fbWatchLobbyRaces,
  claimHost as fbClaimHost,
  releaseHost as fbReleaseHost,
} from '../supabase.js';
// Local simulation (bots)
import {
  initSimulation, stopSimulation,
  watchConnection as simWatchConn, watchPlayers as simWatchPlayers,
  watchMessages as simWatchMsgs, watchChallenges as simWatchChallenges,
  sendMessage as simSendMsg, sendChallenge as simSendChallenge,
  respondChallenge as simRespond, createRace as simCreateRace,
  submitRaceResult as simSubmitResult, finishRace as simFinishRace,
  watchRace as simWatchRace, leaveLobby as simLeave,
  setRealPlayerCount as simSetRealPlayerCount,
  broadcastRaceEvent as simBroadcastRaceEvent,
  watchRaceFeed as simWatchRaceFeed,
  getBotSkill as simGetBotSkill,
  getBotBuild as simGetBotBuild,
  cancelChallenge as simCancelChallenge,
  setPlayerInRace as simSetPlayerInRace,
  getPinkSlipBuild as simGetPinkSlipBuild,
  // Queue system
  watchQueue as simWatchQueue,
  watchAnnouncements as simWatchAnnouncements,
  watchRaceResults as simWatchRaceResults,
  getQueueState as simGetQueueState,
  enqueuePlayerRace as simEnqueuePlayerRace,
  setPlayerRaceReady as simSetPlayerRaceReady,
  finishPlayerRace as simFinishPlayerRace,
  getEnrichedBotCar as simGetEnrichedBotCar,
  // Global sync
  setIsHost as simSetIsHost,
  getIsHost as simGetIsHost,
  setOnGlobalRaceStart as simSetOnGlobalRaceStart,
  injectGlobalRace as simInjectGlobalRace,
} from './sim.js';
import { applyBuild } from '../parts.js';
// Race engine
import { setRaceEventBroadcaster } from '../game.js';
// Spectator view
import { renderSpectatorView, resetRaceViewState, cameraFollowPlayer, bumperToSpriteLeft, trackWorldHTML, carLayerHTML, positionCarsAtStartLine, FINISH_MARKER_PCT } from '../ui/race-view.js';
// Toast notifications
import { showToast } from '../ui/toast-view.js';
import { sanitizeChatMessage } from '../ui/sanitize.js';

let unsubscribers = [];
let lobbyActive = false;
let lobbyMsgs = [];
let seenFbMsgIds = new Set();
let raceCallback = null;
let onStatsRefreshRef = null;
let lastChallengesSnapshot = '';
let firebaseActive = false;
let realPlayerIds = new Set();
let processedChallenges = new Set();
let challengeCancelCooldownEnd = 0;   // cooldown after cancelling a challenge
let challengeCancelTimerInterval = null;
let lobbyEntryTime = 0;  // only process challenges created after entering lobby
let isHostClient = false; // whether this client is the bot race host

// ── Race-in-progress guard ──────────────────────────────────
let inRace = false;

// ── Economy / Betting state ──────────────────────────────────
let _currentStake = { type: 'fun', amount: 0 };
let _incomingStakes = new Map();

// ── Spectator state ─────────────────────────────────────────
let spectatingActive = false;
let spectatorOverlay = null;
let raceFeedUnsubs = [];
let currentLiveRace = null; // { p1, p2, isBot }
let spectatorCloseTimeout = null; // timeout for auto-closing after race ends
let defaultPlayerCar = null; // store player's car for idle track rendering

// ── Lobby params stored for reconnect ───────────────────────
let _lobbyRoot = null;
let _lobbyCarRecords = null;
let _lobbyOnExit = null;
let _lobbyOnStatsRefresh = null;

const CHALLENGE_CANCEL_COOLDOWN = 8; // seconds to wait after cancelling a challenge

// ── Public API ───────────────────────────────────────────────
export function setRaceCallback(cb) { raceCallback = cb; }

// showResultsCallback kept as no-op for backward compat with main.js
export function setShowResultsCallback() { /* no longer needed */ }

export function cleanupLobby() {
  lobbyActive = false;
  onStatsRefreshRef = null;
  inRace = false;
  simSetPlayerInRace(false);
  simSetIsHost(false);
  simSetOnGlobalRaceStart(null);
  stopSimulation();
  unsubscribers.forEach(fn => { try { fn(); } catch {} });
  unsubscribers = [];
  realPlayerIds.clear();
  isHostClient = false;
  lobbyMsgs = [];
  seenFbMsgIds.clear();
  processedChallenges.clear();
  // Reset economy stakes
  _currentStake = { type: 'fun', amount: 0 };
  _incomingStakes.clear();
  // Clear Firebase challenges — prevents stale accumulation across sessions
  setState({ _fbChallenges: [] });
  lobbyEntryTime = 0;
  clearInterval(challengeCancelTimerInterval);
  challengeCancelCooldownEnd = 0;
  challengeCancelTimerInterval = null;
  // Cleanup spectator
  stopSpectating();
  clearTimeout(spectatorCloseTimeout);
  spectatorCloseTimeout = null;
  raceFeedUnsubs.forEach(fn => { try { fn(); } catch {} });
  raceFeedUnsubs = [];
  currentLiveRace = null;
  defaultPlayerCar = null;
}

// ── Render lobby ─────────────────────────────────────────────
export function renderLobby(root, currentPlayer, carRecords, onExit, onStatsRefresh) {
  cleanupLobby();
  lobbyActive = true;

  // Store params for reconnect
  _lobbyRoot = root;
  _lobbyCarRecords = carRecords;
  _lobbyOnExit = onExit;
  _lobbyOnStatsRefresh = onStatsRefresh || null;

  onStatsRefreshRef = onStatsRefresh || null;

  defaultPlayerCar = CARS.find(c => c.id === currentPlayer.carId) || CARS[0];
  const playerCar = defaultPlayerCar;

  root.innerHTML = `
    <div class="screen lobby-screen">
      ${renderHeader(currentPlayer, playerCar, carRecords)}
      <div class="lobby-connection-status" id="connStatus">
        <span class="lobby-status-loading"></span>
        <span>${t('lobby.connecting')}</span>
      </div>
      <div class="spectator-tv" id="spectatorTV">
        <div class="spectator-tv-screen always-open" id="spectatorTVScreen">
        </div>
      </div>
      <div class="lobby-body-scroll">
        <div class="lobby-race-queue" id="lobbyRaceQueue"></div>
        <div class="lobby-players-section" id="lobbyPlayersSection">
          <div class="lobby-players-scroll" id="lobbyPlayersScroll">
            <div class="lobby-empty-state">${t('lobby.connecting')}</div>
          </div>
        </div>
        <div class="lobby-challenge-queue" id="lobbyChallengeQueue"></div>
        <div class="lobby-chat-area" id="lobbyChatArea">
          <div class="lobby-messages" id="lobbyMessages"></div>
        </div>
        ${renderChatControls()}
      </div>
    </div>
  `;

  wireEvents(root, onExit);
  initIdleTrack();
  connectToLobby(root, currentPlayer);
}

// ── Idle Track — always-visible static track in the TV ──────
function initIdleTrack() {
  const tvScreen = document.querySelector('#spectatorTVScreen');
  if (!tvScreen || !defaultPlayerCar) return;
  // Render the track exactly like an active race
  tvScreen.innerHTML = `
    <div class="spectator-track-wrapper spectator-idle-track">
      <div class="track-area race-track-scrolling track-unified" id="spectatorTrackArea">
        ${trackWorldHTML()}
        ${carLayerHTML(defaultPlayerCar, defaultPlayerCar, '🏁', '🏁')}
      </div>
      <div class="spectator-idle-overlay">
        <span class="spectator-idle-text">${t('lobby.waitingForRace')}</span>
      </div>
    </div>
  `;
  // Position both cars at start line — use rAF to ensure DOM layout is ready
  const trackArea = tvScreen.querySelector('#spectatorTrackArea');
  if (trackArea) {
    requestAnimationFrame(() => positionCarsAtStartLine(trackArea));
  }
}

// ── Header ───────────────────────────────────────────────────
function renderHeader(player, car, carRecords) {
  const record = carRecords[car.id];
  return `
    <div class="lobby-header">
      <div class="lobby-header-top">
        <button type="button" class="lobby-exit-btn" id="exitLobbyBtn" aria-label="${t('lobby.exitLobby')}">←</button>
        <div class="lobby-player-avatar" style="background:${player.color}">
          ${initials(player.name)}
        </div>
        <div class="lobby-header-info">
          <span class="lobby-player-name">${player.name}</span>
          <span class="lobby-player-car">${car.name}</span>
        </div>
        <div class="lobby-stats-pills">
          <span class="lobby-pill lobby-pill-money" id="lobbyBalance">💰 ...</span>
          <span class="lobby-pill lobby-pill-wins">🏆 ${player.wins}</span>
          ${record ? `<span class="lobby-pill lobby-pill-record">⚡ ${record.toFixed(3)}s</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

// ── Chat controls ────────────────────────────────────────────
function renderChatControls() {
  return `
    <div class="lobby-controls">
      <form class="lobby-chat-form" id="lobbyChatForm">
        <input type="text" class="lobby-chat-input" id="lobbyChatInput"
               placeholder="${t('lobby.msg.inputPlaceholder')}" maxlength="200" autocomplete="off">
        <button type="submit" class="lobby-send-btn" id="lobbySendBtn" aria-label="${t('lobby.msg.send')}">➤</button>
      </form>
    </div>
  `;
}

// ── Connect to lobby (dual mode: Firebase + bots) ────────────
async function connectToLobby(root, currentPlayer) {
  setLoading(true);
  setState({ currentPlayer });
  lobbyEntryTime = Date.now();

  // Load persistent local messages from previous sessions
  await initLobbyMsgs();

  // Attempt Firebase connection for real multiplayer
  updateConnectionStatus('testing');
  try {
    firebaseActive = await initFirebase();
  } catch (e) {
    console.warn('Firebase init error:', e);
    firebaseActive = false;
  }

  if (!firebaseActive) {
    const reason = getLastConnectionError();
    showToast(
      reason
        ? t('toast.serverErrorReason', { reason })
        : t('toast.serverError'),
      'warning',
      5000,
      { showDelay: 2500 },
    );
  }

  if (firebaseActive) {
    // Monitor real-time connection status changes
    fbOnConnectionChange((online, error) => {
      if (!lobbyActive) return;
      if (!online) {
        showToast(t('lobby.error.disconnected') || 'Conexión perdida — reconectando...', 'error', 5000, { showDelay: 2500 });
        updateConnectionStatus();
      }
    });

    const unsubConn = fbWatchConn((online) => {
      setConnected(online);
      updateConnectionStatus();
    });
    unsubscribers.push(unsubConn);

    const cleanupFb = await fbJoin(currentPlayer);
    if (cleanupFb) unsubscribers.push(cleanupFb);

    // Aggressive cleanup: purge ALL stale accepted/declined challenges immediately on lobby entry
    // This prevents old challenges from previous sessions from accumulating
    try { await fbCleanup(); } catch {}

    const unsubFbPlayers = fbWatchPlayers((fbPlayers) => {
      const others = fbPlayers.filter(p => p.id !== currentPlayer.id);
      realPlayerIds = new Set(others.map(p => p.id));
      setState({ _fbPlayers: others });
      simSetRealPlayerCount(others.length, others.map(p => p.carId));
      mergeAndRenderPlayers(root);
    });
    unsubscribers.push(unsubFbPlayers);

    const unsubFbMsgs = fbWatchMsgs((fbMsgs) => {
      mergeAndRenderMessages(fbMsgs);
    });
    unsubscribers.push(unsubFbMsgs);

    const unsubFbChallenges = fbWatchChallenges((fbChallenges) => {
      mergeAndRenderChallenges(root, fbChallenges);
    });
    unsubscribers.push(unsubFbChallenges);

    const cleanupInterval = setInterval(() => {
      if (lobbyActive) fbCleanup();
    }, 30000);
    unsubscribers.push(() => clearInterval(cleanupInterval));

    // Poll for accepted challenges as backup to Realtime (every 3s)
    const challengePollInterval = setInterval(async () => {
      if (!lobbyActive) return;
      const state = getState();
      const myId = state.currentPlayer?.id;
      if (!myId) return;
      try {
        const myChallenges = await fbFetchMyChallenges(myId);
        const accepted = myChallenges.filter(c => c.status === 'accepted');
        if (accepted.length > 0) checkMyChallengeAccepted(root, accepted, state.currentPlayer);
      } catch {}
    }, 3000);
    unsubscribers.push(() => clearInterval(challengePollInterval));

    setConnected(true);
    updateConnectionStatus();

    // Periodic connection health check (every 30s)
    const healthCheckInterval = setInterval(async () => {
      if (!lobbyActive || !firebaseActive) return;
      const ok = await fbHealthCheck();
      if (!ok) updateConnectionStatus();
    }, 30000);
    unsubscribers.push(() => clearInterval(healthCheckInterval));

    // ── CRITICAL: Poll for INCOMING challenges (to_id = me) ───
    // Without this, if Realtime is broken, player NEVER sees challenges sent TO them
    const incomingChallengePoll = setInterval(async () => {
      if (!lobbyActive || !firebaseActive) return;
      const state = getState();
      const myId = state.currentPlayer?.id;
      if (!myId) return;
      try {
        const incoming = await fbFetchIncomingChallenges(myId);
        if (incoming.length > 0) updateFbChallenges(root, incoming);
      } catch {}
    }, 3000);
    unsubscribers.push(() => clearInterval(incomingChallengePoll));
  } else {
    setConnected(true);
    updateConnectionStatus();
  }

  // Subscribe to race feed for spectator feature (Firebase)
  if (firebaseActive) {
    const unsubFbFeed = fbWatchRaceFeed((event) => {
      handleRaceFeedEvent(root, event, false);
    });
    raceFeedUnsubs.push(unsubFbFeed);
  }

  // ── Global Race Sync ──────────────────────────────────────
  // Host election: one client generates bot races for everyone
  if (firebaseActive) {
    const myId = currentPlayer.id;
    try {
      // Cleanup old lobby races on entry
      await fbCleanupOldLobbyRaces();

      isHostClient = await fbClaimHost(myId);
      simSetIsHost(isHostClient);
      console.log(`[Lobby] 🏠 Host election: isHost=${isHostClient}`);

      if (isHostClient) {
        // HOST: publish bot races to lobby_races table
        simSetOnGlobalRaceStart((entry) => {
          const raceData = {
            id: entry.id,
            p1: entry.p1,
            p2: entry.p2,
            stake: entry.stake || { type: 'fun', amount: 0 },
            isBot: true,
            creatorId: myId,
          };
          fbCreateLobbyRace(raceData).then(ok => {
            if (ok) console.log(`[Lobby] 📺 Published race ${entry.id} to lobby_races`);
          });
          // Mark as running then finished after ~15s
          fbUpdateLobbyRaceStatus(entry.id, 'running');
          setTimeout(() => {
            fbUpdateLobbyRaceStatus(entry.id, 'finished');
            setTimeout(() => fbDeleteLobbyRace(entry.id), 5000);
          }, 18000);
        });
      } else {
        // NON-HOST: subscribe to lobby_races for spectator
        const unsubGlobalRaces = fbWatchLobbyRaces((globalRaces) => {
          if (!lobbyActive) return;
          // Find races NOT created by this client and not already displayed
          const otherRaces = globalRaces.filter(r =>
            r.creatorId !== myId && r.status !== 'finished'
          );
          // Only show the latest announced/running race
          const active = otherRaces.find(r => r.status === 'announced' || r.status === 'running');
          if (active && !spectatingActive) {
            console.log(`[Lobby] 📺 Found global race: ${active.p1.name} vs ${active.p2.name}`);
            simInjectGlobalRace(active);
          }
        });
        unsubscribers.push(unsubGlobalRaces);
      }

      // Release host on cleanup
      unsubscribers.push(() => {
        if (isHostClient) {
          fbReleaseHost(myId).catch(() => {});
          simSetIsHost(false);
          simSetOnGlobalRaceStart(null);
        }
      });
    } catch (e) {
      console.warn('[Lobby] Host election failed:', e.message);
      simSetIsHost(true); // Fallback: generate local races
    }
  } else {
    // No Firebase: always host (local mode)
    simSetIsHost(true);
  }

  // Always start bot simulation
  const unsubSimConn = simWatchConn(() => {});
  unsubscribers.push(unsubSimConn);

  initSimulation(currentPlayer);

  const unsubSimPlayers = simWatchPlayers((simPlayers) => {
    setPlayers(simPlayers);
    mergeAndRenderPlayers(root);
  });
  unsubscribers.push(unsubSimPlayers);

  const unsubSimMsgs = simWatchMsgs((simMsgs) => {
    setMessages(simMsgs);
    mergeAndRenderMessages(null);
  });
  unsubscribers.push(unsubSimMsgs);

  const unsubSimChallenges = simWatchChallenges((simChallenges) => {
    setChallenges(simChallenges);
    if (lobbyActive) {
      renderMergedChallenges(root);
    }
  });
  unsubscribers.push(unsubSimChallenges);

  // Subscribe to local race feed for spectator
  const unsubSimFeed = simWatchRaceFeed((event) => {
    handleRaceFeedEvent(root, event, true);
  });
  raceFeedUnsubs.push(unsubSimFeed);

  // ── Queue system subscriptions ───────────────────────────
  const unsubQueue = simWatchQueue((queueEntries, activeEntry) => {
    renderQueueSection(queueEntries, activeEntry);
  });
  unsubscribers.push(unsubQueue);

  // Toast announcements before each race
  let _lastAnnounceTime = 0;
  let _lastAnnounceKey = '';
  const unsubAnnounce = simWatchAnnouncements((entry) => {
    const key = `${entry.p1?.id}_${entry.p2?.id}_${entry.createdAt || ''}`;
    const now = Date.now();
    if (key === _lastAnnounceKey && now - _lastAnnounceTime < 4000) return;
    _lastAnnounceKey = key;
    _lastAnnounceTime = now;
    const stakeDesc = buildStakeDescription(entry.stake);
    showToast(
      `🏁 ${entry.p1.name} VS ${entry.p2.name}${stakeDesc}`,
      'info',
      4000
    );
  });
  unsubscribers.push(unsubAnnounce);

  // Result toasts removed — spectator TV shows results inline, main.js shows player results

  setLoading(false);

  // Load wallet balance for header display
  getBalance().then(b => {
    const el = document.getElementById('lobbyBalance');
    if (el) el.textContent = `💰 $${b.toLocaleString()}`;
  }).catch(() => {});

  // Announce arrival in chat
  const arrivalCar = CARS.find(c => c.id === currentPlayer.carId);
  const arrivalCarName = arrivalCar ? arrivalCar.name : 'su ride';
  sendMessageToChannel({
    type: 'system',
    text: t('lobby.msg.arrived', { name: currentPlayer.name, car: arrivalCarName }),
  });
}

// ── Race Feed Event Handler (spectator) ──────────────────────
function handleRaceFeedEvent(root, event, isLocalSim) {
  if (!lobbyActive) return;
  const myId = getState().currentPlayer?.id;

  if (event.type === 'race_announce') {
    if (event.p1?.id === myId || event.p2?.id === myId) return;
    clearTimeout(spectatorCloseTimeout);
    if (spectatingActive) stopSpectating();
    currentLiveRace = event;
    startSpectating();
  } else if (event.type === 'race_start') {
    if (event.p1?.id === myId || event.p2?.id === myId) return;
    currentLiveRace = event;
    if (!spectatingActive) startSpectating();
  } else if (event.type === 'race_end' || event.type === 'false_start') {
    // Snap both cars to finish line before showing result overlay
    // Winner crosses past the line, loser stays just behind
    if (spectatingActive && event.type === 'race_end') {
      const winnerPct = FINISH_MARKER_PCT;
      const loserPct = FINISH_MARKER_PCT - 2.0;
      const winnerLeft = bumperToSpriteLeft(event.won ? winnerPct : loserPct);
      const loserLeft = bumperToSpriteLeft(event.won ? loserPct : winnerPct);
      const plr = spectatorOverlay?.querySelector('#spectatorTrackArea .player-car');
      const opp = spectatorOverlay?.querySelector('#spectatorTrackArea .opponent-car');
      if (plr) plr.style.left = `${winnerLeft}%`;
      if (opp) opp.style.left = `${loserLeft}%`;
      // Follow winner — camera clamped to world boundaries
      cameraFollowPlayer(event.won ? winnerPct : loserPct);
    }
    // Race finished — show result overlay, auto-close after delay
    if (spectatingActive) {
      showSpectatorResult(event);
    }
    clearTimeout(spectatorCloseTimeout);
    spectatorCloseTimeout = setTimeout(() => {
      currentLiveRace = null;
      if (spectatingActive) stopSpectating();
    }, event.type === 'false_start' ? 2000 : 4000);
  } else if (spectatingActive) {
    // Forward frame/light/shift events to spectator view
    handleSpectatorEvent(event);
  }
}

// ── Spectator Overlay ────────────────────────────────────────
function startSpectating() {
  if (spectatingActive || !currentLiveRace) return;
  spectatingActive = true;

  const p1 = currentLiveRace.p1;
  const p2 = currentLiveRace.p2;
  const c1 = CARS.find(c => c.id === p1.carId) || CARS[0];
  const c2 = CARS.find(c => c.id === p2.carId) || CARS[0];

  // Render track into TV screen slot
  const tvScreen = document.querySelector('#spectatorTVScreen');
  if (!tvScreen) { spectatingActive = false; return; }
  tvScreen.innerHTML = '';
  tvScreen.classList.add('active');
  renderSpectatorView(tvScreen, c1, c2, p1.name, p2.name);

  // Set container ref for event handling
  spectatorOverlay = tvScreen;
  // Clear stale DOM refs from any previous spectating session —
  // without this, the 2nd race's frame handler uses detached elements
  // and the camera never moves.
  spectatorOverlay._cachedRefs = null;

  // Position both cars at the start line immediately so they don't appear displaced
  resetRaceViewState();
}

function stopSpectating() {
  if (!spectatingActive) return;
  spectatingActive = false;

  // Restore idle track instead of empty state
  initIdleTrack();

  spectatorOverlay = null;
  resetRaceViewState();
}

function handleSpectatorEvent(event) {
  if (!spectatingActive) return;

  switch (event.type) {
    case 'light': {
      const lights = spectatorOverlay?.querySelectorAll('.light');
      if (lights && lights[event.index]) {
        lights[event.index].classList.add('on');
      }
      // Fade out lights on green (index 3)
      if (event.index >= 3) {
        const lc = spectatorOverlay?.querySelector('.lights-container');
        if (lc) lc.classList.add('go-anim');
      }
      const instr = spectatorOverlay?.querySelector('#lightInstruction');
      if (instr) {
        instr.textContent = event.index >= 3 ? t('race.go') : t('race.waitForGreen');
      }
      // Update spectator status
      const status = spectatorOverlay?.querySelector('#spectatorStatus');
      if (status && event.index >= 3) status.textContent = t('race.go');
      break;
    }
    case 'frame': {
      if (!spectatorOverlay) break;
      // Cache DOM refs once per spectating session
      if (!spectatorOverlay._cachedRefs) {
        spectatorOverlay._cachedRefs = {
          hudSpeed: spectatorOverlay.querySelector('#hudSpeed'),
          hudGear: spectatorOverlay.querySelector('#hudGear'),
          speedLines: spectatorOverlay.querySelector('#speedLines'),
          pSmoke: spectatorOverlay.querySelector('#playerSmoke'),
          oSmoke: spectatorOverlay.querySelector('#opponentSmoke'),
          status: spectatorOverlay.querySelector('#spectatorStatus'),
          plrSprite: spectatorOverlay.querySelector('.player-car'),
          oppSprite: spectatorOverlay.querySelector('.opponent-car'),
          pWheelR: spectatorOverlay.querySelector('#playerWheelR'),
          pWheelF: spectatorOverlay.querySelector('#playerWheelF'),
          oWheelR: spectatorOverlay.querySelector('#opponentWheelR'),
          oWheelF: spectatorOverlay.querySelector('#opponentWheelF'),
        };
      }
      const ref = spectatorOverlay._cachedRefs;
      const pPct = event.pPct;
      const oPct = event.oPct;

      // Position sprites using shared bumperToSpriteLeft (same as main race view)
      if (ref.plrSprite) ref.plrSprite.style.left = `${bumperToSpriteLeft(pPct)}%`;
      if (ref.oppSprite) ref.oppSprite.style.left = `${bumperToSpriteLeft(oPct)}%`;

      // Camera follows the LEADER — whichever car is further ahead
      const specLeader = Math.max(pPct, oPct);
      cameraFollowPlayer(specLeader);

      if (ref.hudSpeed) ref.hudSpeed.textContent = Math.round(event.pSpd);
      if (ref.hudGear) ref.hudGear.textContent = event.gear > 0 ? event.gear : 'N';

      if (ref.speedLines && (pPct > 5 || oPct > 5)) ref.speedLines.classList.add('active');

      if (pPct < 40) spawnSmokeSpectator(ref.pSmoke);
      if (oPct < 40) spawnSmokeSpectator(ref.oSmoke);

      // Wheel spinning effects — match main race view
      const pSpd = event.pSpd || 0;
      const oSpd = event.oSpd || 0;
      const pWheelsOn = pSpd > 3;
      const pWheelsFast = pSpd > 100;
      [ref.pWheelR, ref.pWheelF].forEach(w => {
        if (w) {
          w.classList.toggle('spinning', pWheelsOn);
          w.classList.toggle('wheel-fast', pWheelsFast);
          w.classList.toggle('wheel-glow', pSpd > 150);
        }
      });
      const oMoving = (oPct - 5) > 1;
      const oWheelsFast = oSpd > 100;
      [ref.oWheelR, ref.oWheelF].forEach(w => {
        if (w) {
          w.classList.toggle('spinning', oMoving);
          w.classList.toggle('wheel-fast', oWheelsFast);
          w.classList.toggle('wheel-glow', oSpd > 150);
        }
      });

      if (ref.status) ref.status.textContent = `⚙ ${event.gear} · ${Math.round(event.pSpd)} km/h`;
      break;
    }
    case 'shift': {
      const trackArea = spectatorOverlay?.querySelector('#spectatorTrackArea');
      if (trackArea) {
        const flash = document.createElement('div');
        flash.className = `shift-feedback shift-${event.quality}`;
        const labels = {
          perfect: `🔥 ${t('race.perfect')}`,
          good: `✓ ${t('race.shiftGood')}`,
          ok: `✓ ${t('race.shifted')}`,
          miss: `✗ ${t('race.missed')}`,
        };
        flash.textContent = labels[event.quality] || event.quality;
        trackArea.appendChild(flash);
        requestAnimationFrame(() => flash.classList.add('show'));
        setTimeout(() => flash.remove(), 900);
      }
      break;
    }
  }
}

function showSpectatorResult(event) {
  if (!spectatorOverlay || !currentLiveRace) return;
  const p1 = currentLiveRace.p1;
  const p2 = currentLiveRace.p2;

  const resultDiv = document.createElement('div');
  resultDiv.className = 'spectator-result-overlay';

  if (event.type === 'false_start') {
    resultDiv.innerHTML = `
      <div class="spectator-result-emoji">🚨</div>
      <div class="spectator-result-title">${t('race.falseStart')}</div>
    `;
  } else {
    const winnerName = event.won ? p1.name : p2.name;
    const winnerColor = event.won ? p1.color : p2.color;
    resultDiv.innerHTML = `
      <div class="spectator-result-emoji">🏆</div>
      <div class="spectator-result-title" style="color:${winnerColor}">${t('spectator.p1Wins', { name: winnerName })}</div>
      <div class="spectator-result-times">
        <span style="color:${p1.color}">${p1.name}: ${event.pTime.toFixed(3)}s</span>
        <span style="color:${p2.color}">${p2.name}: ${event.oTime.toFixed(3)}s</span>
      </div>
    `;
  }

  spectatorOverlay?.appendChild(resultDiv);
  requestAnimationFrame(() => resultDiv.classList.add('spectator-result-visible'));

  // Update status
  const status = spectatorOverlay?.querySelector('#spectatorStatus');
  if (status) {
    if (event.type === 'false_start') {
      status.textContent = t('race.falseStart');
    } else {
      const winnerName = event.won ? p1.name : p2.name;
      status.textContent = `🏆 ${winnerName}`;
    }
  }
}

function spawnSmokeSpectator(container) {
  if (!container) return;
  const puff = document.createElement('div');
  puff.className = 'smoke-puff';
  const size = 8 + Math.random() * 12;
  puff.style.width = `${size}px`;
  puff.style.height = `${size}px`;
  puff.style.left = `${Math.random() * 15}px`;
  puff.style.bottom = `${Math.random() * 8}px`;
  container.appendChild(puff);
  setTimeout(() => puff.remove(), 800);
}

// ── Merge players from both sources ──────────────────────────
function mergeAndRenderPlayers(root) {
  if (!lobbyActive) return;
  const state = getState();

  const botPlayers = (state.players || []).filter(
    p => p.id !== state.currentPlayer?.id && !realPlayerIds.has(p.id)
  );
  const taggedBots = botPlayers.map(p => ({ ...p, _isBot: true }));
  const fbPlayers = (state._fbPlayers || []).filter(p => p.id !== state.currentPlayer?.id);
  const allPlayers = [...fbPlayers, ...taggedBots];

  const headerCountEl = root.querySelector('#headerPlayerCount');
  const container = root.querySelector('#lobbyPlayersScroll');
  if (!container) return;
  const totalOnline = allPlayers.length + 1;
  if (headerCountEl) headerCountEl.textContent = `🏎️ ${totalOnline}`;

  if (allPlayers.length === 0) {
    container.innerHTML = `
      <div class="lobby-empty-state">
        <div class="lobby-empty-icon">🏎️</div>
        <span>${t('lobby.noRivals')}</span>
        <span class="lobby-empty-hint">${t('lobby.waitingForPlayers')}</span>
      </div>
    `;
    return;
  }

  container.innerHTML = allPlayers.map(p => {
    const car = CARS.find(c => c.id === p.carId) || CARS[0];
    let badge;
    if (!p._isBot) {
      badge = '<span class="lobby-real-badge">●</span>';
    } else {
      const skill = simGetBotSkill(p.id);
      if (skill === 'pro') {
        const build = simGetBotBuild(p.id);
        const buildTag = build ? ` <span class="lobby-build-tag">${build.label}</span>` : '';
        badge = `<span class="lobby-pro-badge">PRO ⭐${buildTag}</span>`;
      } else {
        badge = '<span class="lobby-bot-badge">BOT</span>';
      }
    }
    return `
      <div class="lobby-player-card${p._isBot ? (simGetBotSkill(p.id) === 'pro' ? ' lobby-card-bot pro-card' : ' lobby-card-bot') : ' lobby-card-real'}"
           data-player-id="${p.id}" data-is-bot="${!!p._isBot}" tabindex="0" role="button"
           aria-label="${t('lobby.challenge')} ${p.name}">
        <div class="lobby-card-left">
          <div class="lobby-avatar-sm" style="background:${p.color || '#888'}">${initials(p.name)}</div>
          <div class="lobby-card-info">
            <span class="lobby-card-name">${p.name} ${badge}</span>
            <span class="lobby-card-car">${car.name}</span>
          </div>
        </div>
        <div class="lobby-card-right">
          <span class="lobby-card-wins">🏆 ${p.wins || 0}</span>
          <span class="lobby-challenge-btn-label">${t('lobby.challenge')} ⚔</span>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.lobby-player-card').forEach(card => {
    // Visually disable cards while in race
    if (inRace) {
      card.classList.add('lobby-card-cooldown');
      const label = card.querySelector('.lobby-challenge-btn-label');
      if (label) label.textContent = t('lobby.waitingForRace');
    }
    card.addEventListener('click', () => {
      if (inRace) return;
      handleChallenge(card.dataset.playerId, card.dataset.isBot === 'true');
    });
    card.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && !inRace) {
        e.preventDefault();
        handleChallenge(card.dataset.playerId, card.dataset.isBot === 'true');
      }
    });
  });
}

// ── Merge messages from all sources ──────────────────────────
// Sources: lobbyMsgs (persistent local), Firebase (shared DB), sim (bot buffer)
// Key rule: lobbyMsgs is authoritative for current player's own messages.
// Firebase may duplicate them — we dedup by playerId + phraseKey + 5s time window.
function mergeAndRenderMessages(fbMsgs) {
  if (!lobbyActive) return;
  const state = getState();
  const myId = state.currentPlayer?.id;

  if (fbMsgs !== null) {
    for (const m of fbMsgs) {
      if (m.id) seenFbMsgIds.add(m.id);
    }
    // Only track IDs from current fetch cycle (old IDs are irrelevant after time filter)
    // Cap set size to prevent memory leak
    if (seenFbMsgIds.size > 500) {
      const arr = [...seenFbMsgIds];
      seenFbMsgIds = new Set(arr.slice(-300));
    }
    state._fbMessages = fbMsgs;
  }

  const fbMessages = (state._fbMessages || []);
  const simMessages = (state.messages || []);
  const localMsgs = getLobbyMsgs();

  // ── Time window: only show messages from the last 5 minutes ──
  const msgCutoff = Date.now() - 5 * 60 * 1000;

  const recentFb = fbMessages.filter(m => (m.time || 0) >= msgCutoff);
  const recentSim = simMessages.filter(m => (m.time || 0) >= msgCutoff);
  const recentLocal = localMsgs.filter(m => (m.time || 0) >= msgCutoff);

  // Dedup key sets (time window = 5s) — only from recent messages
  const dedupKey = (m) => {
    const sig = m.phraseKey || (m.text || '').slice(0, 40);
    return `${m.playerId || ''}_${sig}_${Math.floor((m.time || 0) / 5000)}`;
  };
  const fbMatchSet = new Set(recentFb.map(dedupKey));
  const localMatchSet = new Set(recentLocal.map(dedupKey));

  // Filter sim: skip if already in Firebase or lobbyMsgs, and only recent
  const simOnly = recentSim.filter(m => {
    if (m.type === 'system') return true;
    const matchKey = dedupKey(m);
    if (fbMatchSet.has(matchKey)) return false;
    if (localMatchSet.has(matchKey)) return false;
    return true;
  });

  // Filter Firebase: skip own player's messages already in lobbyMsgs
  const fbFiltered = recentFb.filter(m => {
    if (m.playerId !== myId) return true;
    const matchKey = dedupKey(m);
    return !localMatchSet.has(matchKey);
  });

  // Combine: lobbyMsgs (own) + Firebase (others) + sim-only (bots)
  const allMessages = [...recentLocal, ...fbFiltered, ...simOnly]
    .sort((a, b) => {
      const ta = typeof a.time === 'number' ? a.time : Date.now();
      const tb = typeof b.time === 'number' ? b.time : Date.now();
      return ta - tb;
    });

  renderMessageList(allMessages);
}

/** Render message array into the chat DOM */
function renderMessageList(allMessages) {
  const container = document.getElementById('lobbyMessages');
  if (!container) return;

  container.innerHTML = allMessages.map(msg => {
    if (msg.type === 'system') {
      return `<div class="lobby-msg lobby-msg-system"><span>${msg.text}</span></div>`;
    }

    const isSelf = msg.playerId === getState().currentPlayer?.id;
    const isBot = !realPlayerIds.has(msg.playerId) && !isSelf;
    const text = msg.phraseKey ? t(msg.phraseKey) : msg.text || '';
    const time = msg.time ? new Date(typeof msg.time === 'number' ? msg.time : Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
    const color = msg.playerColor || '#888';
    const botTag = isBot ? '<span class="lobby-msg-bot-tag">BOT</span>' : '';

    return `
      <div class="lobby-msg ${isSelf ? 'lobby-msg-self' : 'lobby-msg-other'}">
        <div class="lobby-msg-meta">
          <span class="lobby-msg-name" style="color:${color}">${msg.playerName || '?'}${botTag}</span>
          <span class="lobby-msg-time">${time}</span>
        </div>
        <div class="lobby-msg-bubble ${isSelf ? 'lobby-bubble-self' : 'lobby-bubble-other'}"
             ${!isSelf ? `style="border-left:3px solid ${color}"` : ''}>
          ${text}
        </div>
      </div>
    `;
  }).join('');

  // Always auto-scroll to latest
  container.scrollTop = container.scrollHeight;
}

// ── Merge challenges from both sources ───────────────────────

/** Generate random stake for bot challenges */
function generateBotStake(botId, skill) {
  if (skill === 'normal') {
    // Normal bots: only fun or small cash ($100 max) — anti-farming
    const roll = Math.random();
    if (roll < 0.50) return { type: 'fun', amount: 0 };
    return { type: 'cash', amount: 100 };
  }
  // Pro bots: check build — pink slips ONLY for heavy/elite builds
  const build = simGetBotBuild(botId);
  const buildKey = build?.buildKey;
  const isHeavyBuild = buildKey === 'heavy' || buildKey === 'elite';

  const roll = Math.random();
  if (roll < 0.15) return { type: 'fun', amount: 0 };
  if (roll < 0.40) return { type: 'cash', amount: 100 };
  if (roll < 0.65) return { type: 'cash', amount: 500 };
  if (isHeavyBuild) {
    return { type: 'pink', amount: 0, carId: null, _heavyBuild: true };
  }
  // Light/medium pro bot — no pink, offer cash instead
  return { type: 'cash', amount: 500 };
}

function mergeAndRenderChallenges(root, incomingFb) {
  if (!lobbyActive) return;
  const state = getState();

  // REPLACE (not merge) — use DB as source of truth to prevent stale accumulation
  if (incomingFb !== null) {
    state._fbChallenges = incomingFb;
  }

  renderMergedChallenges(root);
}

/** Update Firebase challenges from polling — prune stale, merge fresh. */
function updateFbChallenges(root, incoming) {
  if (!lobbyActive) return;
  const state = getState();
  // Prune challenges from before this lobby session, then merge new
  const fresh = (state._fbChallenges || []).filter(c => !c.createdAt || c.createdAt >= lobbyEntryTime);
  const merged = new Map(fresh.map(c => [c.id, c]));
  for (const ch of incoming) merged.set(ch.id, ch);
  state._fbChallenges = [...merged.values()];
  renderMergedChallenges(root);
}

/** Render merged challenges from both state.challenges (bots) and state._fbChallenges. */
function renderMergedChallenges(root) {
  if (!lobbyActive) return;
  const state = getState();

  const botCh = (state.challenges || []);
  const fbCh = (state._fbChallenges || []);

  // Merge: bot challenges as base, Firebase overrides by ID
  const merged = new Map(botCh.map(c => [c.id, c]));
  for (const ch of fbCh) merged.set(ch.id, ch);
  const allChallenges = [...merged.values()];

  setChallenges(allChallenges);

  // Generate stakes for new incoming bot challenges
  const myId = state.currentPlayer?.id;
  for (const ch of allChallenges) {
    if (ch.toId === myId && !_incomingStakes.has(ch.id)) {
      const isBot = !realPlayerIds.has(ch.fromId);
      if (isBot) {
        const skill = simGetBotSkill(ch.fromId);
        _incomingStakes.set(ch.id, generateBotStake(ch.fromId, skill));
      }
    }
  }

  const snap = JSON.stringify(allChallenges.map(c => c.id + ':' + c.status));
  if (snap !== lastChallengesSnapshot) {
    lastChallengesSnapshot = snap;
    checkMyChallengeAccepted(root, allChallenges, state.currentPlayer);
  }

  renderChallengeCards();
}

// ── Poll for race when MY challenge gets accepted ────────────
// NOTE: The ACCEPTOR creates the race (via handleAccept → waitForFirebaseRace).
// The challenger only POLLS for it. Never creates a duplicate race.
async function checkMyChallengeAccepted(root, challenges, currentPlayer) {
  const accepted = challenges.find(c =>
    c.fromId === currentPlayer.id && c.status === 'accepted' && !processedChallenges.has(c.id)
  );
  if (!accepted) return;
  if (inRace) return; // Already racing — skip

  // Hard filter: ignore challenges created before entering this lobby session
  if (accepted.createdAt && accepted.createdAt < lobbyEntryTime) {
    console.log('[Lobby] Ignoring pre-lobby challenge:', accepted.id);
    processedChallenges.add(accepted.id);
    if (firebaseActive) {
      fbDeleteChallenge(accepted.id).catch(() => {});
    }
    return;
  }

  // Fallback: ignore challenges older than 30 seconds
  const challengeAge = Date.now() - (accepted.createdAt || 0);
  if (challengeAge > 30000) {
    console.log('[Lobby] Ignoring stale accepted challenge:', accepted.id, `(${Math.round(challengeAge/1000)}s old)`);
    processedChallenges.add(accepted.id);
    // Delete stale accepted challenge from DB so it never re-triggers
    if (firebaseActive) {
      fbDeleteChallenge(accepted.id).catch(() => {});
    }
    return;
  }

  // Mark processed IMMEDIATELY to prevent double-processing from multiple triggers
  processedChallenges.add(accepted.id);
  // Delete accepted challenge from DB immediately so it never re-triggers
  if (firebaseActive) {
    fbDeleteChallenge(accepted.id).catch(() => {});
  }

  const isBot = !realPlayerIds.has(accepted.toId);
  const opponentCar = CARS.find(c => c.id === accepted.toCarId) || CARS[0];

  if (isBot) {
    // Route through queue system — player waits in line
    const stateNow = getState();
    const queueEntry = simEnqueuePlayerRace(
      { id: stateNow.currentPlayer.id, name: stateNow.currentPlayer.name, carId: stateNow.currentPlayer.carId, color: stateNow.currentPlayer.color, wins: stateNow.currentPlayer.wins },
      { id: accepted.toId, name: accepted.toName, carId: accepted.toCarId, color: '#888', wins: 0, skill: simGetBotSkill(accepted.toId), buildKey: simGetBotBuild(accepted.toId)?.buildKey },
      _currentStake
    );
    simSetPlayerRaceReady(queueEntry, () => {
      const race = { id: queueEntry.id, player1Id: accepted.fromId, player1Name: accepted.fromName, player2Id: accepted.toId, player2Name: accepted.toName };
      startRace(race, opponentCar, true);
    });
  } else {
    // Route through local queue — works reliably even if Firebase is flaky
    const stateNow = getState();
    const queueEntry = simEnqueuePlayerRace(
      { id: stateNow.currentPlayer.id, name: stateNow.currentPlayer.name, carId: stateNow.currentPlayer.carId, color: stateNow.currentPlayer.color, wins: stateNow.currentPlayer.wins },
      { id: accepted.toId, name: accepted.toName, carId: accepted.toCarId, color: '#888', wins: 0 },
      _currentStake
    );
    simSetPlayerRaceReady(queueEntry, () => {
      const race = { id: queueEntry.id, player1Id: accepted.fromId, player1Name: accepted.fromName, player2Id: accepted.toId, player2Name: accepted.toName };
      startRace(race, opponentCar, false);
    });
  }
}

// ── Queue Display ─────────────────────────────────────────────

function buildStakeDescription(stake) {
  if (!stake || stake.type === 'fun') return '';
  if (stake.type === 'cash') return ` · 💰 $${(stake.amount || 0).toLocaleString()}`;
  if (stake.type === 'pink') return ` · 🚗💨 ${t('economy.pinkSlip')}`;
  return '';
}

function renderQueueSection(queueEntries, activeEntry) {
  const container = document.getElementById('lobbyRaceQueue');
  if (!container) return;

  // Don't show queue if empty and no active race
  if ((!queueEntries || queueEntries.length === 0) && !activeEntry) {
    container.innerHTML = '';
    return;
  }

  let html = '';

  // Active race
  if (activeEntry) {
    const stakeDesc = buildStakeDescription(activeEntry.stake);
    const car1 = CARS.find(c => c.id === activeEntry.p1.carId);
    const car2 = CARS.find(c => c.id === activeEntry.p2.carId);
    html += `
      <div class="queue-card queue-active">
        <div class="queue-header">
          <span class="queue-live-dot"></span>
          <span class="queue-label">${t('lobby.raceStarting')}</span>
        </div>
        <div class="queue-match">
          <span class="queue-p" style="color:${activeEntry.p1.color}">${activeEntry.p1.name}</span>
          <span class="queue-vs">VS</span>
          <span class="queue-p" style="color:${activeEntry.p2.color}">${activeEntry.p2.name}</span>
        </div>
        <div class="queue-details">
          ${car1 ? `<span class="queue-car">${car1.name}</span>` : ''}
          <span class="queue-detail-sep">vs</span>
          ${car2 ? `<span class="queue-car">${car2.name}</span>` : ''}
          ${stakeDesc ? `<span class="queue-stake">${stakeDesc}</span>` : ''}
        </div>
      </div>
    `;
  }

  // Queued races
  queueEntries.forEach((entry, idx) => {
    const stakeDesc = buildStakeDescription(entry.stake);
    html += `
      <div class="queue-card queue-waiting">
        <div class="queue-header">
          <span class="queue-pos">#${idx + 1}</span>
          <span class="queue-label">${t('lobby.queued', { pos: idx + 1 })}</span>
        </div>
        <div class="queue-match">
          <span class="queue-p" style="color:${entry.p1.color}">${entry.p1.name}</span>
          <span class="queue-vs">VS</span>
          <span class="queue-p" style="color:${entry.p2.color}">${entry.p2.name}</span>
          ${stakeDesc ? `<span class="queue-stake">${stakeDesc}</span>` : ''}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function showQueueResultToast(entry, result) {
  if (!entry || !result) return;
  const winnerName = result.won ? entry.p1.name : entry.p2.name;
  const winnerColor = result.won ? entry.p1.color : entry.p2.color;
  const stakeDesc = buildStakeDescription(entry.stake);
  const pTime = result.pTime ? result.pTime.toFixed(3) + 's' : '---';
  const oTime = result.oTime ? result.oTime.toFixed(3) + 's' : '---';

  showToast(
    `🏆 ${winnerName} ${t('lobby.msg.raceWon')} (${pTime} vs ${oTime})${stakeDesc}`,
    'success',
    4000
  );
}

// ── Render player list (delegates to merge) ──────────────────
function renderPlayerList(root) {
  mergeAndRenderPlayers(root);
}

// ── Render messages (delegates to merge) ─────────────────────
function renderMessages() {
  mergeAndRenderMessages(null);
}

// ── Render challenge cards ───────────────────────────────────
function renderChallengeCards() {
  const container = document.getElementById('lobbyChallengeQueue');
  if (!container) return;

  const state = getState();
  const myId = state.currentPlayer?.id;
  const challenges = state.challenges || [];

  // Only show challenges created after entering this lobby session
  const fresh = challenges.filter(c => !c.createdAt || c.createdAt >= lobbyEntryTime);
  const incoming = fresh.filter(c => c.toId === myId && c.status === 'pending');
  const outgoing = fresh.filter(c => c.fromId === myId && c.status === 'pending');
  const accepted = fresh.filter(c =>
    c.status === 'accepted' && (c.fromId === myId || c.toId === myId)
  );

  let html = '';

  incoming.forEach(ch => {
    const fromCar = CARS.find(c => c.id === ch.fromCarId) || CARS[0];
    const isBot = !realPlayerIds.has(ch.fromId);
    let badge;
    if (!isBot) {
      badge = '<span class="lobby-challenge-real-badge">🔴 LIVE</span>';
    } else {
      const skill = simGetBotSkill(ch.fromId);
      if (skill === 'pro') {
        const build = simGetBotBuild(ch.fromId);
        const buildTag = build ? ` <span class="lobby-build-tag lobby-build-tag-sm">${build.label}</span>` : '';
        badge = `<span class="lobby-challenge-pro-badge">PRO ⭐${buildTag}</span>`;
      } else {
        badge = '<span class="lobby-challenge-bot-badge">BOT</span>';
      }
    }
    const stake = _incomingStakes.get(ch.id) || ch.stake || ch._stake || { type: 'fun', amount: 0 };
    const stakeHtml = renderStakeInfo(stake);
    // Store stake for use in handleAccept
    if (ch.stake && !_incomingStakes.has(ch.id)) {
      _incomingStakes.set(ch.id, ch.stake);
    }
    const acceptDisabled = inRace ? 'disabled' : '';
    html += `
      <div class="lobby-challenge-card lobby-challenge-incoming${inRace ? ' lobby-challenge-blocked' : ''}" data-challenge-id="${ch.id}">
        <div class="lobby-challenge-header">
          <span class="lobby-challenge-icon">⚔️</span>
          <span class="lobby-challenge-from" style="color:${ch.fromColor}">${ch.fromName}</span>
          ${badge}
          <span class="lobby-challenge-label">${t('lobby.challengeYou')}</span>
        </div>
        <div class="lobby-challenge-car">${fromCar.name}</div>
        ${stakeHtml}
        <div class="lobby-challenge-actions">
          <button type="button" class="lobby-btn-accept" data-accept="${ch.id}" ${acceptDisabled}>${t('lobby.accept')} 🔥</button>
          <button type="button" class="lobby-btn-decline" data-decline="${ch.id}">${t('lobby.decline')}</button>
        </div>
      </div>
    `;
  });

  outgoing.forEach(ch => {
    const isBot = !realPlayerIds.has(ch.toId);
    const label = isBot ? t('lobby.waitingResponse') : t('lobby.waitingHuman');
    const myStake = _currentStake || { type: 'fun', amount: 0 };
    const myStakeHtml = renderStakeInfo(myStake);
    html += `
      <div class="lobby-challenge-card lobby-challenge-outgoing">
        <div class="lobby-challenge-header">
          <span class="lobby-challenge-icon">⏳</span>
          <span class="lobby-challenge-info">${t('lobby.challenge')} ${ch.toName}...</span>
        </div>
        <div class="lobby-challenge-waiting">${label}</div>
        ${myStakeHtml}
        <div class="lobby-challenge-actions">
          <button type="button" class="lobby-btn-cancel-challenge" data-cancel-challenge="${ch.id}">${t('lobby.cancelChallenge')} ✕</button>
        </div>
      </div>
    `;
  });

  accepted.forEach(ch => {
    html += `
      <div class="lobby-challenge-card lobby-challenge-accepted">
        <div class="lobby-challenge-header">
          <span class="lobby-challenge-icon">🏁</span>
          <span class="lobby-challenge-info">${t('lobby.msg.raceStart', { p1: ch.fromName, p2: ch.toName })}</span>
        </div>
        <div class="lobby-challenge-waiting">${t('lobby.raceStarting')}</div>
      </div>
    `;
  });

  container.innerHTML = html;

  container.querySelectorAll('[data-accept]').forEach(btn => {
    btn.addEventListener('click', () => handleAccept(btn.dataset.accept));
  });
  container.querySelectorAll('[data-decline]').forEach(btn => {
    btn.addEventListener('click', () => handleDecline(btn.dataset.decline));
  });
  container.querySelectorAll('[data-cancel-challenge]').forEach(btn => {
    btn.addEventListener('click', () => handleCancelChallenge(btn.dataset.cancelChallenge));
  });
}

// ── Connection status ────────────────────────────────────────
function updateConnectionStatus(testingState) {
  const el = document.getElementById('connStatus');
  if (!el) return;
  const state = getState();
  
  if (testingState === 'testing') {
    el.innerHTML = `<span class="lobby-status-loading"></span> <span>${t('lobby.connecting')} 🔍</span>`;
    el.className = 'lobby-connection-status lobby-conn-testing';
  } else if (state.connected) {
    if (firebaseActive) {
      el.innerHTML = `<span class="lobby-status-online"></span> <span>${t('lobby.connected')} · ${isHostClient ? '🏠 Host' : '📺 Sync'} · 🔴 ${t('lobby.liveLabel')} · <span id="headerPlayerCount">—</span></span>`;
      el.className = 'lobby-connection-status lobby-conn-online lobby-conn-firebase';
    } else {
      el.innerHTML = `<span class="lobby-status-offline"></span> <span>🤖 ${t('lobby.localMode')} · <span id="headerPlayerCount">—</span> · <button type="button" class="lobby-reconnect-btn" id="reconnectBtn" style="background:var(--accent);color:#000;border:none;border-radius:6px;padding:2px 10px;font-size:0.7rem;font-weight:700;cursor:pointer;margin-left:4px;">⟳ ${t('lobby.retryConnection')}</button></span>`;
      el.className = 'lobby-connection-status lobby-conn-online lobby-conn-local';
      wireReconnectButton();
    }
  } else {
    el.innerHTML = `<span class="lobby-status-offline"></span> <span>${t('lobby.reconnecting')} · <button type="button" class="lobby-reconnect-btn" id="reconnectBtn" style="background:var(--accent);color:#000;border:none;border-radius:6px;padding:2px 10px;font-size:0.7rem;font-weight:700;cursor:pointer;margin-left:4px;">⟳ ${t('lobby.retryConnection')}</button></span>`;
    el.className = 'lobby-connection-status lobby-conn-offline';
    wireReconnectButton();
  }
}

function wireReconnectButton() {
  const btn = document.getElementById('reconnectBtn');
  if (!btn || btn._wired) return;
  btn._wired = true;
  btn.addEventListener('click', () => reconnectToLobby());
}

async function reconnectToLobby() {
  const root = _lobbyRoot;
  const player = getState().currentPlayer;
  if (!root || !player) return;

  updateConnectionStatus('testing');
  showToast(t('lobby.connecting'), 'info', 3000);

  try {
    const ok = await fbReconnect();
    if (ok) {
      firebaseActive = true;
      // Re-render lobby (cleanupLobby + connectToLobby will re-subscribe everything)
      renderLobby(root, player, _lobbyCarRecords, _lobbyOnExit, _lobbyOnStatsRefresh);
      showToast(t('lobby.error.reconnected'), 'success', 3000);
    } else {
      updateConnectionStatus();
      const reason = getLastConnectionError();
      showToast(reason || t('lobby.error.connectionFailed'), 'error', 5000);
    }
  } catch (e) {
    updateConnectionStatus();
    showToast(t('lobby.error.connectionFailed'), 'error', 5000);
  }
}

// ── Actions ──────────────────────────────────────────────────
function handleSendMessage(text) {
  const player = getState().currentPlayer;
  if (!player) return;
  const clean = sanitizeChatMessage(text);
  if (!clean) return;
  const msg = {
    type: 'chat',
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    text: clean,
    time: Date.now(),
  };
  addLobbyMsg(msg);
  simSendMsg(msg);
  if (firebaseActive) {
    fbSendMsg(msg).catch(err => {
      console.warn('[Chat] Firebase send failed:', err.message);
    });
  }
  // Immediately render so the sender sees their own message without waiting for sim callback
  mergeAndRenderMessages(null);
}

// Keep handlePhrase for system/automated messages (race announcements etc.)
function handlePhrase(phraseKey) {
  const player = getState().currentPlayer;
  if (!player) return;
  const msg = {
    type: 'chat',
    playerId: player.id,
    playerName: player.name,
    playerColor: player.color,
    phraseKey,
    time: Date.now(),
  };
  addLobbyMsg(msg);
  simSendMsg(msg);
  if (firebaseActive) {
    fbSendMsg(msg).catch(err => {
      console.warn('[Chat] Firebase send failed:', err.message);
    });
  }
}

async function handleChallenge(targetId, isBot) {
  const state = getState();
  const player = state.currentPlayer;
  if (!player) return;

  // Block challenges while in a race
  if (inRace) return;

  // Block challenges during cancel cooldown
  if (Date.now() < challengeCancelCooldownEnd) return;

  const target = state.players.find(p => p.id === targetId)
    || (state._fbPlayers || []).find(p => p.id === targetId);
  if (!target) return;

  const allChallenges = [...(state.challenges || []), ...(state._fbChallenges || [])];
  const pending = allChallenges.find(c => c.fromId === player.id && c.status === 'pending');
  if (pending) return;

  // Show stake picker, then send challenge
  const ownedCars = await getOwnedCars();
  const balance = await getBalance();
  // Limit stakes based on target bot skill (anti-farming)
  const botSkill = isBot ? simGetBotSkill(targetId) : 'pro';
  const maxCashStake = botSkill === 'normal' ? 100 : 500;
  const allowPink = botSkill !== 'normal';

  showStakePicker(async (stake) => {
    _currentStake = stake;
    handlePhrase('lobby.msg.wannaRace', true);
    if (isBot) {
      await simSendChallenge(player, target);
    } else {
      await fbSendChallenge(player, target, stake);
    }
  }, balance, ownedCars, player.carId, maxCashStake, allowPink);
}

async function handleAccept(challengeId) {
  // Mark as processed IMMEDIATELY (before await) to prevent checkMyChallengeAccepted from double-processing
  processedChallenges.add(challengeId);

  // Block accepting if already in a race
  if (inRace) return;

  const state = getState();
  const allChallenges = [...(state.challenges || []), ...(state._fbChallenges || [])];
  const challenge = allChallenges.find(c => c.id === challengeId);
  if (!challenge) {
    processedChallenges.delete(challengeId);
    return;
  }

  // Set stake from incoming challenge — use ch.stake from Firebase if available
  const incomingStake = _incomingStakes.get(challengeId) || challenge.stake || challenge._stake || { type: 'fun', amount: 0 };
  _currentStake = incomingStake;

  const isChallengerBot = !realPlayerIds.has(challenge.fromId);

  if (isChallengerBot) {
    await simRespond(challengeId, true);
  } else {
    await fbRespond(challengeId, true);
    // Delete accepted challenge from DB to prevent re-trigger
    fbDeleteChallenge(challengeId).catch(() => {});
  }

  handlePhrase('lobby.msg.iWant', true);

  const opponentCar = CARS.find(c => c.id === challenge.fromCarId) || CARS[0];

  if (isChallengerBot) {
    // Route through queue system — player waits in line like everyone else
    const queueEntry = simEnqueuePlayerRace(
      { id: state.currentPlayer.id, name: state.currentPlayer.name, carId: state.currentPlayer.carId, color: state.currentPlayer.color, wins: state.currentPlayer.wins },
      { id: challenge.fromId, name: challenge.fromName, carId: challenge.fromCarId, color: challenge.fromColor, wins: 0, skill: simGetBotSkill(challenge.fromId), buildKey: simGetBotBuild(challenge.fromId)?.buildKey },
      _currentStake
    );
    // When this entry becomes active in the queue, start the actual race
    simSetPlayerRaceReady(queueEntry, () => {
      const race = { id: queueEntry.id, player1Id: state.currentPlayer.id, player1Name: state.currentPlayer.name, player2Id: challenge.fromId, player2Name: challenge.fromName };
      startRace(race, opponentCar, true);
    });
  } else {
    // Route through local queue — Firebase race creation is unreliable for real-player accept
    const queueEntry = simEnqueuePlayerRace(
      { id: state.currentPlayer.id, name: state.currentPlayer.name, carId: state.currentPlayer.carId, color: state.currentPlayer.color, wins: state.currentPlayer.wins },
      { id: challenge.fromId, name: challenge.fromName, carId: challenge.fromCarId, color: challenge.fromColor, wins: 0 },
      _currentStake
    );
    simSetPlayerRaceReady(queueEntry, () => {
      const race = { id: queueEntry.id, player1Id: state.currentPlayer.id, player1Name: state.currentPlayer.name, player2Id: challenge.fromId, player2Name: challenge.fromName };
      startRace(race, opponentCar, false);
    });
  }
}

// ── Wait for human challenger to create Firebase race ────────
function waitForFirebaseRace(challenge, opponentCar) {
  let cleared = false;

  const unsubRaces = fbWatchRacesForChallenge(challenge.id, (raceEntry) => {
    if (cleared || !lobbyActive || !raceEntry) return;
    cleared = true;
    // opponentCar is the challenger's car (from challenge.fromCarId),
    // which is the correct opponent for the accepting player
    startRace(raceEntry, opponentCar, false);
  });
  unsubscribers.push(() => { if (!cleared) unsubRaces(); });

  const fallbackTimer = setTimeout(async () => {
    if (cleared || !lobbyActive) return;
    cleared = true;
    unsubRaces();
    // Check if challenger already created a race before creating a duplicate
    const existingRace = await fbFindRaceForChallenge(challenge.id);
    if (existingRace) {
      startRace(existingRace, opponentCar, false);
    } else {
      const seed = 0.55 + Math.random() * 0.30;
      const race = await fbCreateRace(challenge, opponentCar, seed);
      if (race) startRace(race, opponentCar, false);
    }
  }, 5000);
  unsubscribers.push(() => { if (!cleared) clearTimeout(fallbackTimer); });
}

async function handleDecline(challengeId) {
  const state = getState();
  const allChallenges = [...(state.challenges || []), ...(state._fbChallenges || [])];
  const challenge = allChallenges.find(c => c.id === challengeId);
  if (!challenge) return;

  const isBot = !realPlayerIds.has(challenge.fromId);
  if (isBot) {
    await simRespond(challengeId, false);
  } else {
    await fbRespond(challengeId, false);
    // Delete declined challenge from DB to prevent accumulation
    fbDeleteChallenge(challengeId).catch(() => {});
  }
}

// ── Cancel Challenge ─────────────────────────────────────────
async function handleCancelChallenge(challengeId) {
  const state = getState();
  const allChallenges = [...(state.challenges || []), ...(state._fbChallenges || [])];
  const challenge = allChallenges.find(c => c.id === challengeId);
  if (!challenge) return;

  // Only cancel outgoing (from me) pending challenges
  if (challenge.fromId !== state.currentPlayer?.id || challenge.status !== 'pending') return;

  const isBot = !realPlayerIds.has(challenge.toId);
  if (isBot) {
    simCancelChallenge(challengeId);
  } else {
    // For Firebase challenges, just mark as declined
    await fbRespond(challengeId, false);
  }

  // Reset current stake
  _currentStake = { type: 'fun', amount: 0 };

  // Start cancel cooldown — prevent immediate re-challenge spam
  challengeCancelCooldownEnd = Date.now() + CHALLENGE_CANCEL_COOLDOWN * 1000;
  startCancelCooldownTimer();
}

function startCancelCooldownTimer() {
  clearInterval(challengeCancelTimerInterval);
  challengeCancelTimerInterval = setInterval(() => {
    const remaining = Math.ceil((challengeCancelCooldownEnd - Date.now()) / 1000);
    if (remaining <= 0) {
      challengeCancelCooldownEnd = 0;
      clearInterval(challengeCancelTimerInterval);
      challengeCancelTimerInterval = null;
      // Re-render player cards to re-enable challenge buttons
      const root = document.getElementById('app');
      if (root) mergeAndRenderPlayers(root);
      return;
    }
    // Disable player card challenge buttons during cooldown
    const cards = document.querySelectorAll('.lobby-player-card');
    cards.forEach(card => {
      card.classList.add('lobby-card-cooldown');
      const label = card.querySelector('.lobby-challenge-btn-label');
      if (label) label.textContent = `${remaining}s`;
    });
  }, 500);
}

// ── Start race ───────────────────────────────────────────────
function startRace(race, opponentCar, isBotRace) {
  if (!raceCallback || !lobbyActive) return;
  if (inRace) return; // Prevent double-start from async polling

  // Lock the lobby — one race at a time
  inRace = true;
  simSetPlayerInRace(true);

  // Auto-decline all pending incoming challenges (queue management)
  const statePre = getState();
  const myIdPre = statePre.currentPlayer?.id;
  const pendingIncoming = [...(statePre.challenges || []), ...(statePre._fbChallenges || [])]
    .filter(c => c.toId === myIdPre && c.status === 'pending');
  for (const ch of pendingIncoming) {
    const isBotCh = !realPlayerIds.has(ch.fromId);
    if (isBotCh) { try { simRespond(ch.id, false); } catch {} }
    else if (firebaseActive) { fbRespond(ch.id, false).catch(() => {}); }
  }

  const state = getState();
  const currentPlayer = state.currentPlayer;

  // Build race start event for spectators
  const p1Data = {
    id: currentPlayer.id,
    name: race.player1Name || currentPlayer.name,
    carId: currentPlayer.carId,
    color: currentPlayer.color,
  };
  const allKnown = [...(state.players || []), ...(state._fbPlayers || [])];
  const oppPlayer = allKnown.find(p => p.id === (race.player2Id || ''));
  const oppAvatarColor = oppPlayer?.color || opponentCar.color || '#888';
  const p2Data = {
    id: race.player2Id || 'opponent',
    name: race.player2Name || '?',
    carId: opponentCar.id,
    color: oppAvatarColor,
  };

  // Broadcast race_start — race_announce was already sent from queue system
  const raceStartEvent = { type: 'race_start', p1: p1Data, p2: p2Data };
  simBroadcastRaceEvent(raceStartEvent);
  if (firebaseActive) fbBroadcastRaceEvent(raceStartEvent);

  setRaceEventBroadcaster((event) => {
    simBroadcastRaceEvent(event);
    if (firebaseActive) fbBroadcastRaceEvent(event);
  });

  const p1 = race.player1Name || '?';
  const p2 = race.player2Name || '?';
  sendMessageToChannel({
    type: 'system',
    text: t('lobby.msg.raceStart', { p1, p2 }),
  });

  let unsubRace = null;

  if (!isBotRace && race.id) {
    unsubRace = fbWatchRace(race.id, (raceData) => {
      if (!raceData) return;
    });
    if (unsubRace) unsubscribers.push(unsubRace);
  }

  // Fire race callback — main.js runs the race engine
  setTimeout(() => {
    // Determine opponent bot skill for difficulty scaling in game engine
    let botSkill = 'normal';
    let botBuild = null;
    if (isBotRace) {
      const myId = state.currentPlayer?.id;
      const botId = race.player1Id === myId ? race.player2Id : race.player1Id;
      botSkill = simGetBotSkill(botId);
      botBuild = simGetBotBuild(botId);
    }

    // Apply bot's part build to opponent car — makes pro bots genuinely faster
    let enrichedCar = opponentCar;
    if (isBotRace && botBuild && botBuild.parts.length > 0) {
      enrichedCar = applyBuild(opponentCar, botBuild.parts);
      enrichedCar._botSkill = botSkill;
      enrichedCar._buildLabel = botBuild.label;
    } else if (isBotRace) {
      enrichedCar = { ...opponentCar, _botSkill: botSkill };
    }
    // Mark pink slip bots so game engine can boost their AI
    if (isBotRace && _currentStake?.type === 'pink') {
      enrichedCar._pinkSlip = true;
    }

    raceCallback(enrichedCar, (myResult) => {
      const myId = currentPlayer.id;

      // Unlock lobby — race is over, new challenges can come in
      inRace = false;
      simSetPlayerInRace(false);

      // Notify queue system that player race is done
      simFinishPlayerRace({ id: race.id, p1: { name: currentPlayer.name, color: currentPlayer.color }, p2: { name: p2, color: oppAvatarColor }, stake: _currentStake }, {
        pTime: myResult.playerTime,
        oTime: myResult.opponentTime,
        won: myResult.won,
      });

      // Submit result
      if (isBotRace) {
        simSubmitResult(race.id, myId, myResult);
        simFinishRace(race.id);
      } else {
        fbSubmitResult(race.id, myId, myResult).catch(() => {});
      }

      setRaceEventBroadcaster(null);

      sendMessageToChannel({
        type: 'chat',
        playerId: myId,
        playerName: currentPlayer.name,
        playerColor: currentPlayer.color,
        phraseKey: myResult.won ? 'lobby.msg.raceWon' : 'lobby.msg.raceLost',
      });
    }, _currentStake);
  }, 1500);
}

// ── Send to appropriate channel (Firebase or sim, never both) ─
// System messages → sim + Firebase (display only, not persisted locally)
// Chat messages  → lobbyMsgs + sim + Firebase (persisted for sender visibility)
function sendMessageToChannel(msg) {
  const msgWithTime = { ...msg, time: msg.time || Date.now() };

  if (msg.type === 'chat') {
    // Only persist chat messages locally (not system messages)
    addLobbyMsg(msgWithTime);
  }

  // Send through sim for bot interaction (both types)
  simSendMsg(msgWithTime);

  // Persist to Firebase for other real players
  if (firebaseActive) {
    fbSendMsg(msgWithTime).catch(err => {
      console.warn('[Chat] Firebase send failed:', err.message);
    });
  }
}

function wireEvents(root, onExit) {
  const exitBtn = root.querySelector('#exitLobbyBtn');
  if (exitBtn) {
    exitBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const player = getState().currentPlayer;
        const go = () => {
          cleanupLobby();
          if (onExit) onExit();
        };
        if (player) {
          const promises = [];
          if (firebaseActive) promises.push(fbLeave(player.id));
          promises.push(simLeave(player.id));
          Promise.allSettled(promises).finally(go);
        } else {
          go();
        }
      } catch (err) {
        cleanupLobby();
        if (onExit) onExit();
      }
    });
  }

  const chatForm = root.querySelector('#lobbyChatForm');
  const chatInput = root.querySelector('#lobbyChatInput');
  if (chatForm && chatInput) {
    chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = chatInput.value.trim();
      if (text) {
        handleSendMessage(text);
        chatInput.value = '';
      }
    });
  }
}

// ── Helpers ──────────────────────────────────────────────────
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
