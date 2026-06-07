// Car data for La Calle Racing — humble neighborhood cars
// Physics based on real-world specs for 1.1L-1.8L economy engines
// Thermal properties model real cooling systems:
//   coolEfficiency — radiator/fan effectiveness (1.0 = average, higher = better cooling)
//   heatCoeff — engine heat output (1.0 = average, higher = runs hotter)
//   thermalMass — thermal inertia (1.0 = average, higher = slower temp changes)

export const CARS = [
  {
    id: 'civic95',
    name: 'Honda Civic \'95',
    engine: '1.5L D15B',
    hp: 102,
    peakRpm: 5900,
    redline: 6800,
    weight: 1050,
    torque: 133,
    gearRatios: [3.55, 1.95, 1.25, 0.91, 0.73],
    finalDrive: 4.25,
    tireRadius: 0.30,
    cd: 0.32,
    frontalArea: 1.95,
    color: '#3b82f6',
    accent: '#60a5fa',
    price: 3500,
    description: 'El rey de la calle. Ligero y confiable.',
    // Thermal: Honda reliability, efficient cooling for small displacement
    coolEfficiency: 1.10,
    heatCoeff: 0.90,
    thermalMass: 0.90,
  },
  {
    id: 'sentra98',
    name: 'Nissan Sentra \'98',
    engine: '1.6L GA16DE',
    hp: 115,
    peakRpm: 6000,
    redline: 6800,
    weight: 1150,
    torque: 148,
    gearRatios: [3.33, 1.96, 1.30, 0.97, 0.76],
    finalDrive: 4.06,
    tireRadius: 0.30,
    cd: 0.33,
    frontalArea: 2.0,
    color: '#ef4444',
    accent: '#f87171',
    price: 3800,
    description: 'Motor noble. No falla ni en subida.',
    // Thermal: Balanced Nissan, average cooling across the board
    coolEfficiency: 1.00,
    heatCoeff: 1.00,
    thermalMass: 1.00,
  },
  {
    id: 'jetta97',
    name: 'VW Jetta Clásico',
    engine: '1.8L ABA',
    hp: 115,
    peakRpm: 5400,
    redline: 6200,
    weight: 1150,
    torque: 162,
    gearRatios: [3.45, 1.94, 1.29, 0.91, 0.73],
    finalDrive: 3.89,
    tireRadius: 0.30,
    cd: 0.34,
    frontalArea: 2.0,
    color: '#a855f7',
    accent: '#c084fc',
    price: 4500,
    description: 'Alemanicucho con alma de corredor.',
    // Thermal: German over-engineered radiator, but 1.8L runs hotter
    coolEfficiency: 1.05,
    heatCoeff: 1.10,
    thermalMass: 1.05,
  },
  {
    id: 'corolla94',
    name: 'Toyota Corolla \'94',
    engine: '1.6L 4A-FE',
    hp: 115,
    peakRpm: 5600,
    redline: 6500,
    weight: 1080,
    torque: 145,
    gearRatios: [3.55, 2.05, 1.39, 1.00, 0.82],
    finalDrive: 4.31,
    tireRadius: 0.30,
    cd: 0.32,
    frontalArea: 1.95,
    color: '#22c55e',
    accent: '#4ade80',
    price: 3200,
    description: 'Indestructible y sorprendente. Motor noble Toyota.',
    // Thermal: Legendary Toyota cooling, barely heats up
    coolEfficiency: 1.15,
    heatCoeff: 0.90,
    thermalMass: 0.95,
  },
  {
    id: 'chevy99',
    name: 'Chevy C2 \'99',
    engine: '1.4L SOHC',
    hp: 78,
    peakRpm: 5200,
    redline: 6000,
    weight: 980,
    torque: 110,
    gearRatios: [3.55, 2.05, 1.39, 1.00, 0.82],
    finalDrive: 4.19,
    tireRadius: 0.29,
    cd: 0.35,
    frontalArea: 1.95,
    color: '#f59e0b',
    accent: '#fbbf24',
    price: 2200,
    description: 'El auto del pueblo. Barato y pelón.',
    // Thermal: Tiny engine, basic cooling — volatile temp swings
    coolEfficiency: 0.85,
    heatCoeff: 0.80,
    thermalMass: 0.80,
  },
  {
    id: 'tsuru00',
    name: 'Nissan Tsuru \'00',
    engine: '1.6L GA16DNE',
    hp: 110,
    peakRpm: 6000,
    redline: 6800,
    weight: 1040,
    torque: 145,
    gearRatios: [3.33, 1.96, 1.30, 0.97, 0.76],
    finalDrive: 4.43,
    tireRadius: 0.30,
    cd: 0.33,
    frontalArea: 2.0,
    color: '#06b6d4',
    accent: '#22d3ee',
    price: 2800,
    description: 'El taxista favorito. Rápido en recta.',
    // Thermal: Taxi-grade durability, adequate cooling
    coolEfficiency: 0.95,
    heatCoeff: 1.00,
    thermalMass: 0.95,
  },
  {
    id: 'sprint95',
    name: 'Chevrolet Sprint \'95',
    engine: '1.3L G13B',
    hp: 70,
    peakRpm: 6000,
    redline: 6500,
    weight: 830,
    torque: 107,
    gearRatios: [3.42, 1.89, 1.28, 0.91, 0.73],
    finalDrive: 4.39,
    tireRadius: 0.28,
    cd: 0.34,
    frontalArea: 1.85,
    color: '#e11d48',
    accent: '#fb7185',
    price: 1800,
    description: 'El enano peligroso. Liviano y escurridizo.',
    // Thermal: Tiny Suzuki, minimal cooling capacity — volatile temps
    coolEfficiency: 0.80,
    heatCoeff: 0.75,
    thermalMass: 0.75,
  },
  {
    id: 'renault19',
    name: 'Renault 19 16V \'91',
    engine: '1.8L F7P 16V',
    hp: 137,
    peakRpm: 6000,
    redline: 6700,
    weight: 1110,
    torque: 165,
    gearRatios: [3.36, 1.81, 1.27, 0.93, 0.75],
    finalDrive: 3.94,
    tireRadius: 0.30,
    cd: 0.31,
    frontalArea: 2.0,
    color: '#dc2626',
    accent: '#f87171',
    price: 5500,
    description: 'Europeo furioso. 16 válvulas de puro coraje.',
    // Thermal: 16V runs hot, European design — powerful but toasty
    coolEfficiency: 1.00,
    heatCoeff: 1.15,
    thermalMass: 1.05,
  },
  {
    id: 'corolla87gt',
    name: 'Toyota Corolla GT-S \'87',
    engine: '1.6L 4A-GE DOHC 16V',
    hp: 120,
    peakRpm: 6600,
    redline: 7600,
    weight: 1020,
    torque: 136,
    gearRatios: [3.58, 2.05, 1.33, 0.97, 0.82],
    finalDrive: 4.31,
    tireRadius: 0.30,
    cd: 0.32,
    frontalArea: 1.95,
    color: '#b91c1c',
    accent: '#ef4444',
    price: 5000,
    description: '4A-GE Twin Cam. El clásico que nunca muere.',
    // Thermal: DOHC 16V revs high, more heat than SOHC Toyota
    // but legendary Toyota engineering keeps it in check
    coolEfficiency: 1.05,
    heatCoeff: 1.08,
    thermalMass: 0.95,
  },
];

