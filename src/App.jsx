import React, { useEffect, useMemo, useState } from 'react';
import Card from './components/Card.jsx';
import BottomSheet from './components/BottomSheet.jsx';
import CardPicker from './components/CardPicker.jsx';
import JokerPicker from './components/JokerPicker.jsx';
import RunStateEditor from './components/RunStateEditor.jsx';
import RecommendationCard from './components/RecommendationCard.jsx';
import { loadState, saveState, clearState, defaultState } from './state/runState.js';
import { recommend } from './engine/recommend.js';
import jokersData from './data/jokers.json';
import planetsData from './data/planets.json';
import bossesData from './data/bosses.json';

const SHEET = { none: null, card: 'card', joker: 'joker', run: 'run' };

export default function App() {
  const [state, setState] = useState(() => loadState());
  const [sheet, setSheet] = useState(SHEET.none);
  const [selectedIdx, setSelectedIdx] = useState([]);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const boss = state.run.blindType === 'boss' && state.run.bossId
    ? bossesData.find((b) => b.id === state.run.bossId)
    : null;

  const recommendation = useMemo(() => {
    return recommend({
      handCards: state.hand,
      jokers: state.jokers,
      handLevels: state.handLevels,
      planets: planetsData,
      runState: state.run,
      boss,
      topN: 3,
    });
  }, [state.hand, state.jokers, state.handLevels, state.run, boss]);

  const [previewedIdx, setPreviewedIdx] = useState(null);
  useEffect(() => {
    if (recommendation.plays[0]) setPreviewedIdx(recommendation.plays[0].playedIdx);
    else setPreviewedIdx(null);
  }, [recommendation]);

  const selectedFinal = selectedIdx.length ? selectedIdx : previewedIdx || [];

  const addCard = (card) => {
    if (state.hand.length >= 8) return;
    setState((s) => ({ ...s, hand: [...s.hand, card] }));
  };
  const removeCard = (i) => {
    setState((s) => ({ ...s, hand: s.hand.filter((_, idx) => idx !== i) }));
    setSelectedIdx((sel) => sel.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)));
  };
  const toggleSelect = (i) => {
    setSelectedIdx((sel) => {
      if (sel.includes(i)) return sel.filter((x) => x !== i);
      if (sel.length >= 5) return sel;
      return [...sel, i];
    });
  };
  const clearHand = () => {
    setState((s) => ({ ...s, hand: [] }));
    setSelectedIdx([]);
  };

  const addJoker = (id) => setState((s) => ({ ...s, jokers: [...s.jokers, { id }] }));
  const removeJoker = (i) => setState((s) => ({ ...s, jokers: s.jokers.filter((_, idx) => idx !== i) }));
  const reorderJoker = (from, to) => {
    if (to < 0 || to >= state.jokers.length) return;
    setState((s) => {
      const arr = s.jokers.slice();
      const [it] = arr.splice(from, 1);
      arr.splice(to, 0, it);
      return { ...s, jokers: arr };
    });
  };

  const logHand = () => {
    if (!previewedIdx || previewedIdx.length === 0) return;
    const best = recommendation.plays[0];
    if (!best) return;
    setState((s) => {
      const timesHandPlayed = { ...(s.run.timesHandPlayed || {}) };
      timesHandPlayed[best.handType] = (timesHandPlayed[best.handType] || 0) + 1;
      return {
        ...s,
        hand: s.hand.filter((_, i) => !previewedIdx.includes(i)),
        run: {
          ...s.run,
          chipsScored: (s.run.chipsScored || 0) + best.total,
          handsLeft: Math.max(0, s.run.handsLeft - 1),
          handsPlayedTotal: (s.run.handsPlayedTotal || 0) + 1,
          timesHandPlayed,
          deckRemaining: Math.max(0, (s.run.deckRemaining || 0) - previewedIdx.length),
        },
      };
    });
    setSelectedIdx([]);
  };

  const logDiscard = () => {
    if (selectedIdx.length === 0) return;
    setState((s) => ({
      ...s,
      hand: s.hand.filter((_, i) => !selectedIdx.includes(i)),
      run: {
        ...s.run,
        discardsLeft: Math.max(0, s.run.discardsLeft - 1),
        deckRemaining: Math.max(0, (s.run.deckRemaining || 0) - selectedIdx.length),
      },
    }));
    setSelectedIdx([]);
  };

  const resetAll = () => {
    clearState();
    setState(defaultState());
    setSelectedIdx([]);
  };

  return (
    <div className="min-h-full flex flex-col bg-ink-900 text-white">
      {/* Sticky run state summary + recommendation */}
      <header className="sticky top-0 z-30 bg-ink-900/95 backdrop-blur border-b border-ink-700">
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold">Ante {state.run.ante}</span>
              <span className="chip capitalize">{state.run.blindType}{boss ? ` · ${boss.name}` : ''}</span>
            </div>
            <button
              type="button"
              onClick={() => setSheet(SHEET.run)}
              className="tap text-xs font-semibold text-accent-blue min-h-[36px] px-2"
            >
              Edit run
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 mt-1 text-center">
            <div className="bg-ink-800 rounded px-1 py-1">
              <div className="text-[10px] text-white/50">Chips</div>
              <div className="text-xs font-bold">{state.run.chipsScored}/{state.run.chipsNeeded}</div>
            </div>
            <div className="bg-ink-800 rounded px-1 py-1">
              <div className="text-[10px] text-white/50">Hands</div>
              <div className="text-xs font-bold">{state.run.handsLeft}</div>
            </div>
            <div className="bg-ink-800 rounded px-1 py-1">
              <div className="text-[10px] text-white/50">Disc</div>
              <div className="text-xs font-bold">{state.run.discardsLeft}</div>
            </div>
            <div className="bg-ink-800 rounded px-1 py-1">
              <div className="text-[10px] text-white/50">$</div>
              <div className="text-xs font-bold text-accent-gold">${state.run.money}</div>
            </div>
          </div>
        </div>
        <div className="px-3 pb-2">
          <RecommendationCard
            recommendation={recommendation}
            onPreview={(idx) => { setPreviewedIdx(idx); setSelectedIdx([]); }}
            onSelectDiscard={(idx) => setSelectedIdx(idx.slice(0, 5))}
            previewedIdx={selectedIdx.length ? null : previewedIdx}
            chipsNeeded={state.run.chipsNeeded}
            chipsScored={state.run.chipsScored}
            handsLeft={state.run.handsLeft}
          />
        </div>
      </header>

      <main className="flex-1 px-3 py-3 space-y-4">
        {/* Jokers row */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">Jokers ({state.jokers.length})</h2>
            <button
              type="button"
              onClick={() => setSheet(SHEET.joker)}
              className="tap text-xs font-semibold text-accent-blue min-h-[36px] px-2"
            >
              Manage
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {state.jokers.length === 0 && (
              <button
                type="button"
                onClick={() => setSheet(SHEET.joker)}
                className="tap flex-1 min-h-[56px] rounded-lg border-2 border-dashed border-ink-500 text-white/40 text-sm"
              >
                + Add jokers
              </button>
            )}
            {state.jokers.map((j, i) => {
              const def = jokersData.find((x) => x.id === j.id);
              if (!def) return null;
              return (
                <div key={`${j.id}-${i}`} className="min-w-[92px] bg-ink-700 rounded-lg p-1.5 border border-ink-500">
                  <div className="text-[10px] text-white/50 font-bold">#{i + 1}</div>
                  <div className="text-xs font-bold leading-tight line-clamp-2">{def.name}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hand */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
              Hand ({state.hand.length}/8)
              {selectedIdx.length > 0 && <span className="text-accent-gold"> · {selectedIdx.length} selected</span>}
            </h2>
            <div className="flex gap-1">
              {state.hand.length > 0 && (
                <button
                  type="button"
                  onClick={clearHand}
                  className="tap text-xs font-semibold text-accent-red min-h-[36px] px-2"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setSheet(SHEET.card)}
                className="tap text-xs font-semibold text-accent-blue min-h-[36px] px-2"
                disabled={state.hand.length >= 8}
              >
                + Card
              </button>
            </div>
          </div>

          {state.hand.length === 0 ? (
            <button
              type="button"
              onClick={() => setSheet(SHEET.card)}
              className="tap w-full min-h-[96px] rounded-lg border-2 border-dashed border-ink-500 text-white/40"
            >
              Tap to add your first card
            </button>
          ) : (
            <div className="grid grid-cols-8 gap-1.5">
              {state.hand.map((card, i) => {
                const isSelected = selectedIdx.includes(i);
                const isRecommended = !selectedIdx.length && previewedIdx?.includes(i);
                const isDiscardHint =
                  !isSelected &&
                  !isRecommended &&
                  recommendation?.discardSuggestion?.indices?.includes(i);
                return (
                  <div key={card.id} className="relative">
                    <Card
                      card={card}
                      selected={isSelected || isRecommended}
                      discardHint={isDiscardHint}
                      onTap={() => toggleSelect(i)}
                    />
                    <button
                      type="button"
                      onClick={() => removeCard(i)}
                      className="tap absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent-red text-white text-xs font-bold flex items-center justify-center"
                      aria-label="Remove card"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Action row */}
        {state.hand.length > 0 && (
          <section className="grid grid-cols-2 gap-2 sticky bottom-2">
            <button
              type="button"
              onClick={logHand}
              disabled={!previewedIdx || previewedIdx.length === 0 || state.run.handsLeft === 0}
              className="tap min-h-[52px] rounded-xl bg-accent-green text-ink-900 font-bold disabled:opacity-40"
            >
              Play ({(selectedIdx.length ? selectedIdx : previewedIdx || []).length})
            </button>
            <button
              type="button"
              onClick={logDiscard}
              disabled={selectedIdx.length === 0 || state.run.discardsLeft === 0}
              className="tap min-h-[52px] rounded-xl bg-accent-red text-white font-bold disabled:opacity-40"
            >
              Discard ({selectedIdx.length})
            </button>
          </section>
        )}

        <section className="pt-4 text-center">
          <button
            type="button"
            onClick={resetAll}
            className="tap text-xs text-white/40 underline min-h-[36px] px-2"
          >
            Reset run state
          </button>
        </section>
      </main>

      <BottomSheet open={sheet === SHEET.card} onClose={() => setSheet(SHEET.none)} title="Add card to hand">
        <CardPicker onAdd={(c) => addCard(c)} disabled={state.hand.length >= 8} />
      </BottomSheet>

      <BottomSheet open={sheet === SHEET.joker} onClose={() => setSheet(SHEET.none)} title="Jokers" fullHeight>
        <JokerPicker
          current={state.jokers}
          onAdd={addJoker}
          onRemove={removeJoker}
          onReorder={reorderJoker}
        />
      </BottomSheet>

      <BottomSheet open={sheet === SHEET.run} onClose={() => setSheet(SHEET.none)} title="Run state" fullHeight>
        <RunStateEditor
          run={state.run}
          handLevels={state.handLevels}
          onRunChange={(run) => setState((s) => ({ ...s, run }))}
          onHandLevelsChange={(handLevels) => setState((s) => ({ ...s, handLevels }))}
        />
      </BottomSheet>
    </div>
  );
}
