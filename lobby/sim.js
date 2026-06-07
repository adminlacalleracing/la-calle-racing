// Local lobby simulation — works without Firebase, provides multiplayer experience
import { CARS } from '../cars.js';
import { applyBuild } from '../parts.js';
import { RACE_START_OFFSET, START_MARKER_PCT as START_PCT, FINISH_MARKER_PCT as FINISH_PCT } from '../ui/race-view.js';

const FRAME_RANGE = FINISH_PCT - START_PCT - RACE_START_OFFSET; // 82.5% total range (5.5% → 88%)

const t = (key, vals) => window.miniappI18n?.t(key, vals) ?? key;

// ── Pro Bot Part Builds ─────────────────────────────────────
// Each pro bot gets a random build that makes their car genuinely faster.
// Builds respect the part dependency tree. NOS bots also activate NOS during the race.
const BUILDS = {
  light:   { parts: ['filter', 'exhaust', 'tires'],               label: 'Tuneado' },
  medium:  { parts: ['filter', 'exhaust', 'cams', 'chip', 'clutch', 'tires'], label: 'Preparado' },
  heavy:   { parts: ['filter', 'exhaust', 'cams', 'chip', 'turbo', 'intake', 'clutch', 'weight', 'tires'], label: 'Motorizado' },
  elite:   { parts: ['filter', 'exhaust', 'cams', 'chip', 'turbo', 'intake', 'clutch', 'weight', 'tires', 'nos'], label: 'Full Build' },
};

// Weighted random build selection for pro bots
// Heavy/Elite builds are rarer — these are the REAL threats
function pickRandomBuild() {
  const roll = Math.random();
  if (roll < 0.25) return 'light';    // 25% — bolt-ons, ~25% more HP
  if (roll < 0.60) return 'medium';   // 35% — real work, ~65% more HP
  if (roll < 0.85) return 'heavy';    // 25% — turbo build, ~150% more HP
  return 'elite';                      // 15% — full build + NOS, monster
}

// ── Bot roster ───────────────────────────────────────────────
// Regular bots — calle neighborhood racers
const BOT_NAMES = [
  'El Padrino', 'Turbín', 'Rayito', 'Don Ramón', 'La Sombra',
  'Chacal', 'Frijolito', 'Ráfaga', 'Centella', 'Pata de Perro',
  'El Chido', 'Relámpago', 'Tornillo', 'Bujía', 'Clutch',
];

// Pro bots — street legends, harder to beat
const PRO_BOT_NAMES = [
  'El Mito', 'Don Julio', 'El Doctor', 'Sombra Roja',
  'El Turco', 'La Araña', 'El Patrón', 'Caballo Negro',
  'El Fantasma', 'Doble Clutch', 'Nitro', 'El Griego',
];

const BOT_COLORS = [
  '#ff6b6b', '#ffd93d', '#6bcf7f', '#4ecdc4', '#a78bfa',
  '#f472b6', '#fb923c', '#38bdf8', '#34d399', '#e879f9',
];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Race Queue Management ────────────────────────────────────