// ── Physics helpers ──────────────────────────────────────────

export function powerCurve(rpmNorm) {
  if (rpmNorm <= 0.15) return 0.35 + rpmNorm * 2.0;
  if (rpmNorm <= 0.35) return 0.65 + (rpmNorm - 0.15) * 1.25;
  if (rpmNorm <= 0.80) return 0.90 + (rpmNorm - 0.35) * 0.22;
  if (rpmNorm <= 1.0) {
    const t = (rpmNorm - 0.80) / 0.20;
    return 1.0 - t * t * 0.15;
  }
  return 0.50;
}

export function computeEngineRpm(speed, gearIdx, car) {
  if (gearIdx < 0 || gearIdx >= car.gearRatios.length) return 0;
  if (speed < 0.5) return 900;
  const ratio = car.gearRatios[gearIdx] * car.finalDrive;
  return (speed / car.tireRadius) * (ratio / (2 * Math.PI)) * 60;
}

export function maxSpeedInGear(gearIdx, car) {
  if (gearIdx < 0 || gearIdx >= car.gearRatios.length) return 0;
  const ratio = car.gearRatios[gearIdx] * car.finalDrive;
  return (car.redline / 60) * (2 * Math.PI) * car.tireRadius / ratio;
}

export function pickOpponentCar(playerCarId) {
  const available = CARS.filter(c => c.id !== playerCarId);
  return available[Math.floor(Math.random() * available.length)];
}
