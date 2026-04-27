import { describe, it, expect } from 'vitest';
import { simulatePlay } from './score.js';
import { makeCard } from './cards.js';

const baseRun = { handsLeft: 1, discardsLeft: 0, money: 0, deckRemaining: 50, handsPlayedTotal: 0, timesHandPlayed: {}, jokerCounters: {}, deckEnhancementCounts: {}, maxJokerSlots: 5 };

describe('simulatePlay (curated jokers)', () => {
  it('Blackboard fires only when held cards are all spades/clubs', () => {
    const hand = [
      makeCard('A', 'spades'),
      makeCard('K', 'spades'),
      makeCard('Q', 'spades'),
      makeCard('J', 'spades'),
      makeCard('10', 'spades'),
      makeCard('9', 'clubs'),
      makeCard('5', 'hearts'),
    ];
    // play 5 spades → straight flush. Held = 9c + 5h → has hearts → Blackboard does NOT trigger
    const a = simulatePlay({ handCards: hand, playedIdx: [0, 1, 2, 3, 4], jokers: [{ id: 'blackboard' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    // play 5 spades → held 9c, 5h. Blackboard wants ALL held in {spades,clubs}. 5h fails.
    expect(a.xMult).toBe(1);

    // remove the heart, hold only the club
    const hand2 = hand.slice(0, 6);
    const b = simulatePlay({ handCards: hand2, playedIdx: [0, 1, 2, 3, 4], jokers: [{ id: 'blackboard' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    expect(b.xMult).toBe(3);
  });

  it('Flower Pot fires only when scoring hand has all 4 suits', () => {
    const hand = [
      makeCard('K', 'spades'),
      makeCard('K', 'hearts'),
      makeCard('K', 'clubs'),
      makeCard('K', 'diamonds'),
      makeCard('A', 'spades'),
    ];
    const r = simulatePlay({ handCards: hand, playedIdx: [0, 1, 2, 3], jokers: [{ id: 'flower_pot' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    expect(r.xMult).toBe(3);
  });

  it('Joker Stencil multiplies by empty slots', () => {
    const hand = [makeCard('K', 'spades'), makeCard('K', 'hearts')];
    const r = simulatePlay({ handCards: hand, playedIdx: [0, 1], jokers: [{ id: 'joker_stencil' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    // 5 slots - 1 joker held = 4 empty → factor = 1 + 1*4 = 5
    expect(r.xMult).toBe(5);
  });

  it('Splash makes every played card score', () => {
    const hand = [
      makeCard('A', 'hearts'),
      makeCard('K', 'spades'),
      makeCard('5', 'clubs'),
      makeCard('3', 'diamonds'),
    ];
    // No poker hand; high-card scores 1 normally; with Splash all 4 score
    const r1 = simulatePlay({ handCards: hand, playedIdx: [0, 1, 2, 3], jokers: [], handLevels: {}, planets: [], runState: baseRun, boss: null });
    const r2 = simulatePlay({ handCards: hand, playedIdx: [0, 1, 2, 3], jokers: [{ id: 'splash' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    expect(r2.chips).toBeGreaterThan(r1.chips);
  });

  it('Card Sharp triggers only on a repeat hand', () => {
    const hand = [makeCard('K', 'spades'), makeCard('K', 'hearts')];
    // No prior plays of pair → no x mult
    const a = simulatePlay({ handCards: hand, playedIdx: [0, 1], jokers: [{ id: 'card_sharp' }], handLevels: {}, planets: [], runState: baseRun, boss: null });
    expect(a.xMult).toBe(1);
    // With pair previously played
    const run2 = { ...baseRun, timesHandPlayed: { pair: 1 } };
    const b = simulatePlay({ handCards: hand, playedIdx: [0, 1], jokers: [{ id: 'card_sharp' }], handLevels: {}, planets: [], runState: run2, boss: null });
    expect(b.xMult).toBe(3);
  });
});
