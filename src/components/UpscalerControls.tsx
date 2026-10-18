/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { UpscaleMode } from '../types/upscaler';

interface UpscalerControlsProps {
  scale: 2 | 4;
  onScaleChange: (scale: 2 | 4) => void;
  limit4K: boolean;
  onLimit4KChange: (limit: boolean) => void;
  allowExtremeResolution: boolean;
  onAllowExtremeResolutionChange: (allow: boolean) => void;
  downloadFormat: 'jpeg' | 'png';
  onDownloadFormatChange: (format: 'jpeg' | 'png') => void;
  jpegQuality: number;
  onJpegQualityChange: (quality: number) => void;
  mode: UpscaleMode;
  onModeChange: (mode: UpscaleMode) => void;
  disabled?: boolean;
}

export const UpscalerControls: React.FC<UpscalerControlsProps> = ({
  scale,
  onScaleChange,
  limit4K,
  onLimit4KChange,
  allowExtremeResolution,
  onAllowExtremeResolutionChange,
  downloadFormat,
  onDownloadFormatChange,
  jpegQuality,
  onJpegQualityChange,
  mode,
  onModeChange,
  disabled = false,
}) => {
  return (
    <div className={`w-full flex flex-col gap-4 select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* 1. Faktor Skala Pembesaran (Segmented Control) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1">
          Faktor Skala Pembesaran
        </label>
        <div className="w-full h-11 p-1 rounded-2xl neu-inset grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onScaleChange(2)}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              scale === 2
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            x2 (Hemat RAM)
          </button>
          <button
            type="button"
            onClick={() => onScaleChange(4)}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              scale === 4
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            x4 (Resolusi Ekstra)
          </button>
        </div>
      </div>

      {/* 2. Switch Batasi Output 4K */}
      <div className="w-full p-3.5 rounded-2xl neu-raised flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[var(--text-primary)]">
            Batasi output maksimal 4K
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-tabular mt-0.5">
            3840×2160 px · Rekomendasi aman memori kanvas Safari
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={limit4K && !allowExtremeResolution}
          disabled={allowExtremeResolution}
          onClick={() => onLimit4KChange(!limit4K)}
          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer ${
            allowExtremeResolution
              ? 'opacity-40 cursor-not-allowed neu-inset'
              : limit4K
              ? 'bg-[var(--accent)]'
              : 'neu-inset'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              limit4K && !allowExtremeResolution ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 3. Mode Resolusi Ekstrem (Bypass Batas Safari & 4K) */}
      <div className="w-full p-3.5 rounded-2xl neu-raised flex items-center justify-between gap-3 border border-amber-500/20 bg-amber-500/5">
        <div className="flex flex-col pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Mode Resolusi Ekstrem
            </span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-amber-500 text-white">
              Bypass
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] leading-tight mt-0.5">
            Buka batas 4K & Safari iOS untuk pembesaran gambar skala penuh (hingga 8K).
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={allowExtremeResolution}
          onClick={() => onAllowExtremeResolutionChange(!allowExtremeResolution)}
          className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
            allowExtremeResolution ? 'bg-amber-600' : 'neu-inset'
          }`}
        >
          <span
            className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
              allowExtremeResolution ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 4. Format Berkas Unduhan */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1">
          Format Berkas Unduhan
        </label>
        <div className="w-full h-11 p-1 rounded-2xl neu-inset grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onDownloadFormatChange('png')}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              downloadFormat === 'png'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            PNG (Lossless)
          </button>
          <button
            type="button"
            onClick={() => onDownloadFormatChange('jpeg')}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              downloadFormat === 'jpeg'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            JPG (Efisien)
          </button>
        </div>
      </div>

      {/* 5. Slider Kualitas JPEG (Hanya saat format JPG) */}
      {downloadFormat === 'jpeg' && (
        <div className="flex flex-col gap-2 p-3.5 rounded-2xl neu-inset">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[var(--text-secondary)]">
              Kualitas Kompresi JPG
            </span>
            <span className="font-bold text-[var(--accent)] font-tabular">
              {jpegQuality}%
            </span>
          </div>
          <input
            type="range"
            min={50}
            max={100}
            step={1}
            value={jpegQuality}
            onChange={(e) => onJpegQualityChange(Number(e.target.value))}
            className="w-full accent-[var(--accent)] cursor-pointer"
          />
        </div>
      )}

      {/* 6. Mesin Komputasi */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1">
          Mesin Komputasi
        </label>
        <div className="w-full h-11 p-1 rounded-2xl neu-inset grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onModeChange('ai')}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'ai'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Model AI ESRGAN
          </button>
          <button
            type="button"
            onClick={() => onModeChange('algorithmic')}
            className={`rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              mode === 'algorithmic'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)]'
            }`}
          >
            Ultra-HD Super-Res
          </button>
        </div>
      </div>
    </div>
  );
};
