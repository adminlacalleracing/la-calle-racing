// economy.js — La Calle Racing Economy Engine
// Wallet, Garage, Rewards, Stakes — foundation for shop, repairs, user accounts

import { CARS } from './cars.js';

// ── Constants ─────────────────────────────────────────────────

export const STARTING_MONEY = 1500;
export const STARTING_CAR = 'civic95';

export const CAR_PRICES = {
  sprint95: 3000,
  chevy99: 3800,
  tsuru00: 5200,
  corolla94: 6500,
  civic95: 7500,
  sentra98: 9000,
  jetta97: 12000,
  renault19: 15000,
  corolla87gt: 11000,
};

export const STAKE_FUN = 'fun';
export const STAKE_CASH = 'cash';
export const STAKE_PINK = 'pink';

export const CASH_STAKES = [100, 500, 1000, 2500];

// Race reward constants
const WIN_BASE = 150;
const WIN_TIME_BONUS_PER_SEC = 25;
const WIN_TIME_BONUS_CAP = 150;
const LOSE_CONSOLATION = 25;

// ── Storage Keys ──────────────────────────────────────────────

const WALLET_KEY = 'playerWallet';
const GARAGE_KEY = 'playerGarage';
const TRANSACTION_LOG_KEY = 'transactionLog';

// ── Wallet ────────────────────────────────────────────────────

