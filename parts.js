// parts.js — Parts & Tuning Shop for La Calle Racing
// Catalog, installed parts storage, upgrade application to car physics
// Each part has realistic thermal effects on engine temperature:
//   coolMod — added to car's coolEfficiency (positive = better cooling)
//   heatMod — multiplied into heatCoeff (positive = runs hotter)
//   thermalMassMod — multiplied into thermalMass
//   nosHeatSpike — extra °C/s of heat during NOS activation

const INSTALLED_PARTS_KEY = 'installedParts';

// ── Parts Catalog ─────────────────────────────────────────
// HP multipliers stack multiplicatively.
// Requires field creates a dependency tree — must install prerequisites first.
export const PARTS = [
  {
    id: 'filter',
    category: 'engine',
    price: 800,
    icon: '🌬️',
    effect: { hpMultiplier: 1.05, coolMod: 0.05 },
    requires: [],
  },
  {
    id: 'exhaust',
    category: 'engine',
    price: 1200,
    icon: '💨',
    effect: { hpMultiplier: 1.08, coolMod: 0.08 },
    requires: [],
  },
  {
    id: 'cams',
    category: 'engine',
    price: 2000,
    icon: '⚙️',
    effect: { hpMultiplier: 1.10, heatMod: 0.05 },
    requires: ['filter'],
  },
  {
    id: 'chip',
    category: 'ecu',
    price: 3500,
    icon: '💻',
    effect: { hpMultiplier: 1.15, heatMod: 0.10 },
    requires: ['exhaust'],
  },
  {
    id: 'intake',
    category: 'engine',
    price: 1500,
    icon: '🌬️',
    effect: { hpMultiplier: 1.07, coolMod: 0.07 },
    requires: [],
  },
  {
    id: 'clutch',
    category: 'transmission',
    price: 1400,
    icon: '🔧',
    effect: { shiftPenaltyReduction: 0.15 },
    requires: [],
  },
  {
    id: 'weight',
    category: 'chassis',
    price: 2500,
    icon: '🪶',
    effect: { weightMultiplier: 0.92, thermalMassMod: -0.08 },
    requires: [],
  },
  {
    id: 'tires',
    category: 'tires',
    price: 1800,
    icon: '🏎️',
    effect: { tractionMultiplier: 1.10 },
    requires: [],
  },
  {
    id: 'turbo',
    category: 'forced_induction',
    price: 8000,
    icon: '🌪️',
    effect: { hpMultiplier: 1.30, heatMod: 0.30, coolMod: -0.05 },
    requires: ['cams', 'chip'],
  },
  {
    id: 'engine_swap',
    category: 'engine',
    price: 12000,
    icon: '🔩',
    effect: { hpMultiplier: 1.25, heatMod: 0.15, coolMod: 0.10, thermalMassMod: 0.10 },
    requires: ['turbo'],
  },
  {
    id: 'nos',
    category: 'nitrous',
    price: 5000,
    icon: '🔥',
    effect: { nosBoost: 50, nosDuration: 3.0, nosHeatSpike: 4.0 },
    requires: ['clutch'],
  },
];

// ── Category display order ────────────────────────────────
export const PART_CATEGORIES = [
  { id: 'engine', icon: '🔧' },
  { id: 'ecu', icon: '💻' },
  { id: 'transmission', icon: '⚙️' },
  { id: 'chassis', icon: '🪶' },
  { id: 'tires', icon: '🏎️' },
  { id: 'forced_induction', icon: '🌪️' },
  { id: 'nitrous', icon: '🔥' },
];

// ── Installed parts storage ───────────────────────────────
// Format: { civic95: ['filter', 'exhaust'], sentra98: [] }
let installedParts = {};

export async function initParts() {
  try {
    const raw = await window.miniappsAI.storage.getItem(INSTALLED_PARTS_KEY);
    installedParts = raw ? JSON.parse(raw) : {};
  } catch {
    installedParts = {};
  }
}

function saveInstalledParts() {
  window.miniappsAI.storage.setItem(INSTALLED_PARTS_KEY, JSON.stringify(installedParts)).catch(() => {});
}

export function getInstalledPartsForCar(carId) {
  return installedParts[carId] || [];
}

export function isPartInstalled(carId, partId) {
  return (installedParts[carId] || []).includes(partId);
}

export function canInstallPart(carId, partId) {
  const part = PARTS.find(p => p.id === partId);
  if (!part) return false;
  if (isPartInstalled(carId, partId)) return false;
  return part.requires.every(reqId => isPartInstalled(carId, reqId));
}

export function getPartById(partId) {
  return PARTS.find(p => p.id === partId);
}

export function getInstalledCount(carId) {
  return (installedParts[carId] || []).length;
}

/**
 * Install a part on a car. Only handles parts storage (not wallet).
 * Caller must handle wallet deduction separately.
 */
