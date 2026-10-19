/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { LoadedImageInfo } from './ImageUploader';
import { UpscaleMode } from '../types/upscaler';
import { computeOutputDimensions, isAppleOrSafariDevice } from '../utils/canvasLimit';

interface StateSelectProps {
  imageInfo: LoadedImageInfo;
  scale: 2 | 4;
  mode: UpscaleMode;
  limit4K: boolean;
  isModelCached: boolean;
  onScaleChange: (scale: 2 | 4) => void;
  onModeChange: (mode: UpscaleMode) => void;
  onLimit4KChange: (limit: boolean) => void;
  onStart: () => void;
  onReset: () => void;
}

export const StateSelect: React.FC<StateSelectProps> = ({
  imageInfo,
  scale,
  mode,
  limit4K,
  isModelCached,
  onScaleChange,
  onModeChange,
  onLimit4KChange,
  onStart,
  onReset,
}) => {
  const isApple = isAppleOrSafariDevice();
  const dim = computeOutputDimensions(imageInfo.width, imageInfo.height, scale, limit4K);

  const hasWebGPU =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    !!(navigator as unknown as { gpu?: unknown }).gpu;

  return (
    <div className="w-full flex flex-col gap-5">
      {/* 1. Pengaturan Skala Resolusi */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Faktor Peningkatan Skala
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[2, 4].map((s) => {
            const isSelected = scale === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => onScaleChange(s as 2 | 4)}
                className={`py-3 px-4 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'neu-pressed text-[var(--accent)] border border-[var(--accent)]/30'
                    : 'neu-raised hover:neu-pressed text-[var(--text-primary)]'
                }`}
              >
                <span className="text-lg font-black">{s}×</span>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-secondary)]">
                  {s === 2 ? 'Super Tajam 2×' : 'Ultra Resolusi 4×'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Pemilihan Mesin Pemrosesan */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Mesin Pemrosesan
        </label>
        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl neu-inset">
          <button
            type="button"
            onClick={() => onModeChange('ai')}
            className={`py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'ai'
                ? 'neu-raised text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Model AI ESRGAN
          </button>
          <button
            type="button"
            onClick={() => onModeChange('algorithmic')}
            className={`py-2 px-3 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'algorithmic'
                ? 'neu-raised text-[var(--accent)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Ultra-HD Super-Res
          </button>
        </div>

        <div className="text-[11px] text-[var(--text-secondary)] px-1 leading-relaxed">
          {mode === 'ai' ? (
            <span>
              <strong>Model Real-ESRGAN</strong>: Deep neural network untuk restorasi wajah, tekstur halus, dan rekonstruksi mikro.
              {isApple && !hasWebGPU && (
                <span className="block mt-1 text-[var(--accent)] font-semibold">
                  Catatan Safari iOS: Jika alokasi WASM terbatas pada perangkat, otomatis dialihkan ke Ultra-HD Engine bebas crash.
                </span>
              )}
            </span>
          ) : (
            <span>
              <strong>Ultra-HD Super-Res Engine</strong>: Interpolasi Catmull-Rom Spline berpresisi tinggi dengan Anti-Ringing Clamping & Adaptive Edge Restorer. Sangat cepat, hemat baterai, dan 100% aman memori.
            </span>
          )}
        </div>
      </div>

      {/* 3. Estimasi Dimensi & Perlindungan Memori */}
      <div className="p-4 rounded-3xl neu-raised flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Estimasi Output
          </span>
          <span className="font-bold text-[var(--text-primary)] font-mono">
            {dim.outputWidth} × {dim.outputHeight} px
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Total Piksel / Memori
          </span>
          <span className="text-[11px] font-medium text-[var(--text-secondary)]">
            {(dim.totalPixels / 1000000).toFixed(1)} MP · ±{dim.estimatedMemoryMb} MB RAM
          </span>
        </div>

        {dim.isClamped && (
          <div className="mt-1 p-2 rounded-xl neu-inset text-[10px] text-[var(--accent)] flex items-start gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <span>{dim.clampReason}</span>
          </div>
        )}

        <label className="flex items-center gap-2.5 mt-1 pt-2 border-t border-black/5 dark:border-white/5 cursor-pointer">
          <input
            type="checkbox"
            checked={limit4K}
            onChange={(e) => onLimit4KChange(e.target.checked)}
            className="w-4 h-4 rounded text-[var(--accent)] accent-[var(--accent)] cursor-pointer"
          />
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            Batasi output maksimal 4K (Dianjurkan untuk Safari & iPhone)
          </span>
        </label>
      </div>

      {/* 4. Model Cache Status & Offline Guarantee */}
      <div className="p-3.5 rounded-2xl neu-inset flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-[var(--text-primary)]">
              Pemrosesan Privat & Offline
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]">
              {mode === 'ai'
                ? isModelCached
                  ? 'Model AI tersimpan di Cache (Siap instan)'
                  : 'Model AI (~4.8MB) tersimpan di cache otomatis setelah unduhan pertama'
                : '100% diproses di CPU per petak secara lokal'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. Aksi Utama */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 py-3.5 px-4 rounded-2xl neu-raised hover:neu-pressed active:neu-pressed text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
        >
          Ganti Foto
        </button>

        <button
          type="button"
          onClick={onStart}
          className="flex-2 py-3.5 px-6 rounded-2xl neu-btn-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          Mulai Upscale ({scale}×)
        </button>
      </div>
    </div>
  );
};