export async function loadWallet() {
  try {
    const raw = await window.miniappsAI.storage.getItem(WALLET_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function saveWallet(wallet) {
  try {
    await window.miniappsAI.storage.setItem(WALLET_KEY, JSON.stringify(wallet));
  } catch (e) {
    console.warn('[Economy] Could not save wallet:', e);
  }
}

export async function getBalance() {
  const wallet = await loadWallet();
  return wallet?.balance ?? 0;
}

export async function addMoney(amount, reason = '') {
  const wallet = await loadWallet() || createDefaultWallet();
  wallet.balance += amount;
  wallet.totalEarned += amount;
  wallet.lastTransaction = { amount, reason, time: Date.now() };
  await saveWallet(wallet);
  return wallet;
}

export async function spendMoney(amount, reason = '') {
  const wallet = await loadWallet() || createDefaultWallet();
  if (wallet.balance < amount) return null;
  wallet.balance -= amount;
  wallet.totalSpent += amount;
  wallet.lastTransaction = { amount: -amount, reason, time: Date.now() };
  await saveWallet(wallet);
  return wallet;
}

function createDefaultWallet() {
  return {
    balance: STARTING_MONEY,
    totalEarned: STARTING_MONEY,
    totalSpent: 0,
  };
}

// ── Garage ────────────────────────────────────────────────────

export async function loadGarage() {
  try {
    const raw = await window.miniappsAI.storage.getItem(GARAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function saveGarage(garage) {
  try {
    await window.miniappsAI.storage.setItem(GARAGE_KEY, JSON.stringify(garage));
  } catch (e) {
    console.warn('[Economy] Could not save garage:', e);
  }
}

export async function getOwnedCars() {
  const garage = await loadGarage();
  return garage?.ownedCars || [STARTING_CAR];
}

export async function isCarOwned(carId) {
  const owned = await getOwnedCars();
  return owned.includes(carId);
}

export async function buyCar(carId) {
  const price = CAR_PRICES[carId];
  if (!price) return { success: false, error: 'invalid_car' };

  const owned = await getOwnedCars();
  if (owned.includes(carId)) return { success: false, error: 'already_owned' };

  const wallet = await spendMoney(price, `buy_${carId}`);
  if (!wallet) return { success: false, error: 'not_enough_money' };

  owned.push(carId);
  await saveGarage({ ownedCars: owned });

  logTransaction('car_buy', -price, { carId });
  return { success: true, wallet, ownedCars: owned };
}

export async function addCarToGarage(carId) {
  const owned = await getOwnedCars();
  if (owned.includes(carId)) return owned;
  owned.push(carId);
  await saveGarage({ ownedCars: owned });
  return owned;
}

export async function removeCarFromGarage(carId) {
  const owned = await getOwnedCars();
  const idx = owned.indexOf(carId);
  if (idx === -1) return owned;
  if (owned.length <= 1) return owned; // Can't sell last car
  owned.splice(idx, 1);
  await saveGarage({ ownedCars: owned });
  return owned;
}

// ── Transaction Log ──────────────────────────────────────────

let transactionLog = [];

export async function initTransactionLog() {
  try {
    const raw = await window.miniappsAI.storage.getItem(TRANSACTION_LOG_KEY);
    transactionLog = raw ? JSON.parse(raw) : [];
  } catch {
    transactionLog = [];
  }
}

export function getTransactionLog() {
  return transactionLog;
}

function saveTransactionLog() {
  window.miniappsAI.storage.setItem(TRANSACTION_LOG_KEY, JSON.stringify(transactionLog)).catch(() => {});
}

export function logTransaction(type, amount, meta = {}) {
  transactionLog.push({
    type,
    amount,
    time: Date.now(),
    ...meta,
  });
  // Keep last 50 entries
  if (transactionLog.length > 50) {
    transactionLog = transactionLog.slice(-50);
  }
  saveTransactionLog();
}

// ── Initialize Economy (migration for existing users) ─────────

export async function initEconomy(existingStats) {
  await initTransactionLog();
  const wallet = await loadWallet();
  if (wallet) return; // Already initialized

  // New economy user — starting money + bonus for past races
  const bonus = existingStats ? Math.min(existingStats.total * 50, 3000) : 0;
  const startWallet = {
    balance: STARTING_MONEY + bonus,
    totalEarned: STARTING_MONEY + bonus,
    totalSpent: 0,
  };
  await saveWallet(startWallet);

  const garage = await loadGarage();
  if (!garage) {
    await saveGarage({ ownedCars: [STARTING_CAR] });
  }
}

// ── Race Rewards ──────────────────────────────────────────────

export function calculateRaceReward(result, stake = null, isNewRecord = false) {
  const stakeType = stake?.type || STAKE_FUN;
  const stakeAmount = stake?.amount || 0;

  const earnings = {
    raceReward: 0,
    stakeWin: 0,
    stakeLose: 0,
    recordBonus: 0,
    total: 0,
    stakeType,
    stakeAmount,
    won: result.won && !result.jumped,
    jumped: result.jumped,
  };

  if (result.jumped) {
    return earnings; // False start — $0
  }

  if (result.won) {
    earnings.raceReward = WIN_BASE;
    // Time bonus — faster win = more money
    if (result.playerTime && result.opponentTime) {
      const diff = result.opponentTime - result.playerTime;
      const timeBonus = Math.min(diff * WIN_TIME_BONUS_PER_SEC, WIN_TIME_BONUS_CAP);
      earnings.raceReward += Math.round(timeBonus);
    }
    // Stake winnings
    if (stakeType === STAKE_CASH) {
      earnings.stakeWin = stakeAmount;
    }
  } else {
    earnings.raceReward = LOSE_CONSOLATION;
    // Stake loss
    if (stakeType === STAKE_CASH) {
      earnings.stakeLose = stakeAmount;
    }
  }

  // Record bonus — only for wins that set a new personal record
  if (isNewRecord && earnings.won) {
    earnings.recordBonus = 100;
  }

  earnings.total = earnings.raceReward + earnings.stakeWin - earnings.stakeLose;
  return earnings;
}

// ── Apply Race Stake (after race ends) ────────────────────────

export async function applyRaceStake(result, stake, playerCarId, opponentCarId, opponentName = '', isNewRecord = false) {
  const earnings = calculateRaceReward(result, stake, isNewRecord);

  // Apply money changes
  if (earnings.total !== 0) {
    if (earnings.total > 0) {
      await addMoney(earnings.total, earnings.won ? 'race_win' : 'race_consolation');
    } else {
      await spendMoney(Math.abs(earnings.total), 'race_loss');
    }
  }

  // Apply pink slip
  if (stake?.type === STAKE_PINK) {
    if (earnings.won) {
      await addCarToGarage(opponentCarId);
      earnings.pinkSlipWon = opponentCarId;
    } else {
      const owned = await getOwnedCars();
      if (owned.length > 1) {
        await removeCarFromGarage(playerCarId);
        earnings.pinkSlipLost = playerCarId;
      } else {
        earnings.pinkSlipKept = true; // Last car — protected
      }
    }
  }

  // Single transaction entry per race with full context
  if (earnings.total !== 0 || stake?.type === STAKE_PINK || result.jumped) {
    const txType = result.jumped ? 'race_jump' : earnings.won ? 'race_win' : 'race_loss';
    logTransaction(txType, earnings.total, {
      opponent: opponentName,
      stakeMode: stake?.type || STAKE_FUN,
      stakeAmount: stake?.amount || 0,
      playerCarId,
      opponentCarId,
      pinkWon: earnings.pinkSlipWon || null,
      pinkLost: earnings.pinkSlipLost || null,
      pinkKept: earnings.pinkSlipKept || false,
      playerTime: result.playerTime,
      opponentTime: result.opponentTime,
    });
  }

  return earnings;
}

// ── Validate Stake ────────────────────────────────────────────

export async function validateStake(stake, playerCarId) {
  if (!stake || stake.type === STAKE_FUN) return true;

  const balance = await getBalance();

  if (stake.type === STAKE_CASH) {
    return balance >= stake.amount;
  }

  if (stake.type === STAKE_PINK) {
    const owned = await getOwnedCars();
    return owned.includes(playerCarId) && owned.length >= 2;
  }

  return false;
}
