import {
  powerCurve, computeEngineRpm, maxSpeedInGear,
} from './cars.js';
import {
  updateRaceProgress, updateTachometer, setShiftButton,
  setLightState, setLightInstruction,
  resetRaceViewState, updateHud, flashShiftFeedback,
  triggerFinishCrossing,
  triggerExhaustFlame,
  showRaceAnnouncement,
  updateTempGauge,
  setupNosUI, updateNosCharges, setNosActive,
  showLaunchFeedback,
  RACE_START_OFFSET,
  START_MARKER_PCT as START_PCT,
  FINISH_MARKER_PCT as FINISH_PCT,
} from './ui/race-view.js';

const t = (key) => window.miniappI18n?.t(key) ?? key;

// ── Race event broadcaster (for spectators) ─────────────────
let raceBroadcaster = null;
let frameBroadcastCounter = 0;
const FRAME_BROADCAST_INTERVAL = 6;

export function setRaceEventBroadcaster(fn) {
  raceBroadcaster = fn;
}

function emitRaceEvent(event) {
  if (raceBroadcaster) { try { raceBroadcaster(event); } catch {} }
}

const TRACK_LENGTH = 402;
const NUM_GEARS = 5;
const DRIVETRAIN_LOSS = 0.85;
const AIR_DENSITY = 1.225;
const ROLLING_RESISTANCE = 0.015;
const GRAVITY = 9.81;

// ── Shift quality thresholds ────────────────────────────────
const SHIFT_SWEET_LOW = 0.75;
const SHIFT_SWEET_HIGH = 0.85;
const SHIFT_WARN = 0.60;
const SHIFT_REDLINE = 0.92;

const START_OFFSET = RACE_START_OFFSET;

// ── Rev limiter ─────────────────────────────────────────────
const REV_LIMITER_START = 0.95;

// ── Engine temperature constants ────────────────────────────
const AMBIENT_TEMP = 27;
const MAX_TEMP = 140;
const OVERHEAT_TEMP = 115;
const TEMP_CRITICAL = 130;
const TEMP_OPTIMAL_LOW = 75;
const TEMP_OPTIMAL_HIGH = 95;
const TEMP_OPTIMAL_BONUS = 0.03;
let engineTemp = 25;
let lastRaceEndTime = 0;

// ── Engine damage system ────────────────────────────────────
// When engine stays in critical zone (130°C+), damage accumulates.
// Damage reduces max HP permanently until engine is repaired.
// At 0% integrity, engine is "blown" — massive power loss.
const DAMAGE_ZONE_TEMP = 130;     // °C — damage starts here
const DAMAGE_RATE = 0.008;        // integrity loss per second at 130°C
const DAMAGE_ACCEL = 0.015;       // additional loss per °C above 130°C per second
const BLOWN_THRESHOLD = 0.0;      // engine is blown at 0% integrity
const BLOWN_POWER_MULT = 0.25;    // blown engine = 25% power
let engineDamage = 0;             // 0 = pristine, 1 = blown (0-1 scale)
const ENGINE_DAMAGE_KEY = 'engineDamage';

export async function loadEngineDamage() {
  try {
    const raw = await window.miniappsAI.storage.getItem(ENGINE_DAMAGE_KEY);
    engineDamage = raw ? parseFloat(raw) : 0;
  } catch { engineDamage = 0; }
  return engineDamage;
}

export function getEngineDamage() { return engineDamage; }

export async function repairEngine() {
  engineDamage = 0;
  try { await window.miniappsAI.storage.setItem(ENGINE_DAMAGE_KEY, '0'); } catch {}
  return engineDamage;
}

function saveEngineDamage() {
  window.miniappsAI.storage.setItem(ENGINE_DAMAGE_KEY, String(engineDamage)).catch(() => {});
}

// ── Shift cooldown timers ───────────────────────────────────
const SHIFT_COOLDOWN_PERFECT = 0.15;
const SHIFT_COOLDOWN_GOOD = 0.25;
const SHIFT_COOLDOWN_OK = 0.30;
const SHIFT_COOLDOWN_MISS = 0.50;

const GREEN_GRACE_MS = 200;

