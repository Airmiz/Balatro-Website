import { recommend } from './recommend.js';
import { makeCard } from './cards.js';
import jokersData from '../data/jokers.json';
import planetsData from '../data/planets.json';
import vouchersData from '../data/vouchers.json';
import packsData from '../data/packs.json';
import { HAND_LABEL } from './hands.js';

const JOKER_INDEX = Object.fromEntries(jokersData.map((j) => [j.id, j]));
const PLANET_INDEX = Object.fromEntries(planetsData.map((p) => [p.id, p]));
const VOUCHER_INDEX = Object.fromEntries(vouchersData.map((v) => [v.id, v]));
const PACK_INDEX = Object.fromEntries(packsData.map((p) => [p.id, p]));

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

const ARCH_HAND_TYPE = {
  flush_hearts: 'flush',
  pair_kings:   'pair',
  straight:     'straight',
  full_house:   'full_house',
  four_kind:    'four_of_a_kind',
  all_face:     'high_card',
  low_grind:    'high_card',
};

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

function archMean(jokers, ctx) {
  let total = 0;
  for (const a of ARCHETYPES) total += bestScore(a.cards, jokers, ctx);
  return total / ARCHETYPES.length;
}

function nameFromId(id) {
  return id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- Joker evaluation (also used for pack EV) ----------

// Heuristic shop value (× baseline play score) for utility jokers that have
// no per-hand chip/mult contribution. Used as a fallback when evalJoker
// returns 0 hand-delta and 0 arch-delta, so they don't always rank dead-last.
const JOKER_META_HEURISTIC = {
  // direct-utility small-but-real
  drunkard:    0.30, juggler:     0.25, troubadour:  0.10, paint_brush: 0.25,
  // round-buff jokers
  burglar:     0.55, riff_raff:   0.45, merry_andy:  0.35,
  // money jokers (~$/round → small fraction of avg play score)
  delayed_grat:0.20, golden:      0.25, egg:         0.18, gift:        0.12,
  rocket:      0.35, satellite:   0.28, cloud_9:     0.22, to_the_moon: 0.18,
  faceless:    0.20, mail:        0.18, trading:     0.20, fortune_teller:0.15,
  // shop / probability jokers
  astronomer:  0.28, chaos:       0.18, credit_card: 0.05, hallucination:0.10,
  oops:        0.45, ring_master: 0.20, todo_list:   0.18, vagabond:    0.30,
  // utility one-time
  cartomancer: 0.22, certificate: 0.20, diet_cola:   0.12, dna:         0.30,
  invisible:   0.40, luchador:    0.20, marble:      0.18, matador:     0.30,
  midas_mask:  0.30, mr_bones:    0.25, seance:      0.18, sixth_sense: 0.20,
  space:       0.35, splash:      0.25, superposition:0.22, swashbuckler:0.30,
  burnt_joker: 0.35, turtle_bean: 0.20,
};

function evalJoker(jokerId, ctx) {
  const def = JOKER_INDEX[jokerId];
  if (!def) return null;
  const { currentJokers, hand, baseHand, baseArch, maxSlots } = ctx;

  let bestHand = baseHand;
  let bestArch = baseArch;
  let replacedIdx = -1;
  let replacedName = null;

  if (currentJokers.length < maxSlots) {
    const lineup = [...currentJokers, { id: jokerId }];
    bestHand = bestScore(hand, lineup, ctx);
    bestArch = archMean(lineup, ctx);
  } else {
    let bestSum = -Infinity;
    for (let i = 0; i < currentJokers.length; i++) {
      const lineup = currentJokers.slice();
      lineup[i] = { id: jokerId };
      const h = bestScore(hand, lineup, ctx);
      const a = archMean(lineup, ctx);
      const w = h * 2 + a;
      if (w > bestSum) {
        bestSum = w;
        bestHand = h;
        bestArch = a;
        replacedIdx = i;
        replacedName = JOKER_INDEX[currentJokers[i].id]?.name || null;
      }
    }
  }

  let handDelta = bestHand - baseHand;
  let archDelta = bestArch - baseArch;
  const meta = JOKER_META_HEURISTIC[jokerId];
  if (meta && handDelta === 0 && archDelta === 0) {
    const ref = Math.max(baseHand, baseArch, 100);
    archDelta = ref * meta;
  }

  return {
    handDelta,
    archDelta,
    replacedIdx,
    replacedName,
    def,
  };
}

function jokerSynergyReason(def, currentJokerNames, replacedName) {
  const names = new Set(currentJokerNames);
  const synergies = [];
  if (def.id === 'blueprint' && currentJokerNames.length) synergies.push(`copies ${currentJokerNames[currentJokerNames.length - 1]}`);
  if (def.id === 'brainstorm' && currentJokerNames.length) synergies.push(`copies ${currentJokerNames[0]}`);
  if (def.id === 'mime' && (names.has('Baron') || names.has('Shoot the Moon') || names.has('Raised Fist'))) synergies.push('retriggers held-card jokers');
  if (def.id === 'baron' && (names.has('Mime') || names.has('Blueprint') || names.has('Brainstorm'))) synergies.push('Mime/copy double-dips Kings');
  if (def.id === 'sock_and_buskin' && (names.has('Photograph') || names.has('Smiley Face') || names.has('Scary Face'))) synergies.push('retriggers face-card jokers');
  if (def.id === 'hanging_chad' && (names.has('Photograph') || names.has('Triboulet'))) synergies.push('first-card retrigger stacks');
  if ((def.id === 'the_duo' || def.id === 'the_trio' || def.id === 'the_family' || def.id === 'the_order' || def.id === 'the_tribe') && (names.has('Blueprint') || names.has('Brainstorm'))) synergies.push('copyable X-Mult');
  const parts = [def.rarity];
  if (synergies.length) parts.push(synergies[0]);
  if (replacedName) parts.push(`sells ${replacedName}`);
  return parts.join(' · ');
}

// ---------- Planet evaluation ----------

function evalPlanet(planetId, ctx) {
  const planet = PLANET_INDEX[planetId];
  if (!planet) return null;

  const bumpedLevels = { ...ctx.handLevels, [planet.hand]: (ctx.handLevels[planet.hand] || 1) + 1 };
  const bumpedCtx = { ...ctx, handLevels: bumpedLevels };

  const newHand = bestScore(ctx.hand, ctx.currentJokers, bumpedCtx);
  const newArch = archMean(ctx.currentJokers, bumpedCtx);

  return {
    handDelta: newHand - ctx.baseHand,
    archDelta: newArch - ctx.baseArch,
    label: HAND_LABEL[planet.hand],
    handType: planet.hand,
  };
}

function planetReason(planet, hits) {
  const lvl = (planet && hits != null) ? `lvl ${hits + 1}` : '';
  return `levels ${HAND_LABEL[planet.hand]}${lvl ? ' (' + lvl + ')' : ''}`;
}

// ---------- Voucher evaluation ----------

const VOUCHER_HEURISTIC = {
  overstock: 0.10, overstock_plus: 0.10,
  clearance_sale: 0.06, liquidation: 0.12,
  hone: 0.08, glow_up: 0.18,
  reroll_surplus: 0.06, reroll_glut: 0.10,
  crystal_ball: 0.06, omen_globe: 0.10,
  telescope: 0.18, observatory: 0.45,
  grabber: 1.0, nacho_tong: 1.0,
  wasteful: 0.32, recyclomancy: 0.32,
  tarot_merchant: 0.06, tarot_tycoon: 0.10,
  planet_merchant: 0.10, planet_tycoon: 0.18,
  seed_money: 0.18, money_tree: 0.30,
  blank: 0,
  antimatter: 0.50,
  hieroglyph: 1.5, petroglyph: 1.0,
  directors_cut: 0.05, retcon: 0.15,
  paint_brush: 0.25, palette: 0.25,
};

function evalVoucher(voucherId, ctx) {
  const v = VOUCHER_INDEX[voucherId];
  if (!v) return null;
  const heuristic = VOUCHER_HEURISTIC[voucherId] ?? 0.10;
  const ref = Math.max(ctx.baseHand, ctx.baseArch, 100);
  let weighted = ref * heuristic;
  if (voucherId === 'antimatter' && ctx.currentJokers.length < ctx.maxSlots) {
    weighted = ref * 0.05;
  }
  if ((voucherId === 'hieroglyph' || voucherId === 'petroglyph') && (ctx.runState?.ante || 1) >= 6) {
    weighted *= 0.3;
  }
  return { weighted, effect: v.effect, requires: v.requires };
}

// ---------- Pack EV (Monte Carlo) ----------

function monteCarloPackEV(deltas, n, k, trials = 200) {
  const m = deltas.length;
  if (m === 0) return 0;
  if (n >= m) {
    const sorted = [...deltas].sort((a, b) => b - a);
    let sum = 0;
    for (let i = 0; i < Math.min(k, m); i++) sum += sorted[i];
    return sum;
  }
  let total = 0;
  for (let t = 0; t < trials; t++) {
    const seen = new Set();
    while (seen.size < n) seen.add(Math.floor(Math.random() * m));
    const draws = [...seen].map((i) => deltas[i]).sort((a, b) => b - a);
    for (let i = 0; i < k; i++) total += draws[i] || 0;
  }
  return total / trials;
}

function evalPack(packId, ctx) {
  const pack = PACK_INDEX[packId];
  if (!pack) return null;

  let weighted = 0;
  let breakdown = '';

  if (pack.kind === 'joker') {
    const entries = jokersData.map((j) => {
      const r = ctx._jokerCache[j.id];
      const w = r ? r.handDelta * 2 + r.archDelta : 0;
      return { name: j.name, w };
    });
    const deltas = entries.map((e) => e.w);
    weighted = monteCarloPackEV(deltas, pack.show, pack.pick, 150);
    const top = entries.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.name).join(', ');
    breakdown = `top picks: ${top}`;
  } else if (pack.kind === 'planet') {
    const entries = planetsData.map((p) => {
      const r = ctx._planetCache[p.id];
      const w = r ? r.handDelta * 2 + r.archDelta : 0;
      return { hand: HAND_LABEL[p.hand], w };
    });
    const deltas = entries.map((e) => e.w);
    weighted = monteCarloPackEV(deltas, pack.show, pack.pick, 200);
    const top = entries.sort((a, b) => b.w - a.w).slice(0, 3).map((x) => x.hand).join(', ');
    breakdown = `best targets: ${top}`;
  } else if (pack.kind === 'tarot') {
    const ref = Math.max(ctx.baseHand, ctx.baseArch, 100);
    weighted = ref * 0.18 * pack.pick;
    breakdown = 'enhances cards / converts suits';
  } else if (pack.kind === 'spectral') {
    const ref = Math.max(ctx.baseHand, ctx.baseArch, 100);
    weighted = ref * 0.35 * pack.pick;
    breakdown = 'rare powerful effects';
  } else if (pack.kind === 'card') {
    const ref = Math.max(ctx.baseHand, ctx.baseArch, 100);
    weighted = ref * 0.05 * pack.pick;
    breakdown = 'adds raw cards to deck';
  }

  return { weighted, breakdown, kind: pack.kind, show: pack.show, pick: pack.pick };
}

