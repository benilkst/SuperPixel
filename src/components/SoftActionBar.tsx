/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftActionBarProps {
  appState: 'select' | 'process' | 'result';
  scale: 2 | 4;
  downloadFormat: 'jpeg' | 'png';
  isProcessing: boolean;
  canStart: boolean;
  onStart: () => void;
  onDownload: () => void;
}

export const SoftActionBar: React.FC<SoftActionBarProps> = ({
  appState,
  scale,
  downloadFormat,
  isProcessing,
  canStart,
  onStart,
  onDownload,
}) => {
  // Hanya tampilkan tombol aksi utama jika di state 'select' atau 'result'
  if (appState === 'process') {
    return null;
  }

  return (
    <div className="w-full shrink-0 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] transition-colors">
      <div className="max-w-md mx-auto w-full">
        {appState === 'select' && (
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart || isProcessing}
            className="w-full h-12 rounded-full neu-btn-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Memproses...</span>
              </>
            ) : (
              <span>Mulai Perbesar (x{scale})</span>
            )}
          </button>
        )}

        {appState === 'result' && (
          <button
            type="button"
            onClick={onDownload}
            className="w-full h-12 rounded-full neu-btn-primary font-bold text-xs tracking-wider uppercase flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Unduh Hasil ({downloadFormat.toUpperCase()})</span>
          </button>
        )}
      </div>
    </div>
  );
};
