/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftBannerProps {
  type?: 'teal' | 'error';
  title?: string;
  message: string;
  actionButton?: React.ReactNode;
  onClose?: () => void;
}

export const SoftBanner: React.FC<SoftBannerProps> = ({
  type = 'teal',
  title,
  message,
  actionButton,
  onClose,
}) => {
  const isError = type === 'error';

  return (
    <div
      className={`w-full p-3.5 rounded-2xl flex flex-col gap-2 transition-all ${
        isError
          ? 'bg-[var(--error)]/10 border border-[var(--error)]/30 text-[var(--error)]'
          : 'bg-[var(--accent)]/10 border border-[var(--accent)]/30 text-[var(--text-primary)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5">
          <span
            className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
              isError ? 'bg-[var(--error)]' : 'bg-[var(--accent)]'
            }`}
          />
          <div className="flex flex-col">
            {title && (
              <span className="text-xs font-bold leading-tight mb-0.5">
                {title}
              </span>
            )}
            <p className="text-[11px] leading-relaxed opacity-90">
              {message}
            </p>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-5 h-5 rounded-full neu-raised flex items-center justify-center text-[10px] shrink-0 cursor-pointer"
          >
            ✕
          </button>
        )}
      </div>

      {actionButton && (
        <div className="pt-1 flex items-center justify-end">
          {actionButton}
        </div>
      )}
    </div>
  );
};
