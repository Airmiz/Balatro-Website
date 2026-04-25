export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];
export const ENHANCEMENTS = ['none', 'bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky'];

export const RANK_VALUE = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 11, Q: 12, K: 13, A: 14,
};

export const RANK_CHIPS = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
  J: 10, Q: 10, K: 10, A: 11,
};

export const FACE_RANKS = new Set(['J', 'Q', 'K']);
export const EVEN_RANKS = new Set(['2', '4', '6', '8', '10']);
export const ODD_RANKS = new Set(['A', '3', '5', '7', '9']);

export function makeCard(rank, suit, enhancement = 'none', id = null) {
  return {
    id: id || `${rank}${suit[0]}${enhancement !== 'none' ? enhancement[0] : ''}-${Math.random().toString(36).slice(2, 7)}`,
    rank,
    suit,
    enhancement,
  };
}

export function isFace(card, { allFace = false } = {}) {
  if (allFace) return true;
  if (card.enhancement === 'stone') return false;
  return FACE_RANKS.has(card.rank);
}

export function isEven(card) {
  if (card.enhancement === 'stone') return false;
  return EVEN_RANKS.has(card.rank);
}

export function isOdd(card) {
  if (card.enhancement === 'stone') return false;
  return ODD_RANKS.has(card.rank);
}

export function effectiveSuit(card, { suitMerge = false } = {}) {
  if (card.enhancement === 'stone') return null;
  if (card.enhancement === 'wild') return 'wild';
  if (!suitMerge) return card.suit;
  if (card.suit === 'hearts' || card.suit === 'diamonds') return 'red';
  return 'black';
}

export function suitsMatch(a, b, opts) {
  const sa = effectiveSuit(a, opts);
  const sb = effectiveSuit(b, opts);
  if (sa === null || sb === null) return false;
  if (sa === 'wild' || sb === 'wild') return true;
  return sa === sb;
}