function generateQueueEntryId() {
  return 'qe_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

function generateStake() {
  const roll = Math.random();
  if (roll < 0.50) return { type: 'fun', amount: 0 };
  if (roll < 0.80) return { type: 'cash', amount: 100 };
  if (roll < 0.95) return { type: 'cash', amount: 500 };
  return { type: 'pink', amount: 0, carId: null };
}

function enqueueRace(p1, p2, type, stake) {
  const entry = {
    id: generateQueueEntryId(),
    p1: { id: p1.id, name: p1.name, carId: p1.carId, color: p1.color, wins: p1.wins, skill: p1.skill || 'normal', buildKey: p1.buildKey || null },
    p2: { id: p2.id, name: p2.name, carId: p2.carId, color: p2.color, wins: p2.wins, skill: p2.skill || 'normal', buildKey: p2.buildKey || null },
    type,        // 'bot' | 'player'
    stake,       // { type: 'fun'|'cash'|'pink', amount: number }
    status: 'queued',
    createdAt: Date.now(),
  };
  raceQueue.push(entry);
  notifyQueueChange();
  processQueue();
  return entry;
}

function processQueue() {
  if (activeRaceEntry || queueProcessing || raceQueue.length === 0) return;
  queueProcessing = true;

  const next = raceQueue.shift();
  activeRaceEntry = next;
  next.status = 'running';
  notifyQueueChange();

  // Fire announcement toast
  if (announcementCallback && !next._announced) {
    next._announced = true;
    try { announcementCallback(next); } catch {}
  }

  // Notify global sync callback if host
  if (onGlobalRaceStart && next.type === 'bot') {
    try { onGlobalRaceStart(next); } catch {}
  }

  if (next.type === 'bot') {
    // Bot-vs-bot: simulate after short delay to let toast show
    const delay = 800 + Math.random() * 700;
    queueTimers.push(setTimeout(() => {
      simulateBotVsBotRace(next);
    }, delay));
  } else if (next.type === 'player') {
    // Player race: delegate to setPlayerRaceReady for consistent 10s prep
    // If _startCallback already set, fire race_announce + 6.8s delay
    if (next._startCallback) {
      if (announcementCallback && !next._announced) {
        next._announced = true;
        try { announcementCallback(next); } catch {}
      }
      if (raceFeedCallback) {
        try { raceFeedCallback({ type: 'race_announce', p1: next.p1, p2: next.p2, stake: next.stake }); } catch {}
      }
      const timerId = setTimeout(() => {
        if (next._startCallback) next._startCallback();
      }, 6800);
      queueTimers.push(timerId);
    }
    // If _startCallback not set yet (entry was queued behind other races),
    // setPlayerRaceReady will fire it when called later
  }
}

function simulateBotVsBotRace(entry) {
  // Build enriched cars
  const p1Car = CARS.find(c => c.id === entry.p1.carId) || CARS[0];
  const p2Car = CARS.find(c => c.id === entry.p2.carId) || CARS[0];

  const p1Build = entry.p1.buildKey ? getBotBuild(entry.p1.id) : null;
  const p2Build = entry.p2.buildKey ? getBotBuild(entry.p2.id) : null;

  const p1CarEnriched = p1Build ? applyBuild(p1Car, p1Build.parts) : p1Car;
  const p2CarEnriched = p2Build ? applyBuild(p2Car, p2Build.parts) : p2Car;

  // Add skill info for AI scaling
  p1CarEnriched._botSkill = entry.p1.skill;
  p2CarEnriched._botSkill = entry.p2.skill;

  // Pink slip bots get boosted AI
  if (entry.stake?.type === 'pink') {
    p1CarEnriched._pinkSlip = true;
    p2CarEnriched._pinkSlip = true;
  }

  // Simulate race result (physics-approximation)
  const result = simulateRacePhysics(p1CarEnriched, p2CarEnriched, entry.p1.skill, entry.p2.skill);

  // ── Phase 1: Announce race 4s early — grace period for spectators ──
  if (raceFeedCallback) {
    try { raceFeedCallback({ type: 'race_announce', p1: entry.p1, p2: entry.p2, stake: entry.stake }); } catch {}
  }

  // After 4s grace period, start the actual race sequence
  const ANNOUNCE_DELAY = 6800;
  queueTimers.push(setTimeout(() => {
    if (!raceFeedCallback) return;

    // ── Phase 2: Official race start ──
    try { raceFeedCallback({ type: 'race_start', p1: entry.p1, p2: entry.p2 }); } catch {}

    // ── Phase 3: Christmas tree lights (4 stages × 0.8s = 3.2s) ──
    const NUM_LIGHTS = 4;
    const LIGHT_INTERVAL = 800;
    for (let i = 0; i < NUM_LIGHTS; i++) {
      queueTimers.push(setTimeout(() => {
        if (raceFeedCallback) { try { raceFeedCallback({ type: 'light', index: i }); } catch {} }
      }, i * LIGHT_INTERVAL));
    }

    // ── Phase 4: Green light + frame stream ──
    const lightsPhase = NUM_LIGHTS * LIGHT_INTERVAL;
    queueTimers.push(setTimeout(() => {
      // GO! light
      if (raceFeedCallback) { try { raceFeedCallback({ type: 'light', index: NUM_LIGHTS }); } catch {} }

      const raceDuration = 10000 + Math.random() * 4000;

      // Broadcast frame events for the FULL race duration (~10fps)
      // Winner arrives at finish ~10% early, loser arrives exactly at 100%
      // Both cars smoothly reach FINISH_PCT — no overshoot, no visual snap.
      let frameCount = 0;
      const frameIntervalMs = 100;
      const totalFrames = Math.ceil(raceDuration / frameIntervalMs);
      const frameTimer = setInterval(() => {
        const progress = Math.min(frameCount / totalFrames, 1);
        frameCount++;
        if (frameCount > totalFrames + 1) { clearInterval(frameTimer); return; }
        // Winner reaches finish at 90% of race duration (stays there for last 10%)
        // Loser reaches finish at 100% of race duration (smooth arrival)
        const winnerProg = Math.min(progress * 1.11, 1.0);
        const loserProg = progress;
        const p1Prog = result.won ? winnerProg : loserProg;
        const p2Prog = result.won ? loserProg : winnerProg;
        if (raceFeedCallback) {
          try {
            raceFeedCallback({
              type: 'frame',
              pPct: START_PCT + RACE_START_OFFSET + p1Prog * FRAME_RANGE,
              oPct: START_PCT + RACE_START_OFFSET + p2Prog * FRAME_RANGE,
              pSpd: result.pTime < 15 ? 80 + progress * 60 : 60 + progress * 40,
              oSpd: result.oTime < 15 ? 80 + progress * 60 : 60 + progress * 40,
              gear: Math.min(5, 1 + Math.floor(progress * 5)),
              rpm: 40 + Math.floor(progress * 40),
              temp: 60,
            });
          } catch {}
        }
      }, frameIntervalMs);
      queueTimers.push(() => clearInterval(frameTimer));

      queueTimers.push(setTimeout(() => {
        clearInterval(frameTimer);

        // Send final frames so cars visually CROSS the finish line (88%).
        // Winner crosses past the line, loser stays just behind.
        if (raceFeedCallback) {
          const winPct = FINISH_PCT;         // winner: exactly on the checkerboard
          const losePct = FINISH_PCT - 2.0;  // loser: 2% before the line
          const pFinal = result.won ? winPct : losePct;
          const oFinal = result.won ? losePct : winPct;
          try {
            raceFeedCallback({
              type: 'frame',
              pPct: pFinal,
              oPct: oFinal,
              pSpd: 80 + Math.random() * 40,
              oSpd: 80 + Math.random() * 40,
              gear: 5,
              rpm: 60,
              temp: 70,
            });
          } catch {}
        }

        // Wait 400ms so the spectator sees the final frame at the finish line
        // before the result overlay appears
        const endTimer = setTimeout(() => {
          const endEvent = { type: 'race_end', pTime: result.pTime, oTime: result.oTime, won: result.won };
          if (raceFeedCallback) { try { raceFeedCallback(endEvent); } catch {} }
          if (resultCallback) { try { resultCallback(entry, result); } catch {} }

          // Release bots from race — 8s cooldown before they can race again
          botsInRace.delete(entry.p1.id);
          botsInRace.delete(entry.p2.id);
          botRaceCooldown.set(entry.p1.id, Date.now() + 8000);
          botRaceCooldown.set(entry.p2.id, Date.now() + 8000);

          // Process next in queue
          activeRaceEntry = null;
          queueProcessing = false;
          notifyQueueChange();
          // Natural gap between races — gives spectators time to breathe
          const gapDelay = 15000 + Math.random() * 5000;
          const gapTimer = setTimeout(() => { processQueue(); }, gapDelay);
          queueTimers.push(gapTimer);
        }, 400);
        queueTimers.push(endTimer);
      }, raceDuration));
    }, lightsPhase));
  }, ANNOUNCE_DELAY));
}

function simulateRacePhysics(p1Car, p2Car, p1Skill, p2Skill) {
  // Quick physics approximation for bot-vs-bot
  const isPro1 = p1Skill === 'pro';
  const isPro2 = p2Skill === 'pro';

  const shiftQ1 = isPro1 ? 0.65 + Math.random() * 0.25 : 0.35 + Math.random() * 0.30;
  const shiftQ2 = isPro2 ? 0.65 + Math.random() * 0.25 : 0.35 + Math.random() * 0.30;
  const launchQ1 = isPro1 ? 0.55 + Math.random() * 0.35 : 0.25 + Math.random() * 0.45;
  const launchQ2 = isPro2 ? 0.55 + Math.random() * 0.35 : 0.25 + Math.random() * 0.45;

  // Base time depends on car power/weight ratio
  const pwrWt1 = p1Car.hp / p1Car.weight;
  const pwrWt2 = p2Car.hp / p2Car.weight;

  // Better skill = closer to optimal
  const base1 = 13.5 - (pwrWt1 * 18) - (launchQ1 * 0.5) - (shiftQ1 * 0.3);
  const base2 = 13.5 - (pwrWt2 * 18) - (launchQ2 * 0.5) - (shiftQ2 * 0.3);

  // Add some variance
  const p1Time = Math.max(9.5, base1 + (Math.random() - 0.5) * 0.6);
  const p2Time = Math.max(9.5, base2 + (Math.random() - 0.5) * 0.6);

  return {
    pTime: Math.round(p1Time * 1000) / 1000,
    oTime: Math.round(p2Time * 1000) / 1000,
    won: p1Time <= p2Time,
    jumped: false,
  };
}

function notifyQueueChange() {
  if (queueCallback) {
    try { queueCallback([...raceQueue], activeRaceEntry); } catch {}
  }
}

function isBotInQueue(botId) {
  if (activeRaceEntry && (activeRaceEntry.p1.id === botId || activeRaceEntry.p2.id === botId)) return true;
  return raceQueue.some(e => e.p1.id === botId || e.p2.id === botId);
}

function makeBotId() {
  return 'bot_' + Math.random().toString(36).slice(2, 8);
}

// ── State ────────────────────────────────────────────────────
let bots = [];
let players = [];     // includes current player
let messages = [];
let challenges = [];
let currentPlayer = null;
let timers = [];
let playerCallback = null;
let messageCallback = null;
let challengeCallback = null;
let connectionCallback = null;
let raceWatchers = {};
let botsInRace = new Set();       // bot IDs currently in a race
let botRaceCooldown = new Map();   // botId -> timestamp when cooldown ends
let challengeTimers = new Map();   // challengeId → timerId for auto-accept

// ── Adaptive bot management ──────────────────────────────────
// Per-bot cooldowns to prevent spam
let botMsgCooldown = new Map();    // botId -> timestamp when next message allowed
let botChallengeCooldown = new Map(); // botId -> timestamp when next challenge allowed

let realPlayerCount = 0;
let realPlayerCarIds = new Set();
let playerInRace = false;

// ── Queue state (module-level) ──────────────────────────────
let raceQueue = [];
let activeRaceEntry = null;
let queueProcessing = false;
let queueTimers = [];
let queueCallback = null;
let announcementCallback = null;
let resultCallback = null;
let raceFeedCallback = null;
/** botId → carId for tracking unique bot car assignments */
let botCarMap = new Map();

// ── Global sync mode ────────────────────────────────────────
// When isHost = false, bot-vs-bot races are suppressed (host generates them).
// When isHost = true, this client generates bot races and publishes them.
let isHost = false;
let onGlobalRaceStart = null; // callback(entry) — called when host starts a bot race

export function setIsHost(v) { isHost = v; }
export function getIsHost() { return isHost; }
export function setOnGlobalRaceStart(cb) { onGlobalRaceStart = cb; }

function computeTargetBots() {
  if (realPlayerCount <= 0) return 5;
  if (realPlayerCount === 1) return 5;
  if (realPlayerCount === 2) return 3;
  return 2;
}

function getBotCarsInUse() {
  return new Set(botCarMap.values());
}

function getAvailableBotCar() {
  const used = getBotCarsInUse();
  const available = CARS.filter(c => !realPlayerCarIds.has(c.id) && !used.has(c.id));
  if (available.length > 0) return randomFrom(available);
  // All taken — any car not used by a real player
  const fallback = CARS.filter(c => !realPlayerCarIds.has(c.id));
  return fallback.length > 0 ? randomFrom(fallback) : randomFrom(CARS);
}

function makeBot() {
  const car = getAvailableBotCar();
  const isPro = Math.random() < 0.30; // 30% pro bots
  const buildKey = isPro ? pickRandomBuild() : null;
  const bot = {
    id: makeBotId(),
    name: isPro ? randomFrom(PRO_BOT_NAMES) : randomFrom(BOT_NAMES),
    carId: car.id,
    color: randomFrom(BOT_COLORS),
    wins: isPro ? 50 + Math.floor(Math.random() * 100) : Math.floor(Math.random() * 30),
    online: true,
    skill: isPro ? 'pro' : 'normal',
    buildKey: buildKey,               // 'light' | 'medium' | 'heavy' | 'elite' | null
    buildParts: buildKey ? BUILDS[buildKey].parts : [],
    buildLabel: buildKey ? BUILDS[buildKey].label : null,
  };
  // New bots start with a stagger so they don't all act at once
  botMsgCooldown.set(bot.id, Date.now() + 3000 + Math.random() * 5000);
  botCarMap.set(bot.id, bot.carId);
  return bot;
}

function removeBot(bot) {
  bot.online = false;
  botCarMap.delete(bot.id);
  botsInRace.delete(bot.id);
  botRaceCooldown.delete(bot.id);
  botMsgCooldown.delete(bot.id);
  botChallengeCooldown.delete(bot.id);
}

function getOnlineBots() {
  return bots.filter(b => b.online);
}

function adjustBots(reason) {
  const target = computeTargetBots();
  const onlineBots = getOnlineBots();
  const diff = onlineBots.length - target;

  if (diff > 0) {
    // Remove excess bots (prefer idle, non-racing bots)
    const now = Date.now();
    const idleBots = onlineBots.filter(b =>
      !botsInRace.has(b.id) &&
      (!botRaceCooldown.has(b.id) || now >= botRaceCooldown.get(b.id))
    );
    const toRemove = idleBots.slice(0, Math.min(diff, idleBots.length));
    toRemove.forEach(bot => {
      removeBot(bot);
    });
    bots = bots.filter(b => b.online);
    refreshPlayers();

    // Send goodbye messages with staggered delay for natural feel
    toRemove.forEach((bot, i) => {
      const delay = 600 + i * 800 + Math.random() * 600;
      timers.push(setTimeout(() => {
        addMessage({
          type: 'chat', playerId: bot.id, playerName: bot.name,
          playerColor: bot.color, phraseKey: 'lobby.msg.goodbye',
        });
      }, delay));
    });
  } else if (diff < 0) {
    // Add missing bots
    const toAdd = Math.abs(diff);
    for (let i = 0; i < toAdd; i++) {
      const bot = makeBot();
      bots.push(bot);
      const botCar = CARS.find(c => c.id === bot.carId);
      const botCarName = botCar ? botCar.name : 'su ride';
      const buildSuffix = bot.buildLabel ? ` — ${bot.buildLabel}` : '';
      addMessage({ type: 'system', text: t('lobby.msg.arrived', { name: bot.name, car: botCarName + buildSuffix }) });
    }
    refreshPlayers();
  }
}

function refreshPlayers() {
  players = [currentPlayer, ...getOnlineBots()];
  if (playerCallback) {
    playerCallback(players.filter(p => p.id !== currentPlayer?.id));
  }
}

/**
 * Called by lobby view when real (Firebase) players change.
 * Adjusts bot count dynamically:
 *   0-1 humans → 3 bots
 *   2 humans   → 2 bots
 *   3+ humans  → 1 bot
 */
export function setRealPlayerCount(count, carIds) {
  realPlayerCount = count;
  realPlayerCarIds = new Set(carIds || []);
  adjustBots('realPlayersChanged');
}

/** Tell simulation the player is currently in a race — blocks bot challenges */
export function setPlayerInRace(inRace) {
  playerInRace = inRace;
}

// ── Init simulation ──────────────────────────────────────────
export function initSimulation(player) {
  currentPlayer = player;
  bots = [];
  players = [player];
  messages = [];
  challenges = [];
  timers = [];
  raceWatchers = {};
  botsInRace = new Set();
  botRaceCooldown = new Map();
  botCarMap = new Map();
  challengeTimers = new Map();
  raceQueue = [];
  activeRaceEntry = null;
  queueProcessing = false;
  queueTimers = [];

  // Report connected immediately
  if (connectionCallback) connectionCallback(true);

  // Spawn initial bots one at a time with generous delays
  spawnInitialBots();

  // Bot behavior loop — runs less frequently
  scheduleBotAction();
}

/** Spawn initial bots one at a time with staggered delays */
function spawnInitialBots() {
  const target = computeTargetBots();
  for (let i = 0; i < target; i++) {
    const delay = 800 + i * 1500 + Math.random() * 1000;
    timers.push(setTimeout(() => {
      const currentTarget = computeTargetBots();
      if (getOnlineBots().length >= currentTarget) return;
      spawnOneBot();
    }, delay));
  }
}

/** Spawn a single bot with arrival message */
function spawnOneBot() {
  const bot = makeBot();
  bots.push(bot);
  refreshPlayers();

  const botCar = CARS.find(c => c.id === bot.carId);
  const botCarName = botCar ? botCar.name : 'su ride';
  const buildSuffix = bot.buildLabel ? ` — ${bot.buildLabel}` : '';
  addMessage({
    type: 'system',
    text: t('lobby.msg.arrived', { name: bot.name, car: botCarName + buildSuffix }),
  });
}

/** Main bot behavior loop — runs every 5-9 seconds */
function scheduleBotAction() {
  const delay = 6000 + Math.random() * 3000;
  timers.push(setTimeout(() => {
    try {
      if (!currentPlayer) {
        // No player yet — skip this cycle but keep the loop alive
      } else {
        // Only adjust bots every 3rd cycle to reduce overhead
        if (Math.random() < 0.33) adjustBots('behaviorLoop');

        const now = Date.now();

        // Filter bots that are available (not in race, not on race cooldown)
        const availableBots = getOnlineBots().filter(b => {
          if (botsInRace.has(b.id)) return false;
          const cooldownEnd = botRaceCooldown.get(b.id);
          if (cooldownEnd && now < cooldownEnd) return false;
          return true;
        });

        if (availableBots.length > 0) {
          // Pick one random bot to act this cycle
          const bot = randomFrom(availableBots);

          // Check per-bot cooldowns
          const msgReady = !botMsgCooldown.has(bot.id) || now >= botMsgCooldown.get(bot.id);
          const chReady = !botChallengeCooldown.has(bot.id) || now >= botChallengeCooldown.get(bot.id);

          const action = Math.random();

          if (action < 0.10 && msgReady) {
      // Send a chat message (10% chance, if cooldown allows)
      const phrases = [
        'lobby.msg.hello', 'lobby.msg.wannaRace', 'lobby.msg.whoWants',
        'lobby.msg.gg', 'lobby.msg.goodRace',
      ];
      addMessage({
        type: 'chat',
        playerId: bot.id,
        playerName: bot.name,
        playerColor: bot.color,
        phraseKey: randomFrom(phrases),
      });
      // 12s cooldown before this bot can message again
      botMsgCooldown.set(bot.id, now + 12000);

    } else if (action < 0.25 && chReady && currentPlayer && !playerInRace) {
      // Challenge the player (15% chance, if cooldown allows)
      const existing = challenges.find(c =>
        c.fromId === bot.id && c.status === 'pending'
      );
      if (!existing) {
        const challenge = {
          id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          fromId: bot.id,
          fromName: bot.name,
          fromCarId: bot.carId,
          fromColor: bot.color,
          toId: currentPlayer.id,
          toName: currentPlayer.name,
          toCarId: currentPlayer.carId,
          status: 'pending',
          createdAt: Date.now(),
        };
        challenges.push(challenge);
        if (challengeCallback) challengeCallback(challenges);

        addMessage({
          type: 'chat',
          playerId: bot.id,
          playerName: bot.name,
          playerColor: bot.color,
          phraseKey: 'lobby.msg.wannaRace',
        });

        // 15s cooldown before this bot can challenge again
        botChallengeCooldown.set(bot.id, now + 15000);

        // Auto-expire challenge after 25s
        timers.push(setTimeout(() => {
          const idx = challenges.findIndex(c => c.id === challenge.id);
          if (idx !== -1 && challenges[idx].status === 'pending') {
            challenges.splice(idx, 1);
            if (challengeCallback) challengeCallback(challenges);
          }
        }, 25000));
      }
    } else if (action < 0.65 && isHost && availableBots.length >= 2 && !isBotInQueue(bot.id)) {
      // Challenge another bot (40% chance) — bots race each other frequently
      const opponents = availableBots.filter(b => b.id !== bot.id && !isBotInQueue(b.id));
      if (opponents.length > 0) {
        const opponent = randomFrom(opponents);
        const stake = generateStake();

        // Announce the challenge in chat
        addMessage({
          type: 'chat',
          playerId: bot.id,
          playerName: bot.name,
          playerColor: bot.color,
          phraseKey: 'lobby.msg.wannaRace',
        });

        // Short delay then auto-accept (bots always accept each other)
        timers.push(setTimeout(() => {
          if (!bot.online || !opponent.online) return;
          addMessage({
            type: 'chat',
            playerId: opponent.id,
            playerName: opponent.name,
            playerColor: opponent.color,
            phraseKey: 'lobby.msg.iWant',
          });

          // Mark both as in-race so they stop being challenged
          botsInRace.add(bot.id);
          botsInRace.add(opponent.id);

          enqueueRace(bot, opponent, 'bot', stake);

          botChallengeCooldown.set(bot.id, now + 12000);
          botChallengeCooldown.set(opponent.id, now + 12000);
        }, 1500 + Math.random() * 1500));
      }
          }
          // else: bot does nothing this cycle (idle — natural pacing)
        }
      }
    } catch (e) {
      console.warn('[Sim] Bot cycle error:', e);
    } finally {
      // ALWAYS re-schedule — the loop must never die
      scheduleBotAction();
    }
  }, delay));
}

function addMessage(msg) {
  messages.push({ ...msg, time: msg.time || Date.now() });
  if (messages.length > 100) messages = messages.slice(-80);
  if (messageCallback) messageCallback(messages);
}

// ── Public API (mirrors firebase.js exports) ─────────────────

export function watchConnection(cb) {
  connectionCallback = cb;
  setTimeout(() => cb(true), 100);
  return () => { connectionCallback = null; };
}

export function watchPlayers(cb) {
  playerCallback = cb;
  setTimeout(() => cb(players.filter(p => p.id !== currentPlayer?.id)), 200);
  return () => { playerCallback = null; };
}

export function watchMessages(cb) {
  messageCallback = cb;
  setTimeout(() => cb(messages), 200);
  return () => { messageCallback = null; };
}

export function watchChallenges(cb) {
  challengeCallback = cb;
  setTimeout(() => cb(challenges), 200);
  return () => { challengeCallback = null; };
}

export function sendMessage(msg) {
  addMessage(msg);
}

export function sendChallenge(fromPlayer, toPlayer) {
  // This is called when the HUMAN challenges a bot
  const challenge = {
    id: 'ch_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    fromId: fromPlayer.id,
    fromName: fromPlayer.name,
    fromCarId: fromPlayer.carId,
    fromColor: fromPlayer.color,
    toId: toPlayer.id,
    toName: toPlayer.name,
    toCarId: toPlayer.carId,
    status: 'pending',
    createdAt: Date.now(),
  };
  challenges.push(challenge);
  if (challengeCallback) challengeCallback(challenges);

  // Bot accepts after delay
  const acceptDelay = 6000 + Math.random() * 4000;
  const bot = bots.find(b => b.id === toPlayer.id);
  if (bot) {
    const timerId = setTimeout(() => {
      challengeTimers.delete(challenge.id);
      const ch = challenges.find(c => c.id === challenge.id);
      if (ch && ch.status === 'pending') {
        ch.status = 'accepted';
        if (challengeCallback) challengeCallback(challenges);

        // Mark bot as in-race — no more chatting/challenging
        botsInRace.add(bot.id);

        addMessage({
          type: 'chat',
          playerId: bot.id,
          playerName: bot.name,
          playerColor: bot.color,
          phraseKey: 'lobby.msg.iWant',
        });
      }
    }, acceptDelay);
    timers.push(timerId);
    challengeTimers.set(challenge.id, timerId);
  }
}

export function respondChallenge(challengeId, accepted) {
  const ch = challenges.find(c => c.id === challengeId);
  if (!ch) return;
  ch.status = accepted ? 'accepted' : 'declined';
  if (challengeCallback) challengeCallback(challenges);

  if (!accepted) {
    setTimeout(() => {
      const idx = challenges.findIndex(c => c.id === challengeId);
      if (idx !== -1) challenges.splice(idx, 1);
      if (challengeCallback) challengeCallback(challenges);
    }, 2000);
  }
}

/**
 * Returns a heavy or elite build for pink slip bots — these are serious racers
 * who risk their car. Always heavy or elite, never light/medium.
 */
export function getPinkSlipBuild() {
  const roll = Math.random();
  if (roll < 0.45) return { parts: BUILDS.heavy.parts, label: BUILDS.heavy.label, buildKey: 'heavy' };
  return { parts: BUILDS.elite.parts, label: BUILDS.elite.label, buildKey: 'elite' };
}

/** Cancel a pending challenge sent by the player and clear its auto-accept timer */
export function cancelChallenge(challengeId) {
  const timerId = challengeTimers.get(challengeId);
  if (timerId) {
    clearTimeout(timerId);
    challengeTimers.delete(challengeId);
  }
  const idx = challenges.findIndex(c => c.id === challengeId);
  if (idx !== -1) challenges.splice(idx, 1);
  if (challengeCallback) challengeCallback(challenges);
}

export async function createRace(challenge, opponentCar) {
  const raceId = 'race_' + Date.now();
  const race = {
    id: raceId,
    challengeId: challenge.id,
    player1Id: challenge.fromId,
    player1Name: challenge.fromName,
    player2Id: challenge.toId,
    player2Name: challenge.toName,
    opponentCarId: opponentCar.id,
    opponentCarPerf: 0.55 + Math.random() * 0.30,
    status: 'starting',
    results: {},
  };

  // Remove the challenge
  const idx = challenges.findIndex(c => c.id === challenge.id);
  if (idx !== -1) challenges.splice(idx, 1);
  if (challengeCallback) challengeCallback(challenges);

  return race;
}

export function watchRace(raceId, cb) {
  raceWatchers[raceId] = cb;
  return () => { delete raceWatchers[raceId]; };
}

export async function submitRaceResult(raceId, playerId, result) {
  const cb = raceWatchers[raceId];
  if (cb) {
    // Immediately notify watchers with both results — no delay!
    // The game already computed opponentTime locally.
    cb({
      player1Id: playerId,
      player2Id: 'opponent',
      results: {
        [playerId]: { time: result.playerTime, jumped: result.jumped },
        'opponent': { time: result.opponentTime, jumped: false },
      },
    });
  }
}

export async function finishRace(raceId) {
  // Release bots from race and set 15-second cooldown
  for (const botId of botsInRace) {
    botRaceCooldown.set(botId, Date.now() + 15000);
  }
  botsInRace.clear();
  delete raceWatchers[raceId];
}

export function leaveLobby(playerId) {
  // no-op for local simulation
}

export function cleanupOldChallenges() {
  // no-op for local simulation
}

// ── Cleanup ──────────────────────────────────────────────────
export function stopSimulation() {
  timers.forEach(t => clearTimeout(t));
  timers = [];
  queueTimers.forEach(t => { try { clearTimeout(t); clearInterval(t); } catch {} });
  queueTimers = [];
  bots = [];
  players = [];
  messages = [];
  challenges = [];
  playerCallback = null;
  messageCallback = null;
  challengeCallback = null;
  connectionCallback = null;
  raceWatchers = {};
  botsInRace = new Set();
  botRaceCooldown = new Map();
  botCarMap = new Map();
  botMsgCooldown = new Map();
  botChallengeCooldown = new Map();
  realPlayerCount = 0;
  realPlayerCarIds = new Set();
  challengeTimers = new Map();
  playerInRace = false;
  raceFeedCallback = null;
  raceQueue = [];
  activeRaceEntry = null;
  queueProcessing = false;
  queueCallback = null;
  announcementCallback = null;
  resultCallback = null;
}

// ── Bot skill query ──────────────────────────────────────────
/**
 * Returns 'pro' or 'normal' for a given bot ID.
 * Used by lobby view to limit stakes and show badges.
 */
export function getBotSkill(botId) {
  const bot = bots.find(b => b.id === botId);
  return bot?.skill || 'normal';
}

/**
 * Returns the bot's part build info: { parts, label, buildKey } or null.
 * Used by lobby view to apply upgrades to opponent car.
 */
export function getBotBuild(botId) {
  const bot = bots.find(b => b.id === botId);
  if (!bot || bot.skill !== 'pro' || !bot.buildKey) return null;
  return {
    parts: bot.buildParts,
    label: bot.buildLabel,
    buildKey: bot.buildKey,
  };
}

// ── Race Feed (for spectators) ──────────────────────────────

export function broadcastRaceEvent(event) {
  if (raceFeedCallback) {
    try { raceFeedCallback(event); } catch {}
  }
}

export function watchRaceFeed(cb) {
  raceFeedCallback = cb;
  // If a race is already in progress, fire race_announce so spectator auto-opens
  if (activeRaceEntry) {
    setTimeout(() => {
      if (activeRaceEntry) {
        try { cb({ type: 'race_announce', p1: activeRaceEntry.p1, p2: activeRaceEntry.p2 }); } catch {}
      }
    }, 150);
  }
  return () => { raceFeedCallback = null; };
}

// ── Queue System Exports ─────────────────────────────────

/** Watch queue state changes: (queueEntries, activeEntry) => void */
export function watchQueue(cb) {
  queueCallback = cb;
  // Fire immediately with current state so late subscribers see active races
  setTimeout(() => { try { cb([...raceQueue], activeRaceEntry); } catch {} }, 100);
  return () => { queueCallback = null; };
}

/** Watch pre-race announcements: (entry) => void */
export function watchAnnouncements(cb) {
  announcementCallback = cb;
  return () => { announcementCallback = null; };
}

/** Watch race results (for spectator result display): (entry, result) => void */
export function watchRaceResults(cb) {
  resultCallback = cb;
  return () => { resultCallback = null; };
}

/** Get current queue state */
export function getQueueState() {
  return { queue: [...raceQueue], active: activeRaceEntry };
}

/**
 * Enqueue a player race. Returns the entry. The lobby/view.js
 * will call startPlayerRace() when this entry becomes active.
 */
export function enqueuePlayerRace(player, bot, stake) {
  return enqueueRace(player, bot, 'player', stake);
}

/**
 * Called when a player race entry becomes active in the queue.
 * The queue system announces, then calls the provided startCallback.
 */
export function setPlayerRaceReady(entry, startCallback) {
  entry._startCallback = startCallback;
  if (entry.status === 'running' && entry.type === 'player') {
    if (announcementCallback && !entry._announced) {
      entry._announced = true;
      try { announcementCallback(entry); } catch {}
    }
    // Broadcast race_announce for spectators — 10s before race actually starts
    if (raceFeedCallback) {
      try { raceFeedCallback({ type: 'race_announce', p1: entry.p1, p2: entry.p2, stake: entry.stake }); } catch {}
    }
    // 10s preparation period: 6.8s wait + 3.2s lights sequence
    const timerId = setTimeout(() => {
      if (startCallback) startCallback();
    }, 6800);
    queueTimers.push(timerId);
  }
}

/**
 * Called when a player race finishes. Marks entry done, releases queue.
 */
export function finishPlayerRace(entry, result) {
  if (resultCallback) { try { resultCallback(entry, result); } catch {} }
  activeRaceEntry = null;
  queueProcessing = false;
  notifyQueueChange();
  // Short delay before processing next queue entry
  const timerId = setTimeout(() => { processQueue(); }, 1500);
  queueTimers.push(timerId);
}

/** Returns the enriched car for a bot (applies their build) */
export function getEnrichedBotCar(botId) {
  const bot = bots.find(b => b.id === botId);
  if (!bot) return null;
  const baseCar = CARS.find(c => c.id === bot.carId) || CARS[0];
  const build = getBotBuild(botId);
  let enriched = build ? applyBuild(baseCar, build.parts) : { ...baseCar };
  enriched._botSkill = bot.skill;
  return enriched;
}

/**
 * Inject a global race from lobby_races into the local spectator feed.
 * Called by view.js when non-host client sees a race from Supabase.
 */
export function injectGlobalRace(race) {
  if (!raceFeedCallback) return;

  // Announce the race
  try {
    raceFeedCallback({
      type: 'race_announce',
      p1: race.p1,
      p2: race.p2,
      stake: race.stake,
    });
  } catch {}

  // Simulate the spectator frame sequence (same as host)
  const ANNOUNCE_DELAY = 6800;
  queueTimers.push(setTimeout(() => {
    if (!raceFeedCallback) return;
    try { raceFeedCallback({ type: 'race_start', p1: race.p1, p2: race.p2 }); } catch {}

    const NUM_LIGHTS = 4;
    const LIGHT_INTERVAL = 800;
    for (let i = 0; i < NUM_LIGHTS; i++) {
      queueTimers.push(setTimeout(() => {
        if (raceFeedCallback) { try { raceFeedCallback({ type: 'light', index: i }); } catch {} }
      }, i * LIGHT_INTERVAL));
    }

    const lightsPhase = NUM_LIGHTS * LIGHT_INTERVAL;
    queueTimers.push(setTimeout(() => {
      if (raceFeedCallback) { try { raceFeedCallback({ type: 'light', index: NUM_LIGHTS }); } catch {} }

      const raceDuration = 10000 + Math.random() * 4000;
      const won = Math.random() < 0.5;
      let frameCount = 0;
      const frameIntervalMs = 100;
      const totalFrames = Math.ceil(raceDuration / frameIntervalMs);
      const frameTimer = setInterval(() => {
        const progress = Math.min(frameCount / totalFrames, 1);
        frameCount++;
        if (frameCount > totalFrames + 1) { clearInterval(frameTimer); return; }
        // Winner reaches finish at 90% of race duration (stays there for last 10%)
        // Loser reaches finish at 100% of race duration (smooth arrival)
        const winnerProg = Math.min(progress * 1.11, 1.0);
        const loserProg = progress;
        const p1Prog = won ? winnerProg : loserProg;
        const p2Prog = won ? loserProg : winnerProg;
        if (raceFeedCallback) {
          try {
            raceFeedCallback({
              type: 'frame',
              pPct: START_PCT + RACE_START_OFFSET + p1Prog * FRAME_RANGE,
              oPct: START_PCT + RACE_START_OFFSET + p2Prog * FRAME_RANGE,
              pSpd: 80 + progress * 60,
              oSpd: 80 + progress * 60,
              gear: Math.min(5, 1 + Math.floor(progress * 5)),
              rpm: 40 + Math.floor(progress * 40),
              temp: 60,
            });
          } catch {}
        }
      }, frameIntervalMs);
      queueTimers.push(() => clearInterval(frameTimer));

      queueTimers.push(setTimeout(() => {
        clearInterval(frameTimer);

        // Winner crosses past finish line, loser stays just behind
        const injectWinPct = FINISH_PCT;
        const injectLosePct = FINISH_PCT - 2.0;
        const injPFinal = won ? injectWinPct : injectLosePct;
        const injOFinal = won ? injectLosePct : injectWinPct;
        if (raceFeedCallback) {
          try {
            raceFeedCallback({
              type: 'frame',
              pPct: injPFinal, oPct: injOFinal,
              pSpd: 80 + Math.random() * 40,
              oSpd: 80 + Math.random() * 40,
              gear: 5, rpm: 60, temp: 70,
            });
          } catch {}
        }
        queueTimers.push(setTimeout(() => {
          if (raceFeedCallback) {
            try {
              const pTime = 10 + Math.random() * 4;
              const oTime = 10 + Math.random() * 4;
              raceFeedCallback({ type: 'race_end', pTime, oTime, won: pTime <= oTime });
            } catch {}
          }
        }, 400));
      }, raceDuration));
    }, lightsPhase));
  }, ANNOUNCE_DELAY));
}
