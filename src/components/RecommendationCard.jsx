import React from 'react';
import { HAND_LABEL } from '../engine/hands.js';

function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(1) + 'B';
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (Math.abs(n) >= 1e4) return (n / 1e3).toFixed(1) + 'k';
  return Math.round(n).toLocaleString();
}

export default function RecommendationCard({ recommendation, onPreview, onSelectDiscard, previewedIdx, chipsNeeded, chipsScored, handsLeft }) {
  const plays = recommendation?.plays || [];
  const discard = recommendation?.discardSuggestion;
  const best = plays[0];
  const need = Math.max(0, (chipsNeeded || 0) - (chipsScored || 0));
  const canClear = best && best.total >= need && handsLeft > 0;

  if (!best) {
    return (
      <div className="rounded-xl bg-ink-800 border border-ink-600 p-3">
        <div className="text-white/60 text-sm text-center py-4">Add cards to your hand for a recommendation.</div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-ink-800 border border-ink-600 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-ink-700">
        <div className="text-xs font-bold uppercase tracking-wider text-white/60">Best play</div>
        <div className={`text-xs font-bold ${canClear ? 'text-accent-green' : 'text-accent-red'}`}>
          {canClear ? 'Clears blind ✓' : `Need ${fmt(need)}`}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {plays.map((p, idx) => {
          const active = JSON.stringify(p.playedIdx) === JSON.stringify(previewedIdx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => onPreview(p.playedIdx)}
              className={[
                'tap w-full rounded-lg p-2 text-left',
                idx === 0 ? 'bg-accent-gold/10 border border-accent-gold/40' : 'bg-ink-700',
                active ? 'ring-2 ring-accent-blue' : '',
              ].join(' ')}
            >
              <div className="flex items-baseline justify-between gap-2">
                <div className="font-bold text-sm">
                  {idx === 0 ? '#1 ' : `#${idx + 1} `}
                  {HAND_LABEL[p.handType]}
                </div>
                <div className={`font-extrabold ${idx === 0 ? 'text-accent-gold text-xl' : 'text-white text-base'}`}>
                  {fmt(p.total)}
                </div>
              </div>
              <div className="text-xs text-white/60 mt-0.5">{p.reason}</div>
              <div className="text-[10px] text-white/40 mt-0.5">
                {fmt(p.chips)} × {p.mult.toFixed(1)}
                {p.xMult && p.xMult !== 1 ? ` × ${p.xMult.toFixed(2)}` : ''} · tap to preview
              </div>
            </button>
          );
        })}

        {discard && (
          <button
            type="button"
            onClick={() => onSelectDiscard?.(discard.indices)}
            className="tap w-full text-left rounded-lg bg-accent-red/10 border border-accent-red/40 p-2 active:bg-accent-red/20"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-accent-red">
                Discard {discard.indices.length} card{discard.indices.length === 1 ? '' : 's'}
              </div>
              <div className="text-xs font-semibold text-accent-red">Tap to select →</div>
            </div>
            <div className="text-xs text-white/80 mt-1">{discard.reason}</div>
          </button>
        )}
      </div>
    </div>
  );
}
