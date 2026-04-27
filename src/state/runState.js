import { HAND_TYPES } from '../engine/hands.js';

const STORAGE_KEY = 'balatro-helper-state-v1';

export function defaultState() {
  const handLevels = {};
  for (const h of HAND_TYPES) handLevels[h] = 1;
  return {
    hand: [],
    jokers: [],
    run: {
      ante: 1,
      blindType: 'small',
      bossId: null,
      chipsNeeded: 300,
      chipsScored: 0,
      handsLeft: 4,
      discardsLeft: 3,
      money: 4,
      deckRemaining: 52,
      deckTotalCards: 52,
      maxJokerSlots: 5,
      deckEnhancementCounts: { steel: 0, stone: 0, gold: 0, glass: 0, lucky: 0 },
      handsPlayedTotal: 0,
      cardsConsumed: 0,
      timesHandPlayed: {},
      jokerCounters: {},
      vouchers: [],
    },
    handLevels,
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    const base = defaultState();
    return {
      ...base,
      ...parsed,
      run: { ...base.run, ...(parsed.run || {}) },
      handLevels: { ...base.handLevels, ...(parsed.handLevels || {}) },
    };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
