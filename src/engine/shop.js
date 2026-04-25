import { recommend } from './recommend.js';
import { makeCard } from './cards.js';
import jokersData from '../data/jokers.json';

const JOKER_INDEX = Object.fromEntries(jokersData.map((j) => [j.id, j]));

function arch(name, cards) {
  return { name, cards: cards.map((c, i) => makeCard(c[0], c[1], c[2] || 'none', `${name}-${i}`)) };
}

const ARCHETYPES = [
  arch('flush_hearts', [['A', 'hearts'], ['K', 'hearts'], ['9', 'hearts'], ['5', 'hearts'], ['3', 'hearts']]),
  arch('pair_kings',   [['K', 'spades'], ['K', 'hearts'], ['9', 'clubs'], ['5', 'diamonds'], ['2', 'spades']]),
  arch('straight',     [['9', 'spades'], ['10', 'hearts'], ['J', 'clubs'], ['Q', 'diamonds'], ['K', 'spades']]),
  arch('full_house',   [['J', 'spades'], ['J', 'hearts'], ['J', 'clubs'], ['8', 'diamonds'], ['8', 'hearts']]),
  arch('four_kind',    [['7', 'spades'], ['7', 'hearts'], ['7', 'clubs'], ['7', 'diamonds'], ['2', 'hearts']]),
  arch('all_face',     [['K', 'spades'], ['K', 'hearts'], ['Q', 'clubs'], ['Q', 'diamonds'], ['J', 'spades']]),
  arch('low_grind',    [['2', 'spades'], ['3', 'hearts'], ['4', 'clubs'], ['5', 'diamonds'], ['6', 'spades']]),
];

function bestScore(hand, jokers, ctx) {
  if (!hand || hand.length === 0) return 0;
  const r = recommend({
    handCards: hand,
    jokers,
    handLevels: ctx.handLevels,
    planets: ctx.planets,
    runState: ctx.runState,
    boss: ctx.boss,
    topN: 1,
  });
  return r.plays[0]?.total || 0;
}

function evaluateLineup(jokers, hand, archScores, ctx) {
  const handScore = bestScore(hand, jokers, ctx);
  let archTotal = 0;
  for (const a of ARCHETYPES) {
    archTotal += bestScore(a.cards, jokers, ctx);
  }
  return { handScore, archScore: archTotal / ARCHETYPES.length };
}

function archBaselines(jokers, ctx) {
  const out = {};
  for (const a of ARCHETYPES) out[a.name] = bestScore(a.cards, jokers, ctx);
  return out;
}

function archMean(jokers, ctx) {
  let total = 0;
  for (const a of ARCHETYPES) total += bestScore(a.cards, jokers, ctx);
  return total / ARCHETYPES.length;
}

function reasonFor(def, currentJokerNames, replacedName) {
  const names = new Set(currentJokerNames);
  const synergies = [];
  if (def.id === 'blueprint' && currentJokerNames.length) synergies.push(`copies ${currentJokerNames[currentJokerNames.length - 1]}`);
  if (def.id === 'brainstorm' && currentJokerNames.length) synergies.push(`copies ${currentJokerNames[0]}`);
  if (def.id === 'mime' && (names.has('Baron') || names.has('Shoot the Moon') || names.has('Raised Fist'))) synergies.push('retriggers held-card jokers');
  if (def.id === 'baron' && (names.has('Mime') || names.has('Blueprint') || names.has('Brainstorm'))) synergies.push('Mime/copy double-dips Kings');
  if (def.id === 'sock_and_buskin' && (names.has('Photograph') || names.has('Smiley Face') || names.has('Scary Face'))) synergies.push('retriggers face-card jokers');
  if (def.id === 'hanging_chad' && (names.has('Photograph') || names.has('Triboulet'))) synergies.push('first-card retrigger stacks');
  if ((def.id === 'the_duo' || def.id === 'the_trio' || def.id === 'the_family' || def.id === 'the_order' || def.id === 'the_tribe') && (names.has('Blueprint') || names.has('Brainstorm'))) synergies.push('copyable X-Mult');
  if (def.id === 'steel_joker' && currentJokerNames.length === 0) synergies.push('scales with Steel deck');
  const parts = [def.rarity];
  if (synergies.length) parts.push(synergies[0]);
  if (replacedName) parts.push(`replaces ${replacedName}`);
  return parts.join(' · ');
}

export function evaluateShop(candidates, ctx) {
  const { currentJokers, hand, money = Infinity, maxSlots = 5 } = ctx;
  const baseHand = bestScore(hand, currentJokers, ctx);
  const baseArch = archMean(currentJokers, ctx);

  const currentJokerNames = currentJokers.map((j) => JOKER_INDEX[j.id]?.name).filter(Boolean);

  const out = [];
  for (const cand of candidates) {
    const def = JOKER_INDEX[cand.id];
    if (!def) continue;
    const cost = cand.cost ?? def.cost ?? 5;

    let bestLineup = null;
    let bestReplaceIdx = -1;
    let replacedName = null;

    if (currentJokers.length < maxSlots) {
      const lineup = [...currentJokers, { id: cand.id }];
      const handScore = bestScore(hand, lineup, ctx);
      const archScore = archMean(lineup, ctx);
      bestLineup = { lineup, handScore, archScore };
    } else {
      let bestSum = -Infinity;
      for (let i = 0; i < currentJokers.length; i++) {
        const lineup = currentJokers.slice();
        lineup[i] = { id: cand.id };
        const handScore = bestScore(hand, lineup, ctx);
        const archScore = archMean(lineup, ctx);
        const weighted = handScore * 2 + archScore;
        if (weighted > bestSum) {
          bestSum = weighted;
          bestLineup = { lineup, handScore, archScore };
          bestReplaceIdx = i;
          replacedName = JOKER_INDEX[currentJokers[i].id]?.name || null;
        }
      }
    }

    const handDelta = bestLineup.handScore - baseHand;
    const archDelta = bestLineup.archScore - baseArch;
    const weightedDelta = (hand.length ? handDelta * 2 + archDelta : archDelta * 3);
    const valuePerDollar = cost > 0 ? weightedDelta / cost : weightedDelta;
    const affordable = cost <= money;

    out.push({
      id: cand.id,
      name: def.name,
      rarity: def.rarity,
      effect: def.effect,
      cost,
      affordable,
      handDelta,
      archDelta,
      weightedDelta,
      valuePerDollar,
      replacedIdx: bestReplaceIdx,
      replacedName,
      reason: reasonFor(def, currentJokerNames, replacedName),
    });
  }

  out.sort((a, b) => {
    if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
    return b.weightedDelta - a.weightedDelta;
  });
  return out;
}
