import React, { useMemo, useState } from 'react';
import { evaluateShop, getCatalog } from '../engine/shop.js';

const RARITY_COLOR = {
  common: 'bg-ink-600 text-white',
  uncommon: 'bg-accent-green/30 text-accent-green',
  rare: 'bg-accent-red/30 text-accent-red',
  legendary: 'bg-accent-purple/30 text-accent-purple',
};

const TYPE_COLOR = {
  joker:   'bg-accent-purple/20 text-accent-purple',
  planet:  'bg-accent-blue/20 text-accent-blue',
  voucher: 'bg-accent-gold/20 text-accent-gold',
  pack:    'bg-accent-green/20 text-accent-green',
};

const TYPE_LABEL = { joker: 'JOKER', planet: 'PLANET', voucher: 'VOUCHER', pack: 'PACK' };

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'joker', label: 'Jokers' },
  { id: 'planet', label: 'Planets' },
  { id: 'voucher', label: 'Vouchers' },
  { id: 'pack', label: 'Packs' },
];

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  const sign = n < 0 ? '-' : n > 0 ? '+' : '';
  const v = Math.abs(n);
  if (v >= 1e9) return sign + (v / 1e9).toFixed(1) + 'B';
  if (v >= 1e6) return sign + (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e4) return sign + (v / 1e3).toFixed(1) + 'k';
  return sign + Math.round(v).toLocaleString();
}

const CATALOG = getCatalog();

export default function ShopPicker({ candidates, onAdd, onRemove, onCostChange, ctx }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const taken = new Set(candidates.map((c) => `${c.type}:${c.id}`));
    return CATALOG
      .filter((it) => !taken.has(`${it.type}:${it.id}`))
      .filter((it) => filter === 'all' || it.type === filter)
      .filter((it) =>
        !t ||
        it.name.toLowerCase().includes(t) ||
        it.effect.toLowerCase().includes(t) ||
        it.type.includes(t) ||
        (it.rarity && it.rarity.includes(t))
      );
  }, [q, filter, candidates]);

  const ranked = useMemo(() => {
    if (candidates.length === 0) return [];
    return evaluateShop(candidates, ctx);
  }, [candidates, ctx]);

  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-ink-700 p-2 text-xs text-white/70 leading-snug">
        Add anything in your shop — jokers, planet cards, vouchers, booster packs. Each item is scored against your current hand and 7 archetype hands; pack EV is Monte-Carlo'd over 150–200 trials of best-of-N draws from the pool.
        {ctx.currentJokers.length >= 5 && (
          <div className="mt-1 text-accent-gold">Joker cap hit — joker scores assume you'd sell the worst-fit existing joker.</div>
        )}
      </div>

      {candidates.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Ranked recommendation</div>
          <div className="space-y-1.5">
            {ranked.map((r, idx) => (
              <div
                key={`${r.type}:${r.id}`}
                className={[
                  'rounded-lg p-2',
                  idx === 0 ? 'bg-accent-gold/10 border border-accent-gold/40' : 'bg-ink-700',
                  !r.affordable ? 'opacity-60' : '',
                ].join(' ')}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white/50 w-5 text-center">#{idx + 1}</span>
                  <span className={`chip uppercase ${TYPE_COLOR[r.type]}`}>{TYPE_LABEL[r.type]}</span>
                  {r.rarity && <span className={`chip uppercase ${RARITY_COLOR[r.rarity]}`}>{r.rarity[0]}</span>}
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
                    onClick={() => onRemove(r.type, r.id)}
                    className="tap min-w-[36px] min-h-[36px] rounded bg-accent-red/30 text-accent-red font-bold"
                    aria-label="Remove from shop"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between gap-2 mt-1.5 pl-7">
                  <div className="text-[10px] text-white/50 leading-tight">
                    {r.type === 'joker' || r.type === 'planet' ? `Hand: ${fmt(r.handDelta)} · Arch: ${fmt(r.archDelta)}` : null}
                    {r.type === 'voucher' ? 'passive run-long bonus' : null}
                    {r.type === 'pack' ? `pack EV` : null}
                    {r.replacedName ? ` · sells ${r.replacedName}` : ''}
                    {r.requires ? ` · requires ${r.requires.replace(/_/g, ' ')}` : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-white/50">$</span>
                    <button
                      type="button"
                      onClick={() => onCostChange(r.type, r.id, Math.max(0, r.cost - 1))}
                      className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                    >
                      −
                    </button>
                    <span className="text-xs font-bold w-5 text-center">{r.cost}</span>
                    <button
                      type="button"
                      onClick={() => onCostChange(r.type, r.id, r.cost + 1)}
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
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Add an item from your shop</div>
        <div className="grid grid-cols-5 gap-1 mb-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={[
                'tap min-h-[36px] rounded text-xs font-bold',
                filter === f.id ? 'bg-accent-gold text-ink-900' : 'bg-ink-700 text-white/80',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
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
        {filtered.map((it) => (
          <button
            key={`${it.type}:${it.id}`}
            type="button"
            onClick={() => onAdd(it.type, it.id, it.cost)}
            className="tap w-full flex items-center gap-2 bg-ink-700 hover:bg-ink-600 rounded-lg p-2 text-left"
          >
            <span className={`chip uppercase ${TYPE_COLOR[it.type]}`}>{TYPE_LABEL[it.type]}</span>
            {it.rarity && <span className={`chip uppercase ${RARITY_COLOR[it.rarity]}`}>{it.rarity[0]}</span>}
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{it.name}</div>
              <div className="text-xs text-white/60 truncate">{it.effect}</div>
            </div>
            <span className="text-xs font-bold text-accent-gold">${it.cost}</span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-white/40 text-sm py-6">
            {candidates.length > 0 ? 'No more items match.' : 'Search for what you see in the shop.'}
          </div>
        )}
      </div>
    </div>
  );
}