// ── Launch RPM system ───────────────────────────────────────
// Player holds gas during countdown to build launch RPM.
// Too low RPM = bog (weak launch). Sweet spot = optimal launch.
// Too high RPM = wheel spin or burnout.
// The launch zone is displayed on the tachometer.
const LAUNCH_RPM_MIN = 0.25;         // Below this = bog
const LAUNCH_RPM_SWEET_LOW = 0.45;   // Sweet spot start
const LAUNCH_RPM_SWEET_HIGH = 0.60;  // Sweet spot end
const LAUNCH_RPM_SPIN = 0.75;        // Above this = wheel spin
const LAUNCH_RPM_BURNOUT = 0.90;     // Way too high = burnout
const LAUNCH_BOOST_PERFECT = 0.15;   // +15% initial speed
const LAUNCH_BOOST_GOOD = 0.08;      // +8% initial speed
const LAUNCH_PENALTY_SPIN = -0.10;   // -10% (wheel spin wastes time)
const LAUNCH_PENALTY_BURNOUT = -0.25; // -25% (massive spin)
const LAUNCH_PENALTY_BOG = -0.15;    // -15% (engine bogged)
const LAUNCH_RPM_BUILD_RATE = 0.30;  // RPM/s while holding gas
const LAUNCH_RPM_RELEASE_RATE = 0.50; // RPM/s decay when not holding

