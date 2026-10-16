/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export const SoftSwitch: React.FC<SoftSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled,
}) => {
  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`w-full p-3 rounded-2xl neu-raised flex items-center justify-between gap-3 cursor-pointer select-none transition-opacity ${
        disabled ? 'opacity-50 pointer-events-none' : 'hover:neu-raised-lg'
      }`}
    >
      <div className="flex flex-col">
        <span className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </span>
        {description && (
          <span className="text-xs text-[var(--text-secondary)] leading-snug">
            {description}
          </span>
        )}
      </div>

      {/* Trek Inset dengan Tombol Geser Bergaya Raised */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`w-13 h-7 rounded-full p-1 neu-inset flex items-center transition-colors shrink-0 ${
          checked ? 'bg-[var(--accent)]/15' : 'bg-transparent'
        }`}
      >
        <span
          className={`w-5 h-5 rounded-full neu-raised transition-transform duration-200 ease-out flex items-center justify-center ${
            checked
              ? 'translate-x-6 bg-[var(--accent)] text-[var(--accent-text)]'
              : 'translate-x-0 bg-[var(--bg-base)]'
          }`}
        >
          {checked && (
            <svg
              className="w-3 h-3 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
};
