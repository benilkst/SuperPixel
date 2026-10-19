/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StateProcessingProps {
  percentage: number;
  currentTile: number;
  totalTiles: number;
  statusText: string;
  phase: string;
  isDownloadingModel?: boolean;
  downloadLoadedMb?: number;
  downloadTotalMb?: number;
  onCancel: () => void;
}

export const StateProcessing: React.FC<StateProcessingProps> = ({
  percentage,
  currentTile,
  totalTiles,
  statusText,
  phase,
  isDownloadingModel,
  downloadLoadedMb,
  downloadTotalMb,
  onCancel,
}) => {
  return (
    <div className="w-full flex flex-col items-center gap-6 py-4 select-none">
      {/* Visual Ring / Card Progress */}
      <div className="w-36 h-36 rounded-full neu-raised flex items-center justify-center relative p-3">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Track */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="7"
            className="text-black/10 dark:text-white/10"
          />
          {/* Progress bar */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="var(--accent)"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray="264"
            strokeDashoffset={264 - (264 * percentage) / 100}
            className="transition-all duration-300 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-black text-[var(--text-primary)] font-mono">
            {percentage}%
          </span>
          <span className="text-[9px] uppercase font-bold tracking-widest text-[var(--text-secondary)]">
            {phase}
          </span>
        </div>
      </div>

      {/* Progress Detail */}
      <div className="w-full flex flex-col items-center gap-2 max-w-sm text-center">
        <span className="text-sm font-bold text-[var(--text-primary)]">
          {statusText || 'Sedang memproses citra...'}
        </span>

        {isDownloadingModel && downloadTotalMb && downloadTotalMb > 0 && (
          <div className="text-[11px] text-[var(--accent)] font-semibold">
            Mengunduh model AI: {downloadLoadedMb?.toFixed(1)} / {downloadTotalMb.toFixed(1)} MB
          </div>
        )}

        {totalTiles > 1 && !isDownloadingModel && (
          <div className="w-full bg-black/5 dark:bg-white/5 h-2 rounded-full neu-inset overflow-hidden mt-1">
            <div
              className="bg-[var(--accent)] h-full transition-all duration-200 ease-out rounded-full"
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}

        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mt-2">
          Pemrosesan dilakukan per petak hemat memori untuk mencegah browser reload atau crash.
        </p>
      </div>

      {/* Cancel Button */}
      <button
        type="button"
        onClick={onCancel}
        className="px-6 py-2.5 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-xs font-bold uppercase tracking-wider text-[var(--error)] transition-all cursor-pointer"
      >
        Batalkan Pemrosesan
      </button>
    </div>
  );
};
