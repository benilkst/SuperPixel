/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { LoadedImageInfo } from './ImageUploader';
import { ScaleCalculation } from '../utils/canvasLimit';
import { UpscaleMode } from '../types/upscaler';
import { SoftSwitch } from './SoftSwitch';
import { SoftSlider } from './SoftSlider';

interface StateSelectProps {
  currentImage: LoadedImageInfo | null;
  onImageSelected: (file: File | Blob) => void;
  onClearImage: () => void;
  scale: 2 | 4;
  onScaleChange: (scale: 2 | 4) => void;
  limit4K: boolean;
  onLimit4KChange: (limit: boolean) => void;
  downloadFormat: 'jpeg' | 'png';
  onDownloadFormatChange: (fmt: 'jpeg' | 'png') => void;
  jpegQuality: number;
  onJpegQualityChange: (q: number) => void;
  mode: UpscaleMode;
  onModeChange: (mode: UpscaleMode) => void;
  calculation: ScaleCalculation | null;
  customModelFile: File | null;
  onCustomModelFileChange: (file: File | null) => void;
  isModelStored?: boolean;
  onClearModelStorage?: () => void;
}

export const StateSelect: React.FC<StateSelectProps> = ({
  currentImage,
  onImageSelected,
  onClearImage,
  scale,
  onScaleChange,
  limit4K,
  onLimit4KChange,
  downloadFormat,
  onDownloadFormatChange,
  jpegQuality,
  onJpegQualityChange,
  mode,
  onModeChange,
  calculation,
  customModelFile,
  onCustomModelFileChange,
  isModelStored = false,
  onClearModelStorage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localModelInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      <input
        ref={localModelInputRef}
        type="file"
        accept=".onnx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onCustomModelFileChange(f);
        }}
        className="hidden"
      />

      {/* 1. Area Unggah / Empty State Panel Inset */}
      {!currentImage ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[160px] p-5 rounded-3xl neu-inset border-2 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent)] flex flex-col items-center justify-center text-center gap-2.5 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full neu-raised flex items-center justify-center text-[var(--accent)] group-hover:scale-105 transition-transform">
            <svg
              className="w-6 h-6 stroke-[2]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>

          <div className="flex flex-col gap-0.5">
            <span className="text-base font-bold text-[var(--text-primary)]">
              Pilih foto dari galeri
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              Gambar diproses secara lokal di perangkat dan tidak pernah diunggah.
            </span>
          </div>
        </button>
      ) : (
        /* Pratinjau Citra Terpilih Bergaya Inset */
        <div className="w-full p-3.5 rounded-3xl neu-raised flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl neu-inset overflow-hidden p-1 shrink-0">
              <img
                src={currentImage.previewUrl}
                alt={currentImage.fileName}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div className="flex flex-col justify-center flex-1 min-w-0">
              <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                {currentImage.fileName}
              </span>
              <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-0.5 font-tabular">
                <span>
                  {currentImage.width} × {currentImage.height} px
                </span>
                <span>•</span>
                <span>{formatFileSize(currentImage.fileSizeBytes)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-full neu-btn-secondary text-[11px] font-bold text-[var(--accent)] shrink-0 cursor-pointer"
            >
              Ganti
            </button>
          </div>
        </div>
      )}

      {/* 2. Kontrol Segmen Skala (x2 / x4) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1">
          Faktor Skala Pembesaran
        </label>
        <div className="w-full h-12 p-1 rounded-2xl neu-inset grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => onScaleChange(2)}
            className={`rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              scale === 2
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            x2 (Hemat RAM)
          </button>

          <button
            type="button"
            onClick={() => onScaleChange(4)}
            className={`rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              scale === 4
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            x4 (Resolusi Ekstra)
          </button>
        </div>
      </div>

      {/* 3. Switch Batasi Output Maksimal 4K */}
      <SoftSwitch
        checked={limit4K}
        onChange={onLimit4KChange}
        label="Batasi output maksimal 4K (3840×2160)"
        description="Mencegah kehabisan memori kanvas Safari dengan menjaga rasio aspek asli."
      />

      {/* 4. Radio Format Unduhan (PNG / JPG) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold tracking-wider uppercase text-[var(--text-secondary)] px-1">
          Format Berkas Unduhan
        </label>
        <div className="grid grid-cols-2 gap-2">
          {/* Radio PNG */}
          <div
            onClick={() => onDownloadFormatChange('png')}
            className={`p-3 rounded-2xl neu-raised flex items-center gap-2.5 cursor-pointer select-none transition-all ${
              downloadFormat === 'png' ? 'ring-2 ring-[var(--accent)]/30' : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                downloadFormat === 'png' ? 'neu-inset' : 'neu-raised'
              }`}
            >
              {downloadFormat === 'png' && (
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                PNG
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Lossless penuh
              </span>
            </div>
          </div>

          {/* Radio JPG */}
          <div
            onClick={() => onDownloadFormatChange('jpeg')}
            className={`p-3 rounded-2xl neu-raised flex items-center gap-2.5 cursor-pointer select-none transition-all ${
              downloadFormat === 'jpeg' ? 'ring-2 ring-[var(--accent)]/30' : ''
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                downloadFormat === 'jpeg' ? 'neu-inset' : 'neu-raised'
              }`}
            >
              {downloadFormat === 'jpeg' && (
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                JPG
              </span>
              <span className="text-[10px] text-[var(--text-secondary)]">
                Ukuran efisien
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Slider Kualitas JPG dengan Gelembung Nilai (jika JPG dipilih) */}
      {downloadFormat === 'jpeg' && (
        <SoftSlider
          value={jpegQuality}
          min={10}
          max={100}
          step={5}
          onChange={onJpegQualityChange}
          label="Kualitas Kompresi JPG"
          unit="%"
        />
      )}

      {/* 6. Mode Mesin Pemrosesan (Segmented Controls) */}
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

        {mode === 'ai' && (
          <div className="flex items-center justify-between px-1 text-[11px] text-[var(--text-secondary)]">
            <span className="truncate pr-2">
              {customModelFile ? (
                <span className="text-[var(--accent)] font-medium">
                  Model lokal: {customModelFile.name}
                </span>
              ) : (
                <span>Sumber: URL Online / ./models/</span>
              )}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {customModelFile && (
                <button
                  type="button"
                  onClick={() => onCustomModelFileChange(null)}
                  className="underline hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => localModelInputRef.current?.click()}
                className="underline hover:text-[var(--accent)] cursor-pointer"
              >
                {customModelFile ? 'Ganti .onnx' : 'Pilih file .onnx lokal'}
              </button>
            </div>
          </div>
        )}

        {/* Status Penyimpanan Model Offline */}
        {mode === 'ai' && (
          <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 truncate">
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isModelStored ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              <span className="truncate">
                {isModelStored
                  ? 'Model tersimpan di perangkat (4,6 MB)'
                  : 'Belum tersimpan'}
              </span>
            </div>
            {isModelStored && onClearModelStorage && (
              <button
                type="button"
                onClick={onClearModelStorage}
                className="underline hover:text-[var(--error)] text-[var(--text-secondary)] shrink-0 ml-2 cursor-pointer transition-colors"
              >
                Hapus data tersimpan
              </button>
            )}
          </div>
        )}
      </div>

      {/* Rangkuman Lembar Data Sebelum Eksekusi */}
      {calculation && (
        <div className="p-3.5 rounded-2xl neu-inset flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center text-[var(--text-secondary)] font-medium">
            <span>Resolusi Target</span>
            <span className="font-bold text-[var(--accent)] font-tabular text-sm">
              {calculation.outputWidth} × {calculation.outputHeight} px
            </span>
          </div>
          <div className="flex justify-between items-center text-[var(--text-secondary)] font-medium text-[11px]">
            <span>Estimasi Waktu & Petak</span>
            <span className="font-tabular">
              ~{calculation.estimatedSeconds} detik ({calculation.totalTiles} petak)
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