export function installPart(carId, partId) {
  const part = getPartById(partId);
  if (!part) return false;
  if (isPartInstalled(carId, partId)) return false;
  if (!canInstallPart(carId, partId)) return false;

  if (!installedParts[carId]) installedParts[carId] = [];
  installedParts[carId].push(partId);
  saveInstalledParts();
  return true;
}

/**
 * Remove all installed parts for a car (e.g. on pink slip loss).
 */
export function removeInstalledParts(carId) {
  delete installedParts[carId];
  saveInstalledParts();
}

/**
 * Compute thermal mods from a part list — shared by applyUpgrades and applyBuild.
 */
function computeThermalMods(car, partIds) {
  let coolBonus = 0;
  let heatBonus = 0;
  let thermalMassMod = 0;
  let nosHeatSpike = 0;

  for (const partId of partIds) {
    const part = getPartById(partId);
    if (!part) continue;
    if (part.effect.coolMod) coolBonus += part.effect.coolMod;
    if (part.effect.heatMod) heatBonus += part.effect.heatMod;
    if (part.effect.thermalMassMod) thermalMassMod += part.effect.thermalMassMod;
    if (part.effect.nosHeatSpike) nosHeatSpike += part.effect.nosHeatSpike;
  }

  const baseCool = car.coolEfficiency || 1.0;
  const baseHeat = car.heatCoeff || 1.0;
  const baseMass = car.thermalMass || 1.0;

  return {
    coolEfficiency: Math.max(0.5, baseCool + coolBonus),
    heatCoeff: Math.max(0.5, baseHeat * (1 + heatBonus)),
    thermalMass: Math.max(0.5, baseMass * (1 + thermalMassMod)),
    nosHeatSpike,
  };
}

/**
 * Apply installed upgrades to a car's effective stats.
 * Returns a new car object with modified stats INCLUDING thermal properties.
 * HP multipliers stack multiplicatively.
 */
export function applyUpgrades(car) {
  const parts = getInstalledPartsForCar(car.id);
  if (parts.length === 0) return car;

  let hp = car.hp;
  let torque = car.torque;
  let weight = car.weight;
  let nosBoost = 0;
  let nosDuration = 0;
  let shiftPenaltyReduction = 0;
  let tractionMultiplier = 1.0;

  for (const partId of parts) {
    const part = getPartById(partId);
    if (!part) continue;

    if (part.effect.hpMultiplier) {
      hp *= part.effect.hpMultiplier;
      torque *= part.effect.hpMultiplier;
    }
    if (part.effect.weightMultiplier) weight *= part.effect.weightMultiplier;
    if (part.effect.nosBoost) nosBoost += part.effect.nosBoost;
    if (part.effect.nosDuration) nosDuration = Math.max(nosDuration, part.effect.nosDuration);
    if (part.effect.shiftPenaltyReduction) shiftPenaltyReduction += part.effect.shiftPenaltyReduction;
    if (part.effect.tractionMultiplier) tractionMultiplier *= part.effect.tractionMultiplier;
  }

  const thermal = computeThermalMods(car, parts);

  return {
    ...car,
    hp: Math.round(hp),
    torque: Math.round(torque),
    weight: Math.round(weight),
    nosBoost,
    nosDuration,
    shiftPenaltyReduction: Math.min(shiftPenaltyReduction, 0.50),
    tractionMultiplier,
    ...thermal,
  };
}

/**
 * Apply upgrades from a specific part ID list to a car.
 * Unlike applyUpgrades(), this doesn't read from storage —
 * used for bot builds and presets.
 */
export function applyBuild(car, partIds) {
  if (!partIds || partIds.length === 0) return car;

  let hp = car.hp;
  let torque = car.torque;
  let weight = car.weight;
  let nosBoost = 0;
  let nosDuration = 0;
  let shiftPenaltyReduction = 0;
  let tractionMultiplier = 1.0;

  for (const partId of partIds) {
    const part = getPartById(partId);
    if (!part) continue;

    if (part.effect.hpMultiplier) {
      hp *= part.effect.hpMultiplier;
      torque *= part.effect.hpMultiplier;
    }
    if (part.effect.weightMultiplier) weight *= part.effect.weightMultiplier;
    if (part.effect.nosBoost) nosBoost += part.effect.nosBoost;
    if (part.effect.nosDuration) nosDuration = Math.max(nosDuration, part.effect.nosDuration);
    if (part.effect.shiftPenaltyReduction) shiftPenaltyReduction += part.effect.shiftPenaltyReduction;
    if (part.effect.tractionMultiplier) tractionMultiplier *= part.effect.tractionMultiplier;
  }

  const thermal = computeThermalMods(car, partIds);

  return {
    ...car,
    hp: Math.round(hp),
    torque: Math.round(torque),
    weight: Math.round(weight),
    nosBoost,
    nosDuration,
    shiftPenaltyReduction: Math.min(shiftPenaltyReduction, 0.50),
    tractionMultiplier,
    ...thermal,
    _hasNOS: nosBoost > 0,
  };
}
