#!/usr/bin/env node
// Scrape vanilla Balatro jokers from the JokerDisplay mod's LUA source on GitHub,
// merge with the hand-curated triggers in src/data/jokers.json, and write back.
//
// Curated entries (those without `_stub: true`) are preserved verbatim — the
// scraper only adds missing jokers as stubs. Re-run any time the source updates.
//
// Usage:  node scripts/scrape-jokers.mjs
//         node scripts/scrape-jokers.mjs --dry-run

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TARGET = path.resolve(__dirname, '..', 'src', 'data', 'jokers.json');
const SOURCE_URL =
  'https://raw.githubusercontent.com/nh6574/JokerDisplay/main/definitions/display_definitions.lua';

const RARITY_DEFAULT = 'common';
const COST_DEFAULT = 5;

const dryRun = process.argv.includes('--dry-run');

async function fetchLua() {
  const res = await fetch(SOURCE_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`fetch failed: ${res.status} ${res.statusText}`);
  return res.text();
}

function parseJokers(lua) {
  // Each entry: `j_<id> = { -- <Display Name>`
  const re = /^\s*j_([a-z0-9_]+)\s*=\s*\{\s*--\s*(.+?)\s*$/gm;
  const out = [];
  let m;
  while ((m = re.exec(lua))) {
    const id = normalizeId(m[1]);
    const name = m[2].trim();
    out.push({ id, name });
  }
  return dedupe(out);
}

function normalizeId(rawId) {
  // Map upstream joker IDs to the canonical IDs used in our jokers.json.
  const remap = {
    // upstream typos
    gluttenous_joker: 'gluttonous_joker',
    selzer: 'seltzer',
    caino: 'canio',
    // upstream uses bare names; we suffix common short ones with _joker
    crazy: 'crazy_joker', droll: 'droll_joker', sly: 'sly_joker', wily: 'wily_joker',
    clever: 'clever_joker', devious: 'devious_joker', crafty: 'crafty_joker',
    half: 'half_joker', jolly: 'jolly_joker', zany: 'zany_joker', mad: 'mad_joker',
    burnt: 'burnt_joker', glass: 'glass_joker', stone: 'stone_joker',
    business: 'business_card', square: 'square_joker', smeared: 'smeared_joker',
    smiley: 'smiley_face', ceremonial: 'ceremonial_dagger', credit_card: 'credit_card',
    stencil: 'joker_stencil',
    '8_ball': 'eight_ball',
    // "The X" jokers — upstream drops the article
    idol: 'the_idol', duo: 'the_duo', trio: 'the_trio', family: 'the_family',
    order: 'the_order', tribe: 'the_tribe',
  };
  return remap[rawId] || rawId;
}

function dedupe(list) {
  const seen = new Set();
  const out = [];
  for (const j of list) {
    if (seen.has(j.id)) continue;
    seen.add(j.id);
    out.push(j);
  }
  return out;
}

function loadExisting() {
  const raw = fs.readFileSync(TARGET, 'utf8');
  return JSON.parse(raw);
}

function makeStub({ id, name }) {
  return {
    id,
    name,
    rarity: RARITY_DEFAULT,
    cost: COST_DEFAULT,
    effect: `(stub — needs effect text and trigger; see balatrowiki.org/w/${name.replace(/ /g, '_')})`,
    trigger: { when: 'passive', effects: [] },
    _stub: true,
  };
}

function merge(existing, scraped) {
  const byId = new Map(existing.map((j) => [j.id, j]));
  let added = 0;
  for (const s of scraped) {
    if (byId.has(s.id)) continue;
    byId.set(s.id, makeStub(s));
    added++;
  }
  // Sort: curated first (insertion order preserved among existing), stubs alphabetical at the end
  const curated = existing.slice();
  const stubs = [...byId.values()]
    .filter((j) => j._stub && !existing.find((e) => e.id === j.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { merged: [...curated, ...stubs], added };
}

async function main() {
  console.log(`scrape-jokers: fetching ${SOURCE_URL}`);
  let lua;
  try {
    lua = await fetchLua();
  } catch (e) {
    console.error('fetch failed:', e.message);
    process.exit(1);
  }
  const scraped = parseJokers(lua);
  console.log(`scrape-jokers: parsed ${scraped.length} jokers from upstream`);

  const existing = loadExisting();
  const curatedCount = existing.filter((j) => !j._stub).length;
  const { merged, added } = merge(existing, scraped);

  const stubCount = merged.filter((j) => j._stub).length;
  console.log(
    `scrape-jokers: curated=${curatedCount}, stubs=${stubCount}, total=${merged.length} (+${added} new)`
  );

  if (dryRun) {
    console.log('--dry-run: not writing');
    return;
  }

  fs.writeFileSync(TARGET, JSON.stringify(merged, null, 2) + '\n', 'utf8');
  console.log(`scrape-jokers: wrote ${TARGET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
