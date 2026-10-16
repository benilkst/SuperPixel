/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'info' | 'error';
  actionLabel?: string;
  onAction?: () => void;
}

interface SoftToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const SoftToast: React.FC<SoftToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 max-w-sm w-full px-4 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto neu-raised-lg p-3 rounded-2xl flex items-center justify-between gap-3 text-xs font-medium border border-[var(--border-subtle)] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                toast.type === 'error'
                  ? 'bg-[var(--error)]'
                  : toast.type === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-[var(--accent)]'
              }`}
            ></span>
            <span className="leading-snug">{toast.message}</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  onDismiss(toast.id);
                }}
                className="h-6 px-2.5 rounded-full neu-btn-primary text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-transform active:scale-95"
              >
                {toast.actionLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Tutup notifikasi"
              className="w-5 h-5 rounded-full neu-raised flex items-center justify-center text-[var(--text-secondary)] text-[10px] cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
