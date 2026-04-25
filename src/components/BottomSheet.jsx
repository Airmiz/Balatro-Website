import React, { useEffect } from 'react';

export default function BottomSheet({ open, onClose, title, children, fullHeight = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={[
          'relative w-full bg-ink-800 rounded-t-2xl border-t-2 border-ink-600',
          'shadow-2xl flex flex-col',
          fullHeight ? 'h-[92vh]' : 'max-h-[82vh]',
        ].join(' ')}
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-ink-600">
          <div className="w-10" />
          <div className="flex-1 text-center">
            <div className="mx-auto h-1 w-10 rounded-full bg-ink-500 mb-2" />
            <h2 className="font-bold text-base">{title}</h2>
          </div>
          <button
            type="button"
            className="tap text-sm font-semibold text-accent-blue min-w-[48px] min-h-[44px]"
            onClick={onClose}
          >
            Done
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}
