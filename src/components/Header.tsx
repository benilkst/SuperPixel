/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface HeaderProps {
  isDarkMode: boolean;
  onToggleTheme: () => void;
  statusText?: string;
}

export const Header: React.FC<HeaderProps> = ({
  isDarkMode,
  onToggleTheme,
  statusText = 'ALAT KAMAR GELAP',
}) => {
  return (
    <header className="w-full h-12 flex items-center justify-between border-b border-[var(--border-line)] px-4 shrink-0 bg-[var(--bg-paper)] transition-colors">
      <div className="flex items-baseline gap-2.5">
        <span className="font-technical font-semibold text-xs tracking-[0.2em] text-[var(--text-ink)] uppercase">
          SUPERPIXEL
        </span>
        <span className="text-[10px] font-technical tracking-wider text-[var(--text-muted)] border-l border-[var(--border-line)] pl-2">
          {statusText}
        </span>
      </div>

      <button
        type="button"
        onClick={onToggleTheme}
        aria-label="Ganti mode tampilan"
        className="h-7 px-2 border border-[var(--border-line)] hover:border-[var(--text-ink)] text-[10px] font-technical tracking-wider text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors rounded-[3px]"
      >
        {isDarkMode ? 'TERANG' : 'GELAP'}
      </button>
    </header>
  );
};
