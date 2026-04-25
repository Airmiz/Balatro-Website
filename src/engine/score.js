import { BASE_HAND, classifyHand, containsHand } from './hands.js';
import { RANK_CHIPS, isFace, isEven, isOdd, RANK_VALUE } from './cards.js';
import jokersData from '../data/jokers.json';

const JOKER_INDEX = Object.fromEntries(jokersData.map((j) => [j.id, j]));

export function getJokerDef(id) {
  return JOKER_INDEX[id];
}

export function handLevel(handLevels, type) {
  return handLevels?.[type] ?? 1;
}

export function baseHandStats(type, handLevels, planets = []) {
  const base = BASE_HAND[type] || BASE_HAND.high_card;
  const level = handLevel(handLevels, type);
  let chipsPerLevel = 0;
  let multPerLevel = 0;
  for (const p of planets) {
    if (p.hand === type) {
      chipsPerLevel += p.chipsPerLevel || 0;
      multPerLevel += p.multPerLevel || 0;
    }
  }
  return {
    chips: base.chips + chipsPerLevel * (level - 1),
    mult: base.mult + multPerLevel * (level - 1),
    level,
  };
}

function resolveJokerChain(jokers) {
  const resolved = jokers.map((j) => ({ ...j, def: getJokerDef(j.id) })).filter((j) => j.def);
  const actions = [];
  for (let i = 0; i < resolved.length; i++) {
    const j = resolved[i];
    actions.push({ owner: j, def: j.def });
    const copy = j.def.trigger?.effects?.[0]?.type;
    if (copy === 'copy_right') {
      const target = resolved[i + 1];
      if (target) actions.push({ owner: j, def: target.def, copied: true });
    } else if (copy === 'copy_leftmost') {
      const target = resolved.find((r, idx) => idx !== i);
      if (target) actions.push({ owner: j, def: target.def, copied: true });
    }
  }
  return actions;
}

function passiveFlags(jokers) {
  const flags = { allFace: false, suitMerge: false, bossImmune: false, fourfingers: false, shortcut: false };
  for (const j of jokers) {
    const def = getJokerDef(j.id);
    if (!def) continue;
    for (const eff of def.trigger?.effects || []) {
      if (eff.type === 'all_face') flags.allFace = true;
      if (eff.type === 'suit_merge') flags.suitMerge = true;
      if (eff.type === 'boss_immunity') flags.bossImmune = true;
      if (eff.type === 'fourfingers') flags.fourfingers = true;
      if (eff.type === 'shortcut') flags.shortcut = true;
    }
  }
  return flags;
}

function cardMatchesCondition(card, cond, ctx) {
  if (!cond) return true;
  if (cond.suit) {
    const s = card.enhancement === 'wild' ? 'wild' : card.suit;
    if (s !== 'wild' && !cond.suit.includes(card.suit)) return false;
  }
  if (cond.rank && !cond.rank.includes(card.rank)) return false;
  if (cond.face && !isFace(card, { allFace: ctx.allFace })) return false;
  if (cond.even && !isEven(card)) return false;
  if (cond.odd && !isOdd(card)) return false;
  if (cond.enhancement && !cond.enhancement.includes(card.enhancement)) return false;
  if (cond.firstScored && ctx.firstScoredIndex !== ctx.currentIndex) return false;
  if (cond.firstFace && ctx.firstFaceIndex !== ctx.currentIndex) return false;
  return true;
}

function handMatchesCondition(cond, ctx) {
  if (!cond) return true;
  if (cond.containsHand && !containsHand(ctx.handType, cond.containsHand)) return false;
  if (cond.maxCards != null && ctx.playedCount > cond.maxCards) return false;
  if (cond.minCards != null && ctx.playedCount < cond.minCards) return false;
  return true;
}

