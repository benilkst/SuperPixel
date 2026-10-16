/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface SoftModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const SoftModal: React.FC<SoftModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Kembali',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-3xl neu-raised-lg p-5 flex flex-col gap-4 border border-[var(--border-subtle)] transform scale-100 transition-transform">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-full neu-raised shrink-0 flex items-center justify-center ${
              isDestructive ? 'text-[var(--error)]' : 'text-[var(--accent)]'
            }`}
          >
            <svg
              className="w-5 h-5 stroke-2"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              {title}
            </h3>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 rounded-full neu-btn-secondary text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {cancelLabel}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`h-11 rounded-full text-xs font-bold uppercase tracking-wider cursor-pointer transition-all ${
              isDestructive
                ? 'bg-[var(--error)] text-white neu-raised'
                : 'neu-btn-primary'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
