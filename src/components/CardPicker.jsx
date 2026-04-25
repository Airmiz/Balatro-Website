import React, { useState } from 'react';
import { RANKS, SUITS, ENHANCEMENTS, makeCard } from '../engine/cards.js';

const SUIT_GLYPH = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

export default function CardPicker({ onAdd, disabled }) {
  const [rank, setRank] = useState('A');
  const [suit, setSuit] = useState('spades');
  const [enhancement, setEnhancement] = useState('none');

  const add = () => {
    if (disabled) return;
    onAdd(makeCard(rank, suit, enhancement));
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Rank</div>
        <div className="grid grid-cols-7 gap-1.5">
          {RANKS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRank(r)}
              className={[
                'tap min-h-[44px] rounded-lg font-bold text-base',
                rank === r ? 'bg-accent-gold text-ink-900' : 'bg-ink-700 text-white',
              ].join(' ')}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Suit</div>
        <div className="grid grid-cols-4 gap-2">
          {SUITS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSuit(s)}
              className={[
                'tap min-h-[48px] rounded-lg font-bold text-2xl flex items-center justify-center',
                suit === s ? 'ring-2 ring-accent-gold' : '',
                'bg-ink-700',
                SUIT_COLOR[s],
              ].join(' ')}
            >
              {SUIT_GLYPH[s]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Enhancement</div>
        <div className="grid grid-cols-3 gap-2">
          {ENHANCEMENTS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEnhancement(e)}
              className={[
                'tap min-h-[44px] rounded-lg font-semibold text-sm capitalize',
                enhancement === e ? 'bg-accent-purple text-white' : 'bg-ink-700 text-white/80',
              ].join(' ')}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className={[
          'tap w-full min-h-[52px] rounded-xl font-bold text-base',
          disabled ? 'bg-ink-600 text-white/40' : 'bg-accent-green text-ink-900',
        ].join(' ')}
      >
        {disabled ? 'Hand full (8)' : `Add ${rank}${SUIT_GLYPH[suit]}${enhancement !== 'none' ? ' ' + enhancement : ''}`}
      </button>
    </div>
  );
}
