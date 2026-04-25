import { RANK_VALUE, effectiveSuit } from './cards.js';

export const HAND_TYPES = [
  'high_card',
  'pair',
  'two_pair',
  'three_of_a_kind',
  'straight',
  'flush',
  'full_house',
  'four_of_a_kind',
  'straight_flush',
  'royal_flush',
  'five_of_a_kind',
  'flush_house',
  'flush_five',
];

export const HAND_LABEL = {
  high_card: 'High Card',
  pair: 'Pair',
  two_pair: 'Two Pair',
  three_of_a_kind: 'Three of a Kind',
  straight: 'Straight',
  flush: 'Flush',
  full_house: 'Full House',
  four_of_a_kind: 'Four of a Kind',
  straight_flush: 'Straight Flush',
  royal_flush: 'Royal Flush',
  five_of_a_kind: 'Five of a Kind',
  flush_house: 'Flush House',
  flush_five: 'Flush Five',
};

export const BASE_HAND = {
  high_card:        { chips: 5,   mult: 1 },
  pair:             { chips: 10,  mult: 2 },
  two_pair:         { chips: 20,  mult: 2 },
  three_of_a_kind:  { chips: 30,  mult: 3 },
  straight:         { chips: 30,  mult: 4 },
  flush:            { chips: 35,  mult: 4 },
  full_house:       { chips: 40,  mult: 4 },
  four_of_a_kind:   { chips: 60,  mult: 7 },
  straight_flush:   { chips: 100, mult: 8 },
  royal_flush:      { chips: 100, mult: 8 },
  five_of_a_kind:   { chips: 120, mult: 12 },
  flush_house:      { chips: 140, mult: 14 },
  flush_five:       { chips: 160, mult: 16 },
};

function groupByRank(cards) {
  const groups = new Map();
  for (const c of cards) {
    if (c.enhancement === 'stone') continue;
    groups.set(c.rank, (groups.get(c.rank) || 0) + 1);
  }
  return groups;
}

function isFlush(cards, opts) {
  const nonStone = cards.filter((c) => c.enhancement !== 'stone');
  const needed = opts?.fourfingers ? 4 : 5;
  if (nonStone.length < needed) return false;
  if (nonStone.length > 5) return false;

  const suitCounts = {};
  let wildCount = 0;
  for (const c of nonStone) {
    const s = effectiveSuit(c, opts);
    if (s === 'wild') {
      wildCount++;
      continue;
    }
    suitCounts[s] = (suitCounts[s] || 0) + 1;
  }
  if (wildCount >= needed) return true;
  for (const count of Object.values(suitCounts)) {
    if (count + wildCount >= needed) return true;
  }
  return false;
}

function isStraight(cards, { shortcut = false, fourfingers = false } = {}) {
  const nonStone = cards.filter((c) => c.enhancement !== 'stone');
  const needed = fourfingers ? 4 : 5;
  if (nonStone.length < needed) return false;
  if (nonStone.length > 5) return false;

  const values = [...new Set(nonStone.map((c) => RANK_VALUE[c.rank]))].sort((a, b) => a - b);
  if (values.length !== nonStone.length) return false;

  if (nonStone.length === needed) {
    const maxGap = shortcut ? 2 : 1;
    for (let i = 1; i < values.length; i++) {
      if (values[i] - values[i - 1] > maxGap) return false;
    }
    return true;
  }
  return false;
}

function isAceLowStraight(cards, opts) {
  const hasAce = cards.some((c) => c.rank === 'A');
  if (!hasAce) return false;
  const mapped = cards.map((c) => (c.rank === 'A' ? { ...c, rank: '1_' } : c));
  const values = mapped
    .filter((c) => c.enhancement !== 'stone')
    .map((c) => (c.rank === '1_' ? 1 : RANK_VALUE[c.rank]))
    .sort((a, b) => a - b);
  const uniq = [...new Set(values)];
  if (uniq.length !== values.length) return false;
  const needed = opts.fourfingers ? 4 : 5;
  if (uniq.length < needed) return false;
  const maxGap = opts.shortcut ? 2 : 1;
  for (let i = 1; i < uniq.length; i++) {
    if (uniq[i] - uniq[i - 1] > maxGap) return false;
  }
  return true;
}

