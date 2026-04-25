import React, { useMemo, useState } from 'react';
import jokers from '../data/jokers.json';
import { evaluateShop } from '../engine/shop.js';

const RARITY_COLOR = {
  common: 'bg-ink-600 text-white',
  uncommon: 'bg-accent-green/30 text-accent-green',
  rare: 'bg-accent-red/30 text-accent-red',
  legendary: 'bg-accent-purple/30 text-accent-purple',
};

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : n > 0 ? '+' : '';
  const v = Math.abs(n);
  if (v >= 1e9) return sign + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return sign + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e4) return sign + (v / 1e3).toFixed(1) + 'k';
  return sign + Math.round(v).toLocaleString();
}

export default function ShopPicker({ candidates, onAdd, onRemove, onCostChange, ctx }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const taken = new Set(candidates.map((c) => c.id));
    return jokers
      .filter((j) => !taken.has(j.id))
      .filter((j) =>
        !t ||
        j.name.toLowerCase().includes(t) ||
        j.effect.toLowerCase().includes(t) ||
        j.rarity.includes(t)
      );
  }, [q, candidates]);

  const ranked = useMemo(() => {
    if (candidates.length === 0) return [];
    return evaluateShop(candidates, ctx);
  }, [candidates, ctx]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-ink-700 p-2 text-xs text-white/70 leading-snug">
        Add the jokers in your shop. The engine scores each by playing it on your current hand <em>and</em> 7 archetype hands (flushes, pairs, faces, etc.) to capture synergies you don't currently hold.
        {ctx.currentJokers.length >= 5 && (
          <div className="mt-1 text-accent-gold">You're at the joker cap — results assume you'd sell the worst-fit existing joker.</div>
        )}
      </div>

      {candidates.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Ranked recommendation</div>
          <div className="space-y-1.5">
            {ranked.map((r, idx) => (
              <div
                key={r.id}
                className={[
                  'rounded-lg p-2',
                  idx === 0 ? 'bg-accent-gold/10 border border-accent-gold/40' : 'bg-ink-700',
                  !r.affordable ? 'opacity-60' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/50 w-5 text-center">#{idx + 1}</span>
                  <span className={`chip uppercase ${RARITY_COLOR[r.rarity]}`}>{r.rarity[0]}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate">{r.name}</div>
                    <div className="text-[11px] text-white/60 truncate">{r.reason}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-bold text-sm ${r.weightedDelta > 0 ? 'text-accent-green' : 'text-white/60'}`}>
                      {fmt(r.weightedDelta)}
                    </div>
                    <div className="text-[10px] text-white/50">
                      {r.affordable ? `${fmt(r.valuePerDollar)}/$` : 'too pricey'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(r.id)}
                    className="tap min-w-[36px] min-h-[36px] rounded bg-accent-red/30 text-accent-red font-bold"
                    aria-label="Remove from shop"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5 pl-7">
                  <div className="text-[10px] text-white/50 leading-tight">
                    Hand: {fmt(r.handDelta)} · Archetypes: {fmt(r.archDelta)}
                    {r.replacedName ? ` · sells ${r.replacedName}` : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/50">$</span>
                    <button
                      type="button"
                      onClick={() => onCostChange(r.id, Math.max(0, r.cost - 1))}
                      className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{r.cost}</span>
                    <button
                      type="button"
                      onClick={() => onCostChange(r.id, r.cost + 1)}
                      className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Add a joker from your shop</div>
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
              <div className="text-xs text-white/60 truncate">{j.effect}</div>
            </div>
            <span className="text-xs font-bold text-accent-gold">${j.cost}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-white/40 text-sm py-6">
            {candidates.length > 0 ? 'No more jokers match.' : 'Search for the jokers in your shop.'}
          </div>
        )}
      </div>
    </div>
  );
}
