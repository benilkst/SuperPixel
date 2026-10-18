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
  cancelLabel = 'Batal',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-sm p-5 rounded-3xl neu-raised-lg border border-[var(--border-subtle)] flex flex-col gap-4 animate-in zoom-in-95 duration-150">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-bold text-[var(--text-primary)]">
            {title}
          </span>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {message}
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 px-4 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-xs font-semibold text-[var(--text-secondary)] cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`h-9 px-4 rounded-full text-xs font-semibold text-white cursor-pointer shadow-md ${
              isDestructive ? 'bg-[var(--error)] hover:opacity-90' : 'bg-[var(--accent)] hover:opacity-90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
