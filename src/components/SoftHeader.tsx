/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftHeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const SoftHeader: React.FC<SoftHeaderProps> = ({
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="w-full px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center">
          <svg
            className="w-4 h-4 text-[var(--accent)]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
            <path d="m14 7 3 3" />
            <path d="M5 6v4" />
            <path d="M19 14v4" />
            <path d="M10 2v2" />
            <path d="M7 8H3" />
            <path d="M21 16h-4" />
            <path d="M11 3H9" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold tracking-tight text-[var(--text-primary)]">
            SuperPixel
          </span>
          <span className="text-[10px] tracking-wider uppercase font-semibold text-[var(--text-secondary)]">
            Upscaler Soft UI
          </span>
        </div>
      </div>

      {/* Neumorphic Theme Toggle Pill */}
      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Ganti mode terang atau gelap"
        className="h-8 px-3 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <span className="w-2 h-2 rounded-full bg-[var(--accent)]"></span>
        <span className="text-[11px] tracking-wider uppercase">
          {isDarkMode ? 'Gelap' : 'Terang'}
        </span>
      </button>
    </header>
  );
};
