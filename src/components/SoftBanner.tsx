/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftBannerProps {
  type?: 'teal' | 'error';
  title?: string;
  message: string;
  onClose?: () => void;
  actionButton?: React.ReactNode;
}

export const SoftBanner: React.FC<SoftBannerProps> = ({
  type = 'teal',
  title,
  message,
  onClose,
  actionButton,
}) => {
  const isTeal = type === 'teal';

  return (
    <div
      className={`w-full p-3.5 rounded-2xl neu-inset border-l-4 flex flex-col gap-2 transition-all ${
        isTeal
          ? 'border-l-[var(--accent)] bg-[var(--accent)]/5 text-[var(--text-primary)]'
          : 'border-l-[var(--error)] bg-[var(--error)]/5 text-[var(--text-primary)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5">
          <div
            className={`w-5 h-5 shrink-0 mt-0.5 rounded-full flex items-center justify-center ${
              isTeal ? 'text-[var(--accent)]' : 'text-[var(--error)]'
            }`}
          >
            <svg
              className="w-4 h-4 stroke-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>

          <div className="flex flex-col gap-0.5">
            {title && (
              <span
                className={`text-xs font-bold tracking-wide ${
                  isTeal ? 'text-[var(--accent)]' : 'text-[var(--error)]'
                }`}
              >
                {title}
              </span>
            )}
            <span className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {message}
            </span>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded-full neu-raised flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] shrink-0 text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {actionButton && <div className="pl-7">{actionButton}</div>}
    </div>
  );
};
