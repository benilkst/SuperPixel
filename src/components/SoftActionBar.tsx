/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftActionBarProps {
  currentStep: 1 | 2 | 3 | 4;
  isProcessing: boolean;
  scale: 2 | 4;
  downloadFormat: 'jpeg' | 'png';
  hasImage: boolean;
  onStartProcess: () => void;
  onDownload: () => void;
}

export const SoftActionBar: React.FC<SoftActionBarProps> = ({
  currentStep,
  isProcessing,
  scale,
  downloadFormat,
  hasImage,
  onStartProcess,
  onDownload,
}) => {
  return (
    <footer className="w-full px-4 pt-2 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shrink-0 bg-gradient-to-t from-[var(--base)] via-[var(--base)] to-transparent">
      <div className="max-w-md mx-auto w-full">
        {currentStep === 1 || currentStep === 2 ? (
          <button
            type="button"
            disabled={!hasImage || isProcessing}
            onClick={onStartProcess}
            className={`w-full h-12 rounded-full neu-btn-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer ${
              !hasImage || isProcessing ? 'opacity-40 pointer-events-none' : ''
            }`}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            <span>Mulai Perbesar (x{scale})</span>
          </button>
        ) : currentStep === 4 ? (
          <button
            type="button"
            onClick={onDownload}
            className="w-full h-12 rounded-full neu-btn-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg animate-pulse"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Unduh Berkas {downloadFormat.toUpperCase()}</span>
          </button>
        ) : null}
      </div>
    </footer>
  );
};
