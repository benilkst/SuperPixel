/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, XCircle, Layers, Cpu } from 'lucide-react';

interface ProcessingProgressProps {
  currentTile: number;
  totalTiles: number;
  percentage: number;
  statusText: string;
  phase: string;
  onCancel: () => void;
}

export const ProcessingProgress: React.FC<ProcessingProgressProps> = ({
  currentTile,
  totalTiles,
  percentage,
  statusText,
  phase,
  onCancel,
}) => {
  return (
    <div className="w-full p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-white dark:bg-slate-850 shadow-md flex flex-col gap-4">
      {/* Header Status */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Sedang Memproses Gambar
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Di Web Worker (UI tetap lancar)
            </p>
          </div>
        </div>

        <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
          {percentage}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden relative">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-200 ease-out rounded-full"
          style={{ width: `${Math.min(100, Math.max(2, percentage))}%` }}
        />
      </div>

      {/* Info Petak & Memory Note */}
      <div className="flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>
              Petak ke-<b>{currentTile}</b> dari <b>{totalTiles}</b>
            </span>
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] truncate max-w-[180px]">
            {statusText}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 text-[11px] flex items-center gap-2">
          <Cpu className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Memori per petak dibebaskan segera setelah selesai di-render.
          </span>
        </div>
      </div>

      {/* Tombol Batal yang Nyaman Dijangkau Jempol */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full min-h-[48px] rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
      >
        <XCircle className="w-4 h-4" />
        <span>Batalkan Pemrosesan</span>
      </button>
    </div>
  );
};
