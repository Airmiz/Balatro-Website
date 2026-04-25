import React, { useMemo, useState } from 'react';
import jokers from '../data/jokers.json';

const RARITY_COLOR = {
  common: 'bg-ink-600 text-white',
  uncommon: 'bg-accent-green/30 text-accent-green',
  rare: 'bg-accent-red/30 text-accent-red',
  legendary: 'bg-accent-purple/30 text-accent-purple',
};

export default function JokerPicker({ current, onAdd, onRemove, onReorder }) {
  const [q, setQ] = useState('');
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return jokers;
    return jokers.filter(
      (j) =>
        j.name.toLowerCase().includes(t) ||
        j.effect.toLowerCase().includes(t) ||
        j.rarity.includes(t)
    );
  }, [q]);

  return (
    <div className="space-y-3">
      {current.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Your jokers (left to right)</div>
          <div className="space-y-1.5">
            {current.map((j, i) => {
              const def = jokers.find((x) => x.id === j.id);
              if (!def) return null;
              return (
                <div key={`${j.id}-${i}`} className="flex items-center gap-2 bg-ink-700 rounded-lg p-2">
                  <span className="text-xs font-bold text-white/60 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{def.name}</div>
                    <div className="text-xs text-white/60 truncate">{def.effect}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReorder(i, i - 1)}
                    disabled={i === 0}
                    className="tap min-w-[36px] min-h-[36px] rounded bg-ink-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => onReorder(i, i + 1)}
                    disabled={i === current.length - 1}
                    className="tap min-w-[36px] min-h-[36px] rounded bg-ink-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="tap min-w-[36px] min-h-[36px] rounded bg-accent-red/30 text-accent-red font-bold"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Add joker</div>
        <input
          type="search"
          inputMode="search"
          placeholder="Search name or effect…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full min-h-[48px] rounded-lg bg-ink-700 px-3 text-base text-white placeholder:text-white/40 outline-none focus:ring-2 focus:ring-accent-gold"
        />
      </div>

      <div className="space-y-1.5">
        {filtered.map((j) => (
          <button
            key={j.id}
            type="button"
            onClick={() => onAdd(j.id)}
            className="tap w-full flex items-center gap-2 bg-ink-700 hover:bg-ink-600 rounded-lg p-2 text-left"
          >
            <span className={`chip ${RARITY_COLOR[j.rarity]} uppercase`}>{j.rarity[0]}</span>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm">{j.name}</div>
              <div className="text-xs text-white/60">{j.effect}</div>
            </div>
            <span className="text-xs font-bold text-accent-gold">${j.cost}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-white/40 text-sm py-6">No jokers match.</div>
        )}
      </div>
    </div>
  );
}
