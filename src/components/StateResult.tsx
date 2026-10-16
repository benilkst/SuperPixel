/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UpscaleMode } from '../types/upscaler';

interface StateResultProps {
  originalUrl: string;
  enhancedUrl: string;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number;
  enhancedHeight: number;
  effectiveScale: number;
  mode: UpscaleMode;
  executionProvider: string;
  elapsedMs: number;
  format: 'jpeg' | 'png';
  estimatedSizeStr: string;
  onReset: () => void;
}

export const StateResult: React.FC<StateResultProps> = ({
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
  effectiveScale,
  mode,
  executionProvider,
  elapsedMs,
  format,
  estimatedSizeStr,
  onReset,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const p = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(p);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Slider Sebelum/Sesudah Penuh Lebar dalam Panel Inset */}
      <div className="w-full p-2 rounded-3xl neu-inset">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onTouchMove={handleTouchMove}
          className="relative w-full aspect-[4/3] max-h-[340px] rounded-2xl overflow-hidden select-none touch-none cursor-ew-resize bg-black/5"
        >
          {/* Layer Sesudah (Enhanced) */}
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <img
              src={enhancedUrl}
              alt="Sesudah"
              className="w-full h-full object-contain pointer-events-none"
            />
          </div>

          {/* Layer Sebelum (Original) dengan Clip Path */}
          <div
            className="absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={originalUrl}
              alt="Sebelum"
              className="w-full h-full object-contain pointer-events-none"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          {/* Garis Pemisah dengan Handle Neumorphic */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-20 pointer-events-none shadow-md"
            style={{ left: `${sliderPos}%` }}
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full neu-raised bg-[var(--bg-base)] flex items-center justify-center border border-[var(--accent)]/30">
              <svg
                className="w-4 h-4 text-[var(--accent)]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="m9 18-6-6 6-6" />
                <path d="m15 6 6 6-6 6" />
              </svg>
            </div>
          </div>

          {/* Label Monospace SEBELUM dan SESUDAH di Sudut Gambar */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="px-2 py-0.5 rounded-lg neu-raised text-[10px] font-bold tracking-wider uppercase text-[var(--text-primary)] font-tabular">
              SEBELUM
            </span>
          </div>

          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <span className="px-2 py-0.5 rounded-lg neu-raised text-[10px] font-bold tracking-wider uppercase text-[var(--accent)] font-tabular">
              SESUDAH
            </span>
          </div>
        </div>
      </div>

      {/* Kartu Raised Berisi Daftar Dua Kolom */}
      <div className="w-full p-4 rounded-3xl neu-raised flex flex-col gap-2.5">
        <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-secondary)] px-0.5">
          Data Teknis Hasil Pembesaran
        </span>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Input</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {originalWidth} × {originalHeight} px
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Output</span>
            <span className="font-bold text-[var(--accent)] font-tabular">
              {enhancedWidth} × {enhancedHeight} px
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Skala</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {effectiveScale.toFixed(2)}×
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Waktu</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {(elapsedMs / 1000).toFixed(2)} detik
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Mode</span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-bold tracking-wide uppercase">
              {mode === 'ai' ? 'Model ESRGAN' : 'Cadangan'}
            </span>
          </div>

          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[var(--text-secondary)] font-medium">Berkas ({format.toUpperCase()})</span>
            <span className="font-medium text-[var(--text-secondary)] font-tabular">
              {estimatedSizeStr ? `~${estimatedSizeStr}` : 'Siap diunduh'}
            </span>
          </div>
        </div>
      </div>

      {/* Tombol Sekunder Proses Foto Lain */}
      <button
        type="button"
        onClick={onReset}
        className="w-full h-11 rounded-full neu-btn-secondary text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] cursor-pointer"
      >
        Proses Foto Lain
      </button>
    </div>
  );
};
