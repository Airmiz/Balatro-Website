import { describe, it, expect } from 'vitest';
import { evaluateShop } from './shop.js';
import { makeCard } from './cards.js';
import planets from '../data/planets.json';

const baseCtx = () => ({
  currentJokers: [{ id: 'baron' }, { id: 'mime' }],
  hand: [
    makeCard('A', 'hearts'),
    makeCard('K', 'hearts'),
    makeCard('9', 'hearts'),
    makeCard('5', 'hearts'),
    makeCard('3', 'hearts'),
    makeCard('K', 'spades'),
    makeCard('Q', 'clubs'),
    makeCard('7', 'diamonds'),
  ],
  handLevels: {},
  planets,
  runState: { handsLeft: 3, discardsLeft: 3, chipsNeeded: 600, chipsScored: 0 },
  boss: null,
  money: 20,
});

describe('evaluateShop', () => {
  it('ranks all four item types and finishes quickly', () => {
    const candidates = [
      { type: 'joker',   id: 'shoot_the_moon',  cost: 5 },
      { type: 'planet',  id: 'jupiter',         cost: 3 },
      { type: 'voucher', id: 'grabber',         cost: 10 },
      { type: 'pack',    id: 'buffoon_normal',  cost: 4 },
      { type: 'pack',    id: 'celestial_normal',cost: 4 },
    ];
    const t0 = performance.now();
    const ranked = evaluateShop(candidates, baseCtx());
    const dt = performance.now() - t0;
    expect(ranked.length).toBe(5);
    for (const r of ranked) {
      expect(typeof r.weightedDelta).toBe('number');
      expect(Number.isFinite(r.weightedDelta)).toBe(true);
      expect(typeof r.reason).toBe('string');
    }
    expect(dt).toBeLessThan(2000);
  });

  it('a Jupiter (flush) planet outranks a Pluto (high card) planet for a flush hand', () => {
    const candidates = [
      { type: 'planet', id: 'pluto',   cost: 3 },
      { type: 'planet', id: 'jupiter', cost: 3 },
    ];
    const ranked = evaluateShop(candidates, baseCtx());
    expect(ranked[0].id).toBe('jupiter');
  });

  it('marks unaffordable items lower priority', () => {
    const ctx = { ...baseCtx(), money: 4 };
    const ranked = evaluateShop(
      [
        { type: 'joker', id: 'blueprint', cost: 10 },
        { type: 'pack',  id: 'buffoon_normal', cost: 4 },
      ],
      ctx
    );
    expect(ranked[0].affordable).toBe(true);
    expect(ranked[ranked.length - 1].affordable).toBe(false);
  });
});
