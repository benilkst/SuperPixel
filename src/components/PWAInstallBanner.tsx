/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Deteksi mode standalone (sudah dipasang di Home Screen)
    const checkStandalone = () => {
      const standaloneMQ = window.matchMedia('(display-mode: standalone)').matches;
      const navStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      return standaloneMQ || navStandalone;
    };

    setIsStandalone(checkStandalone());

    // Deteksi Safari di iPhone / iPad
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(isIOSDevice);

    // Tangani beforeinstallprompt untuk Android / Chromium / Desktop
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsStandalone(true);
        setDeferredPrompt(null);
        return true;
      }
    } catch (err) {
      console.warn('Gagal menampilkan prompt install:', err);
    }
    return false;
  };

  return {
    isStandalone,
    isIOS,
    canInstall: !!deferredPrompt && !isStandalone,
    promptInstall,
  };
}

interface IOSInstallBannerProps {
  isStandalone: boolean;
  isIOS: boolean;
}

export const IOSInstallBanner: React.FC<IOSInstallBannerProps> = ({ isStandalone, isIOS }) => {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (isStandalone || !isIOS) {
      setDismissed(true);
      return;
    }
    try {
      const stored = localStorage.getItem('ios_pwa_banner_dismissed');
      setDismissed(stored === 'true');
    } catch {
      setDismissed(false);
    }
  }, [isStandalone, isIOS]);

  if (isStandalone || !isIOS || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem('ios_pwa_banner_dismissed', 'true');
    } catch {
      // Abaikan jika localStorage tidak dapat diakses
    }
  };

  return (
    <div
      role="alert"
      className="w-full rounded-2xl bg-[#0E5C5E] text-white p-3.5 shadow-md flex items-center justify-between gap-3 text-xs animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          {/* Ikon Bagikan iOS */}
          <svg
            className="w-4 h-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
        </div>
        <p className="leading-snug font-medium text-white/95 text-[11px] sm:text-xs">
          Pasang ke layar utama: ketuk <strong className="font-bold underline">Bagikan</strong>, lalu{' '}
          <strong className="font-bold underline">Tambah ke Layar Utama</strong>.
        </p>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Tutup petunjuk pemasangan"
        className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex items-center justify-center text-white shrink-0 transition-transform cursor-pointer"
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
};
