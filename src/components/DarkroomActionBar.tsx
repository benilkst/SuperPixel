/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface DarkroomActionBarProps {
  appState: 'select' | 'process' | 'result';
  scale: 2 | 4;
  format: 'jpeg' | 'png';
  isProcessing: boolean;
  canStart: boolean;
  onStart: () => void;
  onCancel: () => void;
  onDownload: () => void;
  onReset: () => void;
}

export const DarkroomActionBar: React.FC<DarkroomActionBarProps> = ({
  appState,
  scale,
  format,
  isProcessing,
  canStart,
  onStart,
  onCancel,
  onDownload,
  onReset,
}) => {
  return (
    <div className="w-full shrink-0 border-t border-[var(--border-line)] bg-[var(--bg-paper)] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-colors">
      <div className="max-w-md mx-auto w-full">
        {appState === 'select' && (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="w-full h-12 bg-[#D9411E] hover:bg-[#C23817] active:scale-[0.99] disabled:opacity-35 disabled:cursor-not-allowed text-white font-technical text-xs tracking-[0.16em] uppercase font-semibold flex items-center justify-center transition-all rounded-[4px] cursor-pointer"
          >
            MULAI PERBESAR ({scale}×)
          </button>
        )}

        {appState === 'process' && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full h-12 border border-[var(--border-line)] hover:border-[var(--text-ink)] active:scale-[0.99] text-[var(--accent-safelight)] font-technical text-xs tracking-[0.16em] uppercase font-semibold flex items-center justify-center transition-all rounded-[4px] cursor-pointer"
          >
            BATALKAN PROSES
          </button>
        )}

        {appState === 'result' && (
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={onReset}
              className="h-12 border border-[var(--border-line)] hover:border-[var(--text-ink)] text-[var(--text-ink)] font-technical text-xs tracking-[0.14em] uppercase font-semibold flex items-center justify-center transition-all rounded-[4px] cursor-pointer"
            >
              FOTO LAIN
            </button>

            <button
              type="button"
              onClick={onDownload}
              className="col-span-2 h-12 bg-[#D9411E] hover:bg-[#C23817] active:scale-[0.99] text-white font-technical text-xs tracking-[0.16em] uppercase font-semibold flex items-center justify-center transition-all rounded-[4px] cursor-pointer"
            >
              UNDUH ({format.toUpperCase()})
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