export function runRace(playerCarIn, opponentCarIn, onFinish) {
  const pCar = {
    ...playerCarIn,
    idleRpm: 900,
    maxPowerW: playerCarIn.hp * 735.5,
    maxTorqueNm: playerCarIn.torque,
  };
  const oCar = {
    ...opponentCarIn,
    idleRpm: 900,
    maxPowerW: opponentCarIn.hp * 735.5,
    maxTorqueNm: opponentCarIn.torque,
  };

  // Apply engine damage to player car
  if (engineDamage > 0) {
    const dmgMult = 1 - engineDamage * (1 - BLOWN_POWER_MULT);
    pCar.hp = Math.round(pCar.hp * dmgMult);
    pCar.maxPowerW = pCar.hp * 735.5;
    pCar.maxTorqueNm = Math.round(pCar.maxTorqueNm * dmgMult);
  }

  let phase = 'countdown';
  let playerPos = 0;
  let opponentPos = 0;
  let playerSpeed = 0;
  let opponentSpeed = 0;
  let gear = 0;
  let shifts = 0;
  let greenTime = 0;
  let raceStartTime = 0;
  let reactionTime = 0;
  let shiftCooldown = 0;
  let playerRpmNorm = 0;
  let greenLightTime = 0;
  let graceExpired = false;
  const jumped = false;

  // ── Engine temperature ────────────────────────────────────
  let overheating = false;
  let damageAccumulator = 0; // tracks damage during race

  const carCool = pCar.coolEfficiency || 1.0;
  const carHeat = pCar.heatCoeff || 1.0;
  const carMass = pCar.thermalMass || 1.0;

  // ── Inter-race cooling ────────────────────────────────────
  if (lastRaceEndTime > 0) {
    const elapsed = (performance.now() - lastRaceEndTime) / 1000;
    engineTemp = Math.max(AMBIENT_TEMP, engineTemp - elapsed * 0.5 * carCool);
  }

  function updateEngineTemp(dt, rpmNorm, isNosActive) {
    let heatRate = 0.3;
    heatRate += rpmNorm * rpmNorm * 4.0 * carHeat;
    if (rpmNorm >= 0.95) heatRate += 4.0 * carHeat;
    if (isNosActive && pCar.nosHeatSpike) {
      heatRate += pCar.nosHeatSpike * carHeat;
    }

    const cooling = 0.06 * carCool * (engineTemp - AMBIENT_TEMP);
    engineTemp += (heatRate - cooling) * dt / carMass;
    engineTemp = Math.max(AMBIENT_TEMP, Math.min(MAX_TEMP, engineTemp));
    overheating = engineTemp >= OVERHEAT_TEMP;

    // ── Engine damage: accumulate when in critical zone ──
    if (engineTemp >= DAMAGE_ZONE_TEMP) {
      const excessTemp = engineTemp - DAMAGE_ZONE_TEMP;
      const dmgRate = DAMAGE_RATE + excessTemp * DAMAGE_ACCEL;
      damageAccumulator += dmgRate * dt;
    }
  }

  // ── Launch RPM system ─────────────────────────────────────
  let launchRpm = 0;       // 0-1 normalized
  let isHoldingGas = false; // true while finger is on gas
  let launchApplied = false;

  function updateLaunchRpm(dt) {
    if (launchApplied) return;
    if (isHoldingGas) {
      launchRpm = Math.min(1.0, launchRpm + LAUNCH_RPM_BUILD_RATE * dt);
    } else {
      launchRpm = Math.max(0, launchRpm - LAUNCH_RPM_RELEASE_RATE * dt);
    }
    // Show launch RPM on tachometer during countdown
    updateTachometer(launchRpm * 100);
  }

  function computeLaunchBoost() {
    launchApplied = true;
    if (launchRpm < LAUNCH_RPM_MIN) {
      showLaunchFeedback('bog');
      return LAUNCH_PENALTY_BOG;
    }
    if (launchRpm >= LAUNCH_RPM_SWEET_LOW && launchRpm <= LAUNCH_RPM_SWEET_HIGH) {
      showLaunchFeedback('perfect');
      return LAUNCH_BOOST_PERFECT;
    }
    if (launchRpm > LAUNCH_RPM_SWEET_LOW && launchRpm < LAUNCH_RPM_SPIN) {
      showLaunchFeedback('good');
      return LAUNCH_BOOST_GOOD;
    }
    if (launchRpm >= LAUNCH_RPM_BURNOUT) {
      showLaunchFeedback('burnout');
      triggerExhaustFlame(true);
      triggerExhaustFlame(true);
      return LAUNCH_PENALTY_BURNOUT;
    }
    if (launchRpm >= LAUNCH_RPM_SPIN) {
      showLaunchFeedback('spin');
      return LAUNCH_PENALTY_SPIN;
    }
    // Default: below sweet spot but above bog
    showLaunchFeedback('good');
    return 0.03;
  }

  // ── NOS system ────────────────────────────────────────────
  let nosActive = false;
  let nosCharges = 0;
  const nosBoostHP = pCar.nosBoost || 0;
  const nosDurationPerUse = pCar.nosDuration || 3.0;

  // Calculate NOS charges from parts: 1 charge per 50 boost HP, min 1
  if (nosBoostHP > 0) {
    nosCharges = Math.max(1, Math.ceil(nosBoostHP / 50));
  }
  let nosTimeRemaining = 0;
  let nosUsed = 0;

  function activateNos() {
    if (nosCharges <= 0 || phase !== 'racing') return;
    if (nosActive) return; // already active

    nosCharges--;
    nosUsed++;
    nosActive = true;
    nosTimeRemaining = nosDurationPerUse;

    // Apply boost
    pCar.hp += nosBoostHP;
    pCar.maxPowerW = pCar.hp * 735.5;

    setNosActive(true);
    updateNosCharges(nosCharges);

    // Exhaust flame burst
    triggerExhaustFlame(true);
    triggerExhaustFlame(true);

    // Broadcast
    emitRaceEvent({ type: 'nos', charges: nosCharges });
  }

  function updateNos(dt) {
    if (!nosActive) return;
    nosTimeRemaining -= dt;
    if (nosTimeRemaining <= 0) {
      nosActive = false;
      pCar.hp -= nosBoostHP;
      pCar.maxPowerW = pCar.hp * 735.5;
      setNosActive(false);
    }
  }

  // ── Opponent AI ───────────────────────────────────────────
  const oppSkill = opponentCarIn._botSkill || 'normal';
  const isProBot = oppSkill === 'pro';
  const isPinkSlip = !!opponentCarIn._pinkSlip;

  let oppGear = 0;
  let oppShiftQuality = isPinkSlip
    ? 0.80 + Math.random() * 0.18     // 0.80-0.98: near-perfect shifts
    : isProBot
      ? 0.55 + Math.random() * 0.35
      : 0.30 + Math.random() * 0.40;
  let oppTargetShiftNorm = isPinkSlip
    ? 0.74 + oppShiftQuality * 0.10   // shifts at near-optimal RPM
    : isProBot
      ? 0.72 + oppShiftQuality * 0.10
      : 0.68 + oppShiftQuality * 0.08;
  let oppNextShiftNorm = oppTargetShiftNorm + (Math.random() - 0.5) * (isPinkSlip ? 0.04 : 0.08);
  let oppShiftCooldown = 0;

  // Opponent launch quality (simulates launch RPM) — applied at green light
  const oppLaunchQuality = isPinkSlip
    ? 0.80 + Math.random() * 0.18     // 0.80-0.98: consistently great launches
    : isProBot
      ? 0.6 + Math.random() * 0.3    // 0.6-0.9: good launches
      : 0.2 + Math.random() * 0.5;   // 0.2-0.7: variable

  // Compute opponent's initial speed from launch quality
  const oppLaunchSpeed = computeOppLaunchSpeed(oppLaunchQuality);
  function computeOppLaunchSpeed(quality) {
    if (quality < 0.25) return 0.3;                    // bog
    if (quality >= 0.45 && quality <= 0.60) return 2.3; // perfect
    if (quality > 0.60 && quality < 0.75) return 1.7;  // good
    if (quality >= 0.75 && quality < 0.90) return 1.2;  // spin
    if (quality >= 0.90) return 0.8;                    // burnout
    return 1.5;                                          // good default
  }

  const finishTimes = { player: null, opponent: null };

  // Opponent NOS
  let oppNosActive = false;
  const oppNosBoostHP = oCar.nosBoost || 0;
  const oppNosDurationSec = oCar.nosDuration || 0;

  let lastTime = 0;
  let animId = null;
  let finishTimeoutId = null;
  let finished = false;
  let finishFrameCount = 0;
  let finishPhaseStartTime = 0;
  let pendingFinishResult = null;
  let onFinishCalled = false;

  function safeFinish(result) {
    if (onFinishCalled) return;
    onFinishCalled = true;
    // Apply accumulated engine damage
    if (damageAccumulator > 0) {
      engineDamage = Math.min(1.0, engineDamage + damageAccumulator);
      saveEngineDamage();
    }
    try { onFinish(result); } catch (e) { console.error('[Game] onFinish error:', e); }
  }

  // ── Physics: compute acceleration ─────────────────────────
  function computeAcceleration(speed, gearIdx, car, useRevLimiter) {
    if (gearIdx < 0) return 0;

    const gearMaxSpeed = maxSpeedInGear(gearIdx, car);
    const hardCap = gearMaxSpeed * 0.97;
    if (speed >= hardCap && useRevLimiter) {
      return 0;
    }

    const engineRpm = computeEngineRpm(speed, gearIdx, car);
    const rpmNorm = Math.min(engineRpm / car.redline, 1.0);

    const torqueFactor = powerCurve(rpmNorm);
    let engineTorque = car.maxTorqueNm * torqueFactor;

    // Rev limiter: progressive power cut
    if (useRevLimiter && rpmNorm >= 0.90) {
      const depth = (rpmNorm - 0.90) / 0.10;
      const vibration = 0.5 + 0.5 * Math.sin(performance.now() * 0.094);
      const limiterFactor = 1.0 - depth * 0.92 * vibration;
      engineTorque *= Math.max(limiterFactor, 0.05);
    }

    // Thermal zones: realistic temperature effects
    if (useRevLimiter) {
      let thermalFactor;
      if (engineTemp < 40) {
        thermalFactor = -0.02;
      } else if (engineTemp < TEMP_OPTIMAL_LOW) {
        thermalFactor = 0;
      } else if (engineTemp <= TEMP_OPTIMAL_HIGH) {
        thermalFactor = TEMP_OPTIMAL_BONUS;
      } else if (engineTemp < OVERHEAT_TEMP) {
        thermalFactor = -(engineTemp - TEMP_OPTIMAL_HIGH) * 0.0024;
      } else if (engineTemp < TEMP_CRITICAL) {
        thermalFactor = -0.08 + (engineTemp - OVERHEAT_TEMP) * -0.008;
      } else {
        thermalFactor = -0.20 + (engineTemp - TEMP_CRITICAL) * -0.02;
      }
      engineTorque *= (1.0 + Math.max(thermalFactor, -0.40));
    }

    // Engine damage: progressive power loss
    if (useRevLimiter && engineDamage > 0) {
      // At high damage, engine knocks and misfires — random power dips
      const damageFactor = 1 - engineDamage * 0.5; // up to 50% power loss
      // Add random knock at high damage (>50%)
      if (engineDamage > 0.5 && Math.random() < engineDamage * 0.1) {
        engineTorque *= 0.5; // momentary knock/misfire
      }
      engineTorque *= Math.max(damageFactor, BLOWN_POWER_MULT);
    }

    const totalRatio = car.gearRatios[gearIdx] * car.finalDrive;
    const wheelForce = engineTorque * totalRatio * DRIVETRAIN_LOSS / car.tireRadius;

    const dragForce = 0.5 * AIR_DENSITY * car.cd * car.frontalArea * speed * speed;
    const rollingForce = speed > 0.5 ? ROLLING_RESISTANCE * car.weight * GRAVITY : 0;

    const launchBoost = (speed < 3 && gearIdx === 0 && speed > 0.1) ? 0.5 * (1 - speed / 3) : 0;

    const netForce = wheelForce + launchBoost * car.weight - dragForce - rollingForce;
    let accel = Math.max(netForce / car.weight, 0);

    const tractionMult = car.tractionMultiplier || 1.0;
    const maxTractionAccel = 0.65 * tractionMult * GRAVITY;
    accel = Math.min(accel, maxTractionAccel);

    return accel;
  }

  // ── Player RPM updates ────────────────────────────────────
  function updatePlayerRpm(dt) {
    if (playerSpeed < 1) {
      playerRpmNorm = Math.min(playerRpmNorm + 0.25 * dt, 0.55);
    } else {
      const rpm = computeEngineRpm(playerSpeed, gear, pCar);
      playerRpmNorm = Math.min(rpm / pCar.redline, 1.0);
    }
  }

  // ── Shift handling ────────────────────────────────────────
  function handleShift() {
    if (phase !== 'racing' || shiftCooldown > 0 || gear >= NUM_GEARS - 1) return;
    if (!graceExpired) return;

    if (reactionTime === 0) {
      reactionTime = Math.round(performance.now() - greenTime);
    }

    const rpmNorm = playerRpmNorm;
    let feedbackType, cooldown, penalty;

    if (rpmNorm >= SHIFT_SWEET_LOW && rpmNorm <= SHIFT_SWEET_HIGH + 0.02) {
      feedbackType = 'perfect';
      cooldown = SHIFT_COOLDOWN_PERFECT;
      penalty = 0;
    } else if (rpmNorm > SHIFT_SWEET_HIGH + 0.02 && rpmNorm < SHIFT_REDLINE) {
      feedbackType = 'good';
      cooldown = SHIFT_COOLDOWN_GOOD;
      penalty = 0.05;
    } else if (rpmNorm >= SHIFT_WARN && rpmNorm < SHIFT_SWEET_LOW) {
      feedbackType = 'ok';
      cooldown = SHIFT_COOLDOWN_OK;
      penalty = 0.12;
    } else if (rpmNorm >= SHIFT_REDLINE) {
      feedbackType = 'miss';
      cooldown = SHIFT_COOLDOWN_MISS;
      penalty = 0.22;
    } else {
      feedbackType = 'miss';
      cooldown = SHIFT_COOLDOWN_MISS;
      penalty = 0.20;
    }

    const penaltyReduction = pCar.shiftPenaltyReduction || 0;
    playerSpeed *= (1 - penalty * (1 - penaltyReduction));
    gear++;
    shifts++;
    shiftCooldown = cooldown;

    emitRaceEvent({ type: 'shift', quality: feedbackType });

    const labels = {
      perfect: t('race.perfect') || '¡PERFECTO!',
      good: t('race.shiftGood') || '¡Buen Cambio!',
      ok: t('race.shifted') || 'Cambio OK',
      miss: t('race.missed') || '¡MAL CAMBIO!',
    };
    setShiftButton(labels[feedbackType] || labels.ok, false);
    flashShiftFeedback(feedbackType);
    if (feedbackType === 'perfect' || feedbackType === 'good') {
      triggerExhaustFlame(true);
    }

    const cooldownMs = Math.round(cooldown * 1000);
    setTimeout(() => {
      if (phase === 'racing') setShiftButton(t('race.shift') || '¡CAMBIA!', true);
    }, cooldownMs);
  }

  // ── AI opponent update ────────────────────────────────────
  function updateOpponent(dt) {
    if (oppShiftCooldown > 0) oppShiftCooldown = Math.max(0, oppShiftCooldown - dt);

    const oppRpmNorm = opponentSpeed < 1 ? 0.3
      : Math.min(computeEngineRpm(opponentSpeed, oppGear, oCar) / oCar.redline, 1.0);

    if (oppRpmNorm >= oppNextShiftNorm && oppGear < NUM_GEARS - 1 && oppShiftCooldown <= 0) {
      const quality = oppShiftQuality;
      let penalty;
      if (quality > 0.75) penalty = 0;
      else if (quality > 0.60) penalty = 0.05;
      else if (quality > 0.45) penalty = 0.12;
      else penalty = 0.20;

      opponentSpeed = Math.max(opponentSpeed * (1 - penalty), 0.5);
      oppGear++;
      oppNextShiftNorm = oppTargetShiftNorm + (Math.random() - 0.5) * 0.08;
      oppShiftCooldown = quality > 0.75 ? 0.15 : quality > 0.60 ? 0.25 : 0.35;

      if (quality > 0.70) triggerExhaustFlame(false);
    }

    const accel = computeAcceleration(opponentSpeed, oppGear, oCar, true);
    opponentSpeed += accel * dt;
    const oppCeiling = maxSpeedInGear(oppGear, oCar) * 0.97;
    if (opponentSpeed > oppCeiling) opponentSpeed = oppCeiling;
    opponentPos += opponentSpeed * dt;
  }

  // ── Countdown ─────────────────────────────────────────────
  function startCountdown() {
    // Setup NOS UI if player has NOS
    setupNosUI(nosBoostHP > 0, nosCharges);

    const delays = [900, 900, 900, 700];
    let idx = 0;

    // Start updating launch RPM during countdown
    let countdownAnimId = null;
    let lastCountdownTime = performance.now();

    function countdownLoop(ts) {
      const dt = Math.min((ts - lastCountdownTime) / 1000, 0.05);
      lastCountdownTime = ts;
      updateLaunchRpm(dt);

      // Overwrite tachometer to show launch RPM during countdown
      if (phase === 'countdown' || phase === 'lights') {
        updateTachometer(launchRpm * 100);
        countdownAnimId = requestAnimationFrame(countdownLoop);
      }
    }
    countdownAnimId = requestAnimationFrame(countdownLoop);

    function nextLight() {
      if (idx < 3) {
        setLightState(idx, true);
        setLightInstruction(t('race.waitForGreen'));
        emitRaceEvent({ type: 'light', index: idx });
        idx++;
        setTimeout(nextLight, delays[idx - 1]);
      } else {
        setLightState(3, true);
        emitRaceEvent({ type: 'light', index: 3 });
        greenTime = performance.now();
        greenLightTime = greenTime;
        graceExpired = false;
        raceStartTime = greenTime;
        phase = 'racing';
        // Fade out lights on green
        const lightsContainer = document.querySelector('.lights-container');
        if (lightsContainer) lightsContainer.classList.add('go-anim');
        gear = 0;
        setLightInstruction(t('race.go'));

        // Apply launch boost
        const launchBoost = computeLaunchBoost();
        playerSpeed = Math.max(0, launchBoost * 15); // Convert % to m/s initial burst

        // Apply opponent launch quality — opponent gets initial speed
        opponentSpeed = oppLaunchSpeed;

        setShiftButton(t('race.shift') || '¡CAMBIA!', true);
        // Enable NOS button
        if (nosBoostHP > 0 && nosCharges > 0) {
          const nosBtnEl = document.getElementById('nosBtn');
          if (nosBtnEl) nosBtnEl.disabled = false;
        }

        setTimeout(() => { graceExpired = true; }, GREEN_GRACE_MS);

        if (countdownAnimId) cancelAnimationFrame(countdownAnimId);
        lastTime = performance.now();
        animId = requestAnimationFrame(gameLoop);
      }
    }

    setLightInstruction(t('race.getReady'));
    phase = 'lights';
    setTimeout(nextLight, 600);
  }

  let ultimateSafetyId = null;

  // ── Main game loop ────────────────────────────────────────
  function gameLoop(timestamp) {
    if (phase === 'finishing') {
      finishFrameCount++;

      const finishDt = Math.min((timestamp - lastTime) / 1000, 0.05);
      lastTime = timestamp;
      // Keep BOTH cars moving until they visually cross the finish line.
      // Enforce minimum coast speed so even slow cars reach the checkerboard.
      const MIN_FINISH_SPEED = 18; // m/s — ~65 km/h coasting past the line
      if (playerPos < TRACK_LENGTH) {
        playerSpeed = Math.max(playerSpeed * 0.996, MIN_FINISH_SPEED);
        playerPos += playerSpeed * finishDt;
        if (playerPos > TRACK_LENGTH) playerPos = TRACK_LENGTH;
      }
      if (opponentPos < TRACK_LENGTH) {
        opponentSpeed = Math.max(opponentSpeed * 0.996, MIN_FINISH_SPEED);
        opponentPos += opponentSpeed * finishDt;
        if (opponentPos > TRACK_LENGTH) opponentPos = TRACK_LENGTH;
      }
      const RANGE2 = (FINISH_PCT - START_PCT) - START_OFFSET;
      const pPct2 = START_PCT + START_OFFSET + (playerPos / TRACK_LENGTH) * RANGE2;
      const oPct2 = START_PCT + START_OFFSET + (opponentPos / TRACK_LENGTH) * RANGE2;
      updateRaceProgress(pPct2, oPct2, {
        speed: playerSpeed * 3.6,
        opponentSpeed: opponentSpeed * 3.6,
        rpmNorm: playerRpmNorm,
      });

      // End finishing phase when both cars visually cross the finish line marker
      // Use real-time timeout (4s) instead of frame count — works consistently across devices
      const bothCrossed = playerPos >= TRACK_LENGTH && opponentPos >= TRACK_LENGTH;
      const timedOut = (timestamp - finishPhaseStartTime) >= 4000;
      if (bothCrossed || timedOut) {
        phase = 'finished';
        finishTimeoutId = setTimeout(() => {
          safeFinish(pendingFinishResult);
        }, 2800);
      } else {
        animId = requestAnimationFrame(gameLoop);
      }
      return;
    }

    if (phase !== 'racing') return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    if (shiftCooldown > 0) shiftCooldown = Math.max(0, shiftCooldown - dt);

    const prevPlayerPos = playerPos;
    const prevOpponentPos = opponentPos;

    // Update launch RPM (still running — affects first few seconds)
    if (!launchApplied) updateLaunchRpm(dt);

    // NOS system update
    updateNos(dt);

    // Player physics
    const playerAccel = computeAcceleration(playerSpeed, gear, pCar, true);
    playerSpeed += playerAccel * dt;
    if (gear >= 0) {
      const gearCeiling = maxSpeedInGear(gear, pCar) * 0.97;
      if (playerSpeed > gearCeiling) playerSpeed = gearCeiling;
    }
    playerPos += playerSpeed * dt;

    updatePlayerRpm(dt);

    // Engine temperature update
    updateEngineTemp(dt, playerRpmNorm, nosActive);
    updateTempGauge(engineTemp, overheating);

    // Opponent physics
    if (oppNosBoostHP > 0 && raceStartTime > 0) {
      const oppRaceElapsed = (timestamp - raceStartTime) / 1000;
      const oppShouldBeActive = oppRaceElapsed < oppNosDurationSec;
      if (oppShouldBeActive !== oppNosActive) {
        oppNosActive = oppShouldBeActive;
        if (oppNosActive) {
          oCar.hp += oppNosBoostHP;
          oCar.maxPowerW = oCar.hp * 735.5;
        } else {
          oCar.hp -= oppNosBoostHP;
          oCar.maxPowerW = oCar.hp * 735.5;
        }
      }
    }
    updateOpponent(dt);

    // Visual positions
    const RANGE = (FINISH_PCT - START_PCT) - START_OFFSET;
    const playerPct = START_PCT + START_OFFSET + (playerPos / TRACK_LENGTH) * RANGE;
    const opponentPct = START_PCT + START_OFFSET + (opponentPos / TRACK_LENGTH) * RANGE;
    const playerSpeedKmh = playerSpeed * 3.6;
    const opponentSpeedKmh = opponentSpeed * 3.6;
    updateRaceProgress(playerPct, opponentPct, {
      speed: playerSpeedKmh,
      opponentSpeed: opponentSpeedKmh,
      rpmNorm: playerRpmNorm,
    });
    updateTachometer(playerRpmNorm * 100);
    updateHud(gear + 1, playerSpeedKmh);

    // Rev limiter warning
    if (gear >= 0 && gear < NUM_GEARS - 1 && shiftCooldown <= 0) {
      const ceiling = maxSpeedInGear(gear, pCar) * 0.97;
      if (playerSpeed >= ceiling * 0.99) {
        setShiftButton(t('race.revLimiter') || '¡CAMBIA YA!', true);
      }
    }

    // Broadcast frame for spectators
    frameBroadcastCounter++;
    if (frameBroadcastCounter >= FRAME_BROADCAST_INTERVAL) {
      frameBroadcastCounter = 0;
      emitRaceEvent({
        type: 'frame',
        t: Math.round(timestamp - greenTime),
        pPct: playerPct,
        oPct: opponentPct,
        pSpd: playerSpeedKmh,
        oSpd: opponentSpeedKmh,
        gear: gear + 1,
        rpm: Math.round(playerRpmNorm * 100),
        temp: Math.round(engineTemp),
      });
    }

    // Finish detection
    if (finishTimes.player === null && playerPos >= TRACK_LENGTH) {
      const delta = playerPos - prevPlayerPos;
      const fraction = delta > 0.5 ? (TRACK_LENGTH - prevPlayerPos) / delta : 1;
      finishTimes.player = ((timestamp - greenTime) - dt * (1 - Math.min(Math.max(fraction, 0), 1))) / 1000;
    }
    if (finishTimes.opponent === null && opponentPos >= TRACK_LENGTH) {
      const delta = opponentPos - prevOpponentPos;
      const fraction = delta > 0.5 ? (TRACK_LENGTH - prevOpponentPos) / delta : 1;
      finishTimes.opponent = ((timestamp - greenTime) - dt * (1 - Math.min(Math.max(fraction, 0), 1))) / 1000;
    }

    if (!finished && (finishTimes.player !== null || finishTimes.opponent !== null)) {
      finished = true;
      phase = 'finishing';
      finishFrameCount = 0;
      finishPhaseStartTime = performance.now();
      lastRaceEndTime = performance.now();

      const elapsed = (timestamp - greenTime) / 1000;
      const pTime = finishTimes.player ?? (elapsed + (TRACK_LENGTH - playerPos) / Math.max(playerSpeed, 1));
      const oTime = finishTimes.opponent ?? (elapsed + (TRACK_LENGTH - opponentPos) / Math.max(opponentSpeed, 1));
      const won = pTime <= oTime;

      setShiftButton(won ? t('race.won') : t('race.lost'), false);
      showRaceAnnouncement(won);

      ultimateSafetyId = setTimeout(() => {
        if (!onFinishCalled) {
          console.warn('[Game] Ultimate safety: forcing onFinish');
          safeFinish(pendingFinishResult);
        }
      }, 6000);

      emitRaceEvent({ type: 'race_end', pTime, oTime, won });

      const playerFirst = finishTimes.player !== null && (finishTimes.opponent === null || finishTimes.player <= finishTimes.opponent);
      if (finishTimes.player !== null) {
        triggerFinishCrossing(true, won);
      }
      if (finishTimes.opponent !== null) {
        const oDelay = playerFirst ? 350 : 0;
        setTimeout(() => triggerFinishCrossing(false, !won), oDelay);
      }

      // Engine damage info in result
      const engineDamagePct = engineDamage + damageAccumulator;
      const engineBlown = engineDamagePct >= 1.0;

      pendingFinishResult = {
        playerTime: pTime,
        opponentTime: oTime,
        playerReaction: reactionTime,
        playerShifts: shifts,
        won, jumped,
        playerCar: playerCarIn,
        opponent: opponentCarIn,
        engineDamage: Math.min(1, engineDamagePct),
        engineBlown,
        nosUsed,
      };
      animId = requestAnimationFrame(gameLoop);
      return;
    }

    // Safety timeout: 25 seconds
    const elapsed = (performance.now() - raceStartTime) / 1000;
    if (elapsed >= 25) {
      clearTimeout(ultimateSafetyId);
      phase = 'finished';
      const pProg = Math.min(playerPos / TRACK_LENGTH, 0.99);
      const oProg = Math.min(opponentPos / TRACK_LENGTH, 0.99);
      const won = pProg >= oProg;
      const pTime = elapsed / Math.max(pProg, 0.1);
      const oTime = elapsed / Math.max(oProg, 0.1);

      setShiftButton(won ? t('race.won') : t('race.lost'), false);
      showRaceAnnouncement(won);
      emitRaceEvent({ type: 'race_end', pTime, oTime, won });

      const engineDamagePct = engineDamage + damageAccumulator;
      finishTimeoutId = setTimeout(() => {
        safeFinish({
          playerTime: pTime, opponentTime: oTime,
          playerReaction: reactionTime, playerShifts: shifts,
          won, jumped, playerCar: playerCarIn, opponent: opponentCarIn,
          engineDamage: Math.min(1, engineDamagePct),
          engineBlown: engineDamagePct >= 1.0,
          nosUsed,
        });
      }, 2500);
      return;
    }

    animId = requestAnimationFrame(gameLoop);
  }

  // ── Controls ──────────────────────────────────────────────
  // Shift button
  const shiftBtn = document.getElementById('shiftBtn');
  if (shiftBtn) {
    shiftBtn.addEventListener('click', () => {
      if (phase === 'racing') handleShift();
    });
  }

  // NOS button
  const nosBtn = document.getElementById('nosBtn');
  if (nosBtn) {
    nosBtn.addEventListener('click', () => {
      if (phase === 'racing') activateNos();
    });
  }

  // Keyboard: Space = shift, N or Numpad0 = NOS
  const keyHandler = (e) => {
    if (e.code === 'Space' || e.key === ' ') {
      e.preventDefault();
      if (phase === 'racing') handleShift();
    }
    if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N' || e.code === 'Numpad0') {
      if (phase === 'racing') activateNos();
    }
  };
  document.addEventListener('keydown', keyHandler);

  // Launch RPM: touch/mouse hold on track area during countdown
  const trackArea = document.getElementById('trackArea');
  function onGasDown() { isHoldingGas = true; }
  function onGasUp() { isHoldingGas = false; }
  if (trackArea) {
    trackArea.addEventListener('touchstart', onGasDown, { passive: true });
    trackArea.addEventListener('touchend', onGasUp, { passive: true });
    trackArea.addEventListener('mousedown', onGasDown);
    trackArea.addEventListener('mouseup', onGasUp);
  }

  // Also listen on body for global hold
  document.addEventListener('touchstart', onGasDown, { passive: true });
  document.addEventListener('touchend', onGasUp, { passive: true });

  resetRaceViewState();
  startCountdown();

  return () => {
    if (animId) cancelAnimationFrame(animId);
    if (finishTimeoutId) clearTimeout(finishTimeoutId);
    clearTimeout(ultimateSafetyId);
    document.removeEventListener('keydown', keyHandler);
    document.removeEventListener('touchstart', onGasDown);
    document.removeEventListener('touchend', onGasUp);
    if (trackArea) {
      trackArea.removeEventListener('touchstart', onGasDown);
      trackArea.removeEventListener('touchend', onGasUp);
      trackArea.removeEventListener('mousedown', onGasDown);
      trackArea.removeEventListener('mouseup', onGasUp);
    }
    raceBroadcaster = null;
    frameBroadcastCounter = 0;
  };
}