function applyEnhancementScoring(card, chips, mult, xMult) {
  let c = chips, m = mult, xm = xMult;
  switch (card.enhancement) {
    case 'bonus':
      c += 30;
      break;
    case 'mult':
      m += 4;
      break;
    case 'glass':
      xm *= 2;
      break;
    case 'stone':
      c += 50;
      break;
    case 'lucky':
      m += 0.2 * 20;
      break;
    default:
      break;
  }
  return { chips: c, mult: m, xMult: xm };
}

function retriggersForCard(card, jokers, ctx) {
  let n = 0;
  for (const j of jokers) {
    const def = getJokerDef(j.id);
    if (!def) continue;
    if (def.trigger?.when !== 'on_scored') continue;
    for (const eff of def.trigger.effects || []) {
      if (eff.type === 'retrigger_scored' && cardMatchesCondition(card, def.trigger.condition, ctx)) {
        n += eff.value || 1;
      }
      if (eff.type === 'retrigger_scored_last_hand' && ctx.lastHandOfRound) {
        n += eff.value || 1;
      }
    }
    if (card.enhancement === 'lucky') {
      // no structural retrigger, just chance
    }
  }
  return n;
}

export function simulatePlay({ handCards, playedIdx, jokers, handLevels, planets, runState, boss }) {
  const played = playedIdx.map((i) => handCards[i]).filter(Boolean);
  const held = handCards.filter((_, i) => !playedIdx.includes(i));

  if (played.length === 0) {
    return { total: 0, chips: 0, mult: 0, handType: 'high_card', breakdown: [], penalties: [] };
  }

  const flags = passiveFlags(jokers);
  const classifyOpts = { suitMerge: flags.suitMerge, fourfingers: flags.fourfingers, shortcut: flags.shortcut };
  const { type: handType, scored } = classifyHand(played, classifyOpts);

  const penalties = [];
  const effectiveBoss = flags.bossImmune ? null : boss;
  const debuffedCards = new Set();
  const baseStatsObj = baseHandStats(handType, handLevels, planets);
  let baseChips = baseStatsObj.chips;
  let baseMult = baseStatsObj.mult;

  if (effectiveBoss) {
    for (const tag of effectiveBoss.tags || []) {
      if (tag === 'debuff_suit') {
        for (const c of played) if (c.suit === effectiveBoss.suit) debuffedCards.add(c.id);
      }
      if (tag === 'debuff_face') {
        for (const c of played) if (isFace(c, { allFace: flags.allFace })) debuffedCards.add(c.id);
      }
      if (tag === 'level_down') {
        const step = (planets.find((p) => p.hand === handType)?.chipsPerLevel) || 0;
        const mstep = (planets.find((p) => p.hand === handType)?.multPerLevel) || 0;
        baseChips = Math.max(0, baseChips - step);
        baseMult = Math.max(1, baseMult - mstep);
        penalties.push('Hand level -1 from boss.');
      }
      if (tag === 'base_halved') {
        baseChips = Math.floor(baseChips / 2);
        baseMult = Math.max(1, Math.floor(baseMult / 2));
        penalties.push('Base Chips/Mult halved.');
      }
      if (tag === 'min_cards' && played.length < (effectiveBoss.minCards || 5)) {
        return { total: 0, chips: 0, mult: 0, handType, breakdown: [], penalties: ['Boss requires 5 cards played.'], illegal: true };
      }
    }
  }

  let chips = baseChips;
  let mult = baseMult;
  let xMult = 1;
  const breakdown = [];
  breakdown.push({ label: `Base ${handType}`, chips: baseChips, mult: baseMult });

  const firstScoredIndex = 0;
  const firstFaceIndex = scored.findIndex((c) => isFace(c, { allFace: flags.allFace }));

  for (let idx = 0; idx < scored.length; idx++) {
    const card = scored[idx];
    if (debuffedCards.has(card.id)) {
      breakdown.push({ label: `${card.rank}${card.suit[0].toUpperCase()} debuffed`, chips: 0, mult: 0 });
      continue;
    }
    let cardChips = card.enhancement === 'stone' ? 0 : (RANK_CHIPS[card.rank] || 0);
    let cardMult = 0;
    let cardXMult = 1;

    const enh = applyEnhancementScoring(card, cardChips, cardMult, cardXMult);
    cardChips = enh.chips;
    cardMult = enh.mult;
    cardXMult = enh.xMult;

    const ctx = {
      handType,
      playedCount: played.length,
      firstScoredIndex,
      firstFaceIndex,
      currentIndex: idx,
      allFace: flags.allFace,
      lastHandOfRound: runState?.handsLeft === 1,
    };

    const jokerContrib = { chips: 0, mult: 0, xMult: 1, money: 0 };
    const actions = resolveJokerChain(jokers);
    for (const act of actions) {
      const def = act.def;
      if (def.trigger?.when !== 'on_scored') continue;
      if (!cardMatchesCondition(card, def.trigger.condition, ctx)) continue;
      for (const eff of def.trigger.effects || []) {
        if (eff.type === 'add_chips') jokerContrib.chips += eff.value;
        else if (eff.type === 'add_mult') jokerContrib.mult += eff.value;
        else if (eff.type === 'x_mult') {
          const p = eff.probability ?? 1;
          jokerContrib.xMult *= 1 + (eff.value - 1) * p;
        } else if (eff.type === 'add_money') jokerContrib.money += eff.value;
        else if (eff.type === 'expected_money') jokerContrib.money += eff.value * 0.5;
      }
    }

    const retriggers = retriggersForCard(card, jokers, ctx);
    const triggerCount = 1 + retriggers;

    chips += (cardChips + jokerContrib.chips) * triggerCount;
    mult += (cardMult + jokerContrib.mult) * triggerCount;
    xMult *= Math.pow(cardXMult * jokerContrib.xMult, triggerCount);

    breakdown.push({
      label: `${card.rank}${card.suit[0].toUpperCase()}${triggerCount > 1 ? ` x${triggerCount}` : ''}`,
      chips: (cardChips + jokerContrib.chips) * triggerCount,
      mult: (cardMult + jokerContrib.mult) * triggerCount,
      xMult: cardXMult * jokerContrib.xMult,
    });
  }

  const heldCtx = { handType, playedCount: played.length, allFace: flags.allFace };
  const mimeCount = jokers.filter((j) => j.id === 'mime').length;
  for (const card of held) {
    const trips = 1 + mimeCount;
    if (card.enhancement === 'steel') {
      const heldXMult = Math.pow(1.5, trips);
      xMult *= heldXMult;
      breakdown.push({ label: `Steel ${card.rank} held`, chips: 0, mult: 0, xMult: heldXMult });
    }
    const actions = resolveJokerChain(jokers);
    let heldChips = 0, heldMult = 0, heldX = 1;
    for (const act of actions) {
      const def = act.def;
      if (def.trigger?.when !== 'on_held_in_hand') continue;
      if (!cardMatchesCondition(card, def.trigger.condition, heldCtx)) continue;
      for (const eff of def.trigger.effects || []) {
        if (eff.type === 'add_mult') heldMult += eff.value;
        else if (eff.type === 'add_chips') heldChips += eff.value;
        else if (eff.type === 'x_mult') heldX *= eff.value;
        else if (eff.type === 'add_mult_from_lowest_held') {
          // handled separately below
        }
      }
    }
    chips += heldChips * trips;
    mult += heldMult * trips;
    xMult *= Math.pow(heldX, trips);
    if (heldChips || heldMult || heldX !== 1) {
      breakdown.push({ label: `${card.rank}${card.suit[0].toUpperCase()} held`, chips: heldChips * trips, mult: heldMult * trips, xMult: Math.pow(heldX, trips) });
    }
  }

  if (jokers.some((j) => j.id === 'raised_fist') && held.length) {
    const lowest = held.reduce((a, b) => (RANK_VALUE[a.rank] <= RANK_VALUE[b.rank] ? a : b));
    const bonus = RANK_VALUE[lowest.rank] * 2;
    mult += bonus;
    breakdown.push({ label: `Raised Fist (${lowest.rank})`, chips: 0, mult: bonus });
  }

  const actions = resolveJokerChain(jokers);
  const handCtx = {
    handType,
    playedCount: played.length,
    remainingDiscards: runState?.discardsLeft ?? 0,
    handsLeft: runState?.handsLeft ?? 1,
    timesHandPlayed: runState?.timesHandPlayed?.[handType] ?? 0,
    allFace: flags.allFace,
  };

  for (const act of actions) {
    const def = act.def;
    if (!def) continue;
    if (def.trigger?.when === 'independent' || def.trigger?.when === 'on_hand_played') {
      if (def.trigger?.when === 'on_hand_played' && !handMatchesCondition(def.trigger.condition, handCtx)) continue;
      for (const eff of def.trigger.effects || []) {
        let label = def.name + (act.copied ? ' (copied)' : '');
        if (eff.type === 'add_chips') {
          chips += eff.value;
          breakdown.push({ label, chips: eff.value, mult: 0 });
        } else if (eff.type === 'add_mult') {
          mult += eff.value;
          breakdown.push({ label, chips: 0, mult: eff.value });
        } else if (eff.type === 'x_mult') {
          const p = eff.probability ?? 1;
          const factor = 1 + (eff.value - 1) * p;
          xMult *= factor;
          breakdown.push({ label, chips: 0, mult: 0, xMult: factor });
        } else if (eff.type === 'add_chips_per' && eff.per === 'remaining_discards') {
          const v = eff.value * handCtx.remainingDiscards;
          chips += v;
          breakdown.push({ label, chips: v, mult: 0 });
        } else if (eff.type === 'add_mult_per_hand_played') {
          const v = (eff.value || 1) * handCtx.timesHandPlayed;
          mult += v;
          breakdown.push({ label, chips: 0, mult: v });
        } else if (eff.type === 'add_chips_per_deck_remaining') {
          const v = eff.value * (runState?.deckRemaining ?? 0);
          chips += v;
          breakdown.push({ label, chips: v, mult: 0 });
        } else if (eff.type === 'add_chips_per_deck_enhancement') {
          const v = eff.value * (runState?.deckEnhancementCounts?.[eff.enhancement] ?? 0);
          chips += v;
          breakdown.push({ label, chips: v, mult: 0 });
        } else if (eff.type === 'x_mult_per_deck_enhancement') {
          const count = runState?.deckEnhancementCounts?.[eff.enhancement] ?? 0;
          const factor = 1 + eff.value * count;
          xMult *= factor;
          breakdown.push({ label, chips: 0, mult: 0, xMult: factor });
        } else if (eff.type === 'add_mult_counter' || eff.type === 'add_chips_counter' || eff.type === 'x_mult_counter') {
          const counter = runState?.jokerCounters?.[def.id] ?? 0;
          if (eff.type === 'add_mult_counter') { mult += counter; breakdown.push({ label, chips: 0, mult: counter }); }
          if (eff.type === 'add_chips_counter') { chips += counter; breakdown.push({ label, chips: counter, mult: 0 }); }
          if (eff.type === 'x_mult_counter') { const f = 1 + counter * (eff.value || 1); xMult *= f; breakdown.push({ label, chips: 0, mult: 0, xMult: f }); }
        } else if (eff.type === 'add_chips_scaling') {
          const decayed = Math.max(0, eff.value - (eff.decayPerHand || 0) * (runState?.handsPlayedTotal || 0));
          chips += decayed;
          breakdown.push({ label, chips: decayed, mult: 0 });
        }
      }
    }
  }

  const total = Math.floor(chips * mult * xMult);

  return {
    total,
    chips,
    mult,
    xMult,
    handType,
    breakdown,
    penalties,
    scoredCount: scored.length,
    playedCount: played.length,
  };
}
