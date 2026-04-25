import React from 'react';

const SUIT_GLYPH = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const SUIT_COLOR = {
  hearts: 'text-suit-hearts',
  diamonds: 'text-suit-diamonds',
  clubs: 'text-suit-clubs',
  spades: 'text-suit-spades',
};

const ENH_LABEL = {
  bonus: 'BON',
  mult: 'MUL',
  wild: 'WLD',
  glass: 'GLS',
  steel: 'STL',
  stone: 'STN',
  gold: 'GLD',
  lucky: 'LKY',
};

const ENH_COLOR = {
  bonus: 'bg-accent-blue/20 text-accent-blue',
  mult: 'bg-accent-red/20 text-accent-red',
  wild: 'bg-accent-purple/20 text-accent-purple',
  glass: 'bg-white/20 text-white',
  steel: 'bg-ink-500 text-white',
  stone: 'bg-ink-500 text-white',
  gold: 'bg-accent-gold/20 text-accent-gold',
  lucky: 'bg-accent-green/20 text-accent-green',
};

export default function Card({ card, selected = false, dimmed = false, onTap, compact = false }) {
  const { rank, suit, enhancement } = card;
  const isStone = enhancement === 'stone';
  return (
    <button
      type="button"
      onClick={onTap}
      className={[
        'tap relative flex flex-col items-center justify-between',
        'rounded-xl border-2 min-w-[48px] min-h-[72px] px-1 py-1.5',
        compact ? 'min-w-[40px] min-h-[56px]' : '',
        selected ? 'border-accent-gold -translate-y-1' : 'border-ink-500',
        dimmed ? 'opacity-40' : '',
        'bg-ink-700 transition-transform duration-75',
      ].join(' ')}
    >
      <span className={`font-extrabold leading-none ${compact ? 'text-sm' : 'text-lg'} ${SUIT_COLOR[suit]}`}>
        {isStone ? '■' : rank}
      </span>
      <span className={`leading-none ${compact ? 'text-base' : 'text-xl'} ${SUIT_COLOR[suit]}`}>
        {isStone ? '' : SUIT_GLYPH[suit]}
      </span>
      {enhancement && enhancement !== 'none' && (
        <span className={`absolute -top-2 -right-2 rounded px-1 text-[10px] font-bold ${ENH_COLOR[enhancement]}`}>
          {ENH_LABEL[enhancement]}
        </span>
      )}
    </button>
  );
}
