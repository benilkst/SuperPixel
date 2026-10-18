/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isAppStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isAppStandalone);

    const isAppleDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isAppleDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const promptInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return {
    isStandalone,
    isIOS,
    canInstall,
    promptInstall,
  };
}

interface IOSInstallBannerProps {
  isStandalone: boolean;
  isIOS: boolean;
}

export const IOSInstallBanner: React.FC<IOSInstallBannerProps> = ({
  isStandalone,
  isIOS,
}) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const isDismissed = localStorage.getItem('superpixel_ios_prompt_dismissed');
      if (!isDismissed && isIOS && !isStandalone) {
        setDismissed(false);
      }
    } catch {}
  }, [isIOS, isStandalone]);

  if (dismissed || isStandalone || !isIOS) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('superpixel_ios_prompt_dismissed', 'true');
    } catch {}
  };

  return (
    <div className="w-full p-3 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/30 flex items-center justify-between gap-3 text-xs text-[var(--text-primary)]">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-xl neu-raised flex items-center justify-center text-[var(--accent)] shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </div>
        <span className="text-[11px] leading-tight">
          Pasang ke layar utama: ketuk <strong>Bagikan</strong>, lalu <strong>Tambah ke Layar Utama</strong>.
        </span>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup petunjuk"
        className="w-5 h-5 rounded-full neu-raised flex items-center justify-center text-[10px] shrink-0 text-[var(--text-secondary)]"
      >
        ✕
      </button>
    </div>
  );
};
