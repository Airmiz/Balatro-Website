import { simulatePlay, getJokerDef } from './score.js';
import { HAND_LABEL } from './hands.js';

function* combinations(arr, k) {
  const n = arr.length;
  if (k > n || k <= 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.slice();
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

function reasonFor(result, jokers, handCards, playedIdx) {
  const parts = [`${HAND_LABEL[result.handType]}${result.scoredCount < result.playedCount ? ` (${result.scoredCount} scoring)` : ''}`];
  const jokerNames = jokers.map((j) => getJokerDef(j.id)?.name).filter(Boolean);
  const key = new Set(jokerNames);
  const synergies = [];
  const played = playedIdx.map((i) => handCards[i]);

  if (key.has('Blueprint') && jokers.length > 1) synergies.push('Blueprint copy');
  if (key.has('Brainstorm') && jokers.length > 1) synergies.push('Brainstorm copy');
  if (key.has('Mime') && handCards.length - played.length > 0) synergies.push('Mime retriggers held');
  if (key.has('Baron') && handCards.some((c, i) => !playedIdx.includes(i) && c.rank === 'K')) synergies.push('Baron on held Kings');
  if (key.has('Shoot the Moon') && handCards.some((c, i) => !playedIdx.includes(i) && c.rank === 'Q')) synergies.push('Shoot the Moon on held Queens');
  if (key.has('Photograph') && played.some((c) => ['J','Q','K'].includes(c.rank))) synergies.push('Photograph x2 on face');
  if (key.has('Sock and Buskin') && played.some((c) => ['J','Q','K'].includes(c.rank))) synergies.push('Sock and Buskin retriggers faces');
  if (key.has('Hanging Chad')) synergies.push('Hanging Chad retriggers first card');
  if (key.has('The Duo') && result.handType !== 'high_card') synergies.push('The Duo x2 on Pair');
  if (key.has('The Trio') && (result.handType === 'three_of_a_kind' || result.handType === 'full_house' || result.handType === 'flush_house' || result.handType === 'four_of_a_kind' || result.handType === 'five_of_a_kind' || result.handType === 'flush_five')) synergies.push('The Trio x3');
  if (key.has('Steel Joker') && played.some((c) => c.enhancement === 'steel')) synergies.push('Steel Joker scales');
  if (played.some((c) => c.enhancement === 'glass')) synergies.push('Glass x2 per card');

  if (synergies.length) parts.push(synergies.slice(0, 2).join(' + '));
  return parts.join(' · ');
}

export function recommend({ handCards, jokers, handLevels, planets, runState, boss, topN = 3 }) {
  const n = handCards.length;
  if (n === 0) return { plays: [], discardSuggestion: null };

  const minSize = boss?.minCards || 1;
  const maxSize = 5;

  const results = [];
  for (let k = Math.max(1, minSize); k <= Math.min(maxSize, n); k++) {
    for (const idx of combinations(handCards, k)) {
      const sim = simulatePlay({ handCards, playedIdx: idx, jokers, handLevels, planets, runState, boss });
      if (sim.illegal) continue;
      results.push({ playedIdx: idx.slice(), ...sim });
    }
  }

  results.sort((a, b) => b.total - a.total);
  const top = results.slice(0, topN).map((r) => ({
    ...r,
    reason: reasonFor(r, jokers, handCards, r.playedIdx),
  }));

  const chipsNeeded = runState?.chipsNeeded ?? 0;
  const handsLeft = runState?.handsLeft ?? 1;
  const discardsLeft = runState?.discardsLeft ?? 0;
  const bestTotal = top[0]?.total ?? 0;

  let discardSuggestion = null;
  if (discardsLeft > 0 && bestTotal > 0) {
    const chipsRemaining = chipsNeeded - (runState?.chipsScored ?? 0);
    const avgNeededPerHand = chipsRemaining / Math.max(1, handsLeft);
    if (bestTotal * 0.6 < avgNeededPerHand && handsLeft > 1) {
      const worstCards = [...handCards]
        .map((c, i) => ({ c, i, score: scoreCardValue(c, jokers) }))
        .sort((a, b) => a.score - b.score)
        .slice(0, Math.min(5, handCards.length))
        .map((x) => x.i);
      discardSuggestion = {
        indices: worstCards,
        reason: `Best play ${bestTotal.toLocaleString()} vs avg ${Math.ceil(avgNeededPerHand).toLocaleString()} needed — discard & redraw.`,
      };
    }
  }

  return { plays: top, discardSuggestion };
}

function scoreCardValue(card, jokers) {
  let v = 0;
  const rank = card.rank;
  const rankVal = { '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,'10':10,J:11,Q:12,K:13,A:14 }[rank];
  v += rankVal;
  if (card.enhancement === 'steel') v += 20;
  if (card.enhancement === 'glass') v += 15;
  if (card.enhancement === 'gold') v += 10;
  if (card.enhancement === 'bonus') v += 5;
  if (card.enhancement === 'mult') v += 10;
  const jids = new Set(jokers.map((j) => j.id));
  if (jids.has('baron') && rank === 'K') v += 50;
  if (jids.has('shoot_the_moon') && rank === 'Q') v += 30;
  return v;
}
