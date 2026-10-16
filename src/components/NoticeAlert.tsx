/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface NoticeAlertProps {
  type: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  message: string;
  actionButton?: React.ReactNode;
  onClose?: () => void;
}

export const NoticeAlert: React.FC<NoticeAlertProps> = ({
  type,
  title,
  message,
  actionButton,
  onClose,
}) => {
  const isError = type === 'error' || type === 'warning';

  return (
    <div
      className={`w-full p-3 border font-technical text-xs flex flex-col gap-2 rounded-[4px] transition-colors ${
        isError
          ? 'border-[#D9411E] bg-[#D9411E]/5 text-[var(--text-ink)]'
          : 'border-[var(--border-line)] bg-[var(--surface-subtle)] text-[var(--text-ink)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          {title && (
            <span
              className={`font-semibold tracking-wider uppercase text-[11px] ${
                isError ? 'text-[#D9411E]' : 'text-[var(--text-ink)]'
              }`}
            >
              [ {title} ]
            </span>
          )}
          <span className="font-body text-xs text-[var(--text-ink)] leading-relaxed">
            {message}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-ink)] px-1 font-technical"
          >
            [×]
          </button>
        )}
      </div>

      {actionButton && <div className="pt-1">{actionButton}</div>}
    </div>
  );
};