export function classifyHand(cards, opts = {}) {
  if (!cards || cards.length === 0) return { type: 'high_card', scored: [] };

  const n = cards.length;
  const rankGroups = groupByRank(cards);
  const counts = [...rankGroups.values()].sort((a, b) => b - a);
  const flush = isFlush(cards, opts);
  const straight = isStraight(cards, opts) || isAceLowStraight(cards, opts);

  const has5OfAKind = counts[0] >= 5;
  const has4OfAKind = counts[0] >= 4;
  const has3OfAKind = counts[0] >= 3;
  const pairCount = counts.filter((c) => c >= 2).length;
  const tripleAndPair = counts[0] >= 3 && counts[1] >= 2;
  const allSameRank = rankGroups.size === 1 && counts[0] >= 5;

  let type = 'high_card';
  if (flush && allSameRank) type = 'flush_five';
  else if (flush && tripleAndPair) type = 'flush_house';
  else if (has5OfAKind) type = 'five_of_a_kind';
  else if (flush && straight) type = 'straight_flush';
  else if (has4OfAKind) type = 'four_of_a_kind';
  else if (tripleAndPair) type = 'full_house';
  else if (flush) type = 'flush';
  else if (straight) type = 'straight';
  else if (has3OfAKind) type = 'three_of_a_kind';
  else if (pairCount >= 2) type = 'two_pair';
  else if (pairCount === 1) type = 'pair';

  const scored = scoredCards(cards, type);
  return { type, scored };
}

export function scoredCards(cards, type) {
  const stones = cards.filter((c) => c.enhancement === 'stone');
  const non = cards.filter((c) => c.enhancement !== 'stone');

  let scoringNon = [];
  switch (type) {
    case 'flush':
    case 'straight':
    case 'straight_flush':
    case 'royal_flush':
    case 'flush_house':
    case 'full_house':
    case 'flush_five':
    case 'five_of_a_kind':
      scoringNon = non;
      break;
    case 'four_of_a_kind':
    case 'three_of_a_kind':
    case 'pair':
    case 'two_pair': {
      const counts = new Map();
      for (const c of non) counts.set(c.rank, (counts.get(c.rank) || 0) + 1);
      const threshold = type === 'pair' || type === 'two_pair' ? 2 : type === 'three_of_a_kind' ? 3 : 4;
      const scoringRanks = new Set([...counts.entries()].filter(([, v]) => v >= threshold).map(([k]) => k));
      scoringNon = non.filter((c) => scoringRanks.has(c.rank));
      break;
    }
    case 'high_card':
    default: {
      const top = [...non].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank])[0];
      scoringNon = top ? [top] : [];
      break;
    }
  }
  return [...scoringNon, ...stones];
}

export function containsHand(type, target) {
  const contains = {
    high_card:        ['high_card'],
    pair:             ['pair', 'two_pair', 'three_of_a_kind', 'full_house', 'four_of_a_kind', 'five_of_a_kind', 'flush_house', 'flush_five'],
    two_pair:         ['two_pair', 'full_house', 'flush_house'],
    three_of_a_kind:  ['three_of_a_kind', 'full_house', 'four_of_a_kind', 'five_of_a_kind', 'flush_house', 'flush_five'],
    straight:         ['straight', 'straight_flush', 'royal_flush'],
    flush:            ['flush', 'straight_flush', 'royal_flush', 'flush_house', 'flush_five'],
    full_house:       ['full_house', 'flush_house'],
    four_of_a_kind:   ['four_of_a_kind', 'five_of_a_kind', 'flush_five'],
    straight_flush:   ['straight_flush', 'royal_flush'],
    five_of_a_kind:   ['five_of_a_kind', 'flush_five'],
    flush_house:      ['flush_house'],
    flush_five:       ['flush_five'],
  };
  return (contains[target] || []).includes(type);
}
