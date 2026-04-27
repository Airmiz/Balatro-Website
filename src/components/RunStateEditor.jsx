import React from 'react';
import bosses from '../data/bosses.json';
import vouchers from '../data/vouchers.json';
import { HAND_TYPES, HAND_LABEL } from '../engine/hands.js';

function Stepper({ label, value, onChange, min = 0, max = 999, step = 1, big = false }) {
  return (
    <div className="flex items-center justify-between gap-2 bg-ink-700 rounded-lg p-2">
      <div className="text-sm font-semibold text-white/80">{label}</div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="tap min-w-[40px] min-h-[40px] rounded bg-ink-600 text-lg font-bold"
        >
          −
        </button>
        <span className={`min-w-[48px] text-center font-bold ${big ? 'text-lg' : ''}`}>{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          className="tap min-w-[40px] min-h-[40px] rounded bg-ink-600 text-lg font-bold"
        >
          +
        </button>
      </div>
    </div>
  );
}

export default function RunStateEditor({ run, handLevels, onRunChange, onHandLevelsChange }) {
  const set = (patch) => onRunChange({ ...run, ...patch });

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Ante & Blind</div>
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Ante" value={run.ante} onChange={(v) => set({ ante: v })} min={1} max={8} />
          <div className="bg-ink-700 rounded-lg p-2">
            <div className="text-sm font-semibold text-white/80 mb-1">Blind</div>
            <div className="grid grid-cols-3 gap-1">
              {['small', 'big', 'boss'].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => set({ blindType: b, bossId: b === 'boss' ? run.bossId : null })}
                  className={[
                    'tap min-h-[40px] rounded text-xs font-bold capitalize',
                    run.blindType === b ? 'bg-accent-gold text-ink-900' : 'bg-ink-600 text-white',
                  ].join(' ')}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {run.blindType === 'boss' && (
        <div>
          <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Boss blind</div>
          <div className="grid grid-cols-2 gap-1.5">
            {bosses.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => set({ bossId: b.id })}
                className={[
                  'tap min-h-[56px] rounded-lg px-2 py-1 text-left',
                  run.bossId === b.id ? 'bg-accent-red/40 ring-2 ring-accent-red' : 'bg-ink-700',
                ].join(' ')}
              >
                <div className="font-bold text-sm">{b.name}</div>
                <div className="text-[10px] text-white/60 leading-tight line-clamp-2">{b.effect}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Round stats</div>
        <div className="grid grid-cols-2 gap-2">
          <Stepper label="Chips needed" value={run.chipsNeeded} onChange={(v) => set({ chipsNeeded: v })} step={50} max={1000000} />
          <Stepper label="Chips scored" value={run.chipsScored} onChange={(v) => set({ chipsScored: v })} step={50} max={1000000} />
          <Stepper label="Hands left" value={run.handsLeft} onChange={(v) => set({ handsLeft: v })} min={0} max={20} />
          <Stepper label="Discards left" value={run.discardsLeft} onChange={(v) => set({ discardsLeft: v })} min={0} max={20} />
          <Stepper label="Money" value={run.money} onChange={(v) => set({ money: v })} min={-20} max={999} />
          <Stepper label="Deck remaining" value={run.deckRemaining} onChange={(v) => set({ deckRemaining: v })} max={120} />
          <Stepper label="Deck total" value={run.deckTotalCards ?? 52} onChange={(v) => set({ deckTotalCards: v })} min={0} max={120} />
          <Stepper label="Joker slots" value={run.maxJokerSlots ?? 5} onChange={(v) => set({ maxJokerSlots: v })} min={1} max={10} />
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Hand levels & times played</div>
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-2 gap-y-1 items-center bg-ink-700 rounded-lg p-2">
          <div className="text-[10px] uppercase tracking-wide text-white/40">Hand</div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 text-center">Lvl</div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 text-center">#</div>
          {HAND_TYPES.map((h) => (
            <React.Fragment key={h}>
              <div className="text-xs font-semibold text-white/80 truncate">{HAND_LABEL[h]}</div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onHandLevelsChange({ ...handLevels, [h]: Math.max(1, (handLevels[h] || 1) - 1) })}
                  className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                >
                  −
                </button>
                <span className="min-w-[22px] text-center text-xs font-bold">{handLevels[h] || 1}</span>
                <button
                  type="button"
                  onClick={() => onHandLevelsChange({ ...handLevels, [h]: (handLevels[h] || 1) + 1 })}
                  className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                >
                  +
                </button>
              </div>
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...(run.timesHandPlayed || {}) };
                    next[h] = Math.max(0, (next[h] || 0) - 1);
                    set({ timesHandPlayed: next });
                  }}
                  className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                >
                  −
                </button>
                <span className="min-w-[22px] text-center text-xs font-bold text-accent-gold">{run.timesHandPlayed?.[h] || 0}</span>
                <button
                  type="button"
                  onClick={() => {
                    const next = { ...(run.timesHandPlayed || {}) };
                    next[h] = (next[h] || 0) + 1;
                    set({ timesHandPlayed: next });
                  }}
                  className="tap min-w-[28px] min-h-[28px] rounded bg-ink-600 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase tracking-wide text-white/60 mb-2">Vouchers</div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto">
          {vouchers.map((v) => {
            const active = run.vouchers?.includes(v.id);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  const next = active ? run.vouchers.filter((x) => x !== v.id) : [...(run.vouchers || []), v.id];
                  set({ vouchers: next });
                }}
                className={[
                  'tap w-full flex items-center gap-2 rounded-lg p-2 text-left',
                  active ? 'bg-accent-gold/20 ring-1 ring-accent-gold' : 'bg-ink-700',
                ].join(' ')}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm capitalize">{v.id.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-white/60 truncate">{v.effect}</div>
                </div>
                {active && <span className="text-xs font-bold text-accent-gold">ON</span>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