// ---------- Catalog ----------

export function getCatalog() {
  const items = [];
  for (const j of jokersData) {
    items.push({ type: 'joker', id: j.id, name: j.name, effect: j.effect, cost: j.cost, rarity: j.rarity });
  }
  for (const p of planetsData) {
    items.push({
      type: 'planet',
      id: p.id,
      name: nameFromId(p.id),
      effect: `Levels up ${HAND_LABEL[p.hand]} (+${p.chipsPerLevel} Chips, +${p.multPerLevel} Mult)`,
      cost: p.cost,
    });
  }
  for (const v of vouchersData) {
    items.push({
      type: 'voucher',
      id: v.id,
      name: nameFromId(v.id),
      effect: v.effect,
      cost: v.cost,
      requires: v.requires,
    });
  }
  for (const p of packsData) {
    items.push({
      type: 'pack',
      id: p.id,
      name: p.name,
      effect: `Show ${p.show}, pick ${p.pick} ${p.kind} card${p.pick > 1 ? 's' : ''}`,
      cost: p.cost,
    });
  }
  return items;
}

// ---------- Top-level dispatch ----------

export function evaluateShop(candidates, ctxIn) {
  const { currentJokers, hand, money = Infinity, maxSlots = 5 } = ctxIn;
  const baseHand = bestScore(hand, currentJokers, ctxIn);
  const baseArch = archMean(currentJokers, ctxIn);
  const ctx = { ...ctxIn, currentJokers, hand, baseHand, baseArch, maxSlots, _jokerCache: {}, _planetCache: {} };
  const currentJokerNames = currentJokers.map((j) => JOKER_INDEX[j.id]?.name).filter(Boolean);

  const needsJokerCache = candidates.some((c) => c.type === 'pack' && PACK_INDEX[c.id]?.kind === 'joker');
  const needsPlanetCache = candidates.some((c) => c.type === 'pack' && PACK_INDEX[c.id]?.kind === 'planet');
  if (needsJokerCache) {
    for (const j of jokersData) ctx._jokerCache[j.id] = evalJoker(j.id, ctx);
  }
  if (needsPlanetCache) {
    for (const p of planetsData) ctx._planetCache[p.id] = evalPlanet(p.id, ctx);
  }

  const out = [];
  for (const cand of candidates) {
    const cost = cand.cost;
    let weighted = 0;
    let handDelta = 0;
    let archDelta = 0;
    let reason = '';
    let extra = {};
    let name = cand.id;
    let rarity = null;

    if (cand.type === 'joker') {
      const r = evalJoker(cand.id, ctx);
      if (!r) continue;
      handDelta = r.handDelta;
      archDelta = r.archDelta;
      weighted = hand.length ? handDelta * 2 + archDelta : archDelta * 3;
      name = r.def.name;
      rarity = r.def.rarity;
      reason = jokerSynergyReason(r.def, currentJokerNames, r.replacedName);
      extra = { replacedName: r.replacedName };
    } else if (cand.type === 'planet') {
      const r = evalPlanet(cand.id, ctx);
      if (!r) continue;
      handDelta = r.handDelta;
      archDelta = r.archDelta;
      weighted = hand.length ? handDelta * 2 + archDelta : archDelta * 3;
      name = nameFromId(cand.id);
      reason = `levels ${r.label} +1`;
    } else if (cand.type === 'voucher') {
      const r = evalVoucher(cand.id, ctx);
      if (!r) continue;
      weighted = r.weighted;
      name = nameFromId(cand.id);
      reason = r.effect;
      extra = { requires: r.requires };
    } else if (cand.type === 'pack') {
      const r = evalPack(cand.id, ctx);
      if (!r) continue;
      weighted = r.weighted;
      name = PACK_INDEX[cand.id].name;
      reason = `EV across ${r.show} drawn, pick ${r.pick} · ${r.breakdown}`;
      extra = { kind: r.kind, show: r.show, pick: r.pick };
    } else {
      continue;
    }

    const valuePerDollar = cost > 0 ? weighted / cost : weighted;
    const affordable = cost <= money;
    out.push({
      type: cand.type,
      id: cand.id,
      name,
      rarity,
      cost,
      affordable,
      handDelta,
      archDelta,
      weightedDelta: weighted,
      valuePerDollar,
      reason,
      ...extra,
    });
  }

  out.sort((a, b) => {
    if (a.affordable !== b.affordable) return a.affordable ? -1 : 1;
    return b.weightedDelta - a.weightedDelta;
  });
  return out;
}
