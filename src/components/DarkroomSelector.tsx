/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { LoadedImageInfo } from './ImageUploader';
import { ScaleCalculation } from '../utils/canvasLimit';
import { UpscaleMode } from '../types/upscaler';

interface DarkroomSelectorProps {
  currentImage: LoadedImageInfo | null;
  onImageSelected: (file: File | Blob) => void;
  onClearImage: () => void;
  scale: 2 | 4;
  onScaleChange: (scale: 2 | 4) => void;
  limit4K: boolean;
  onLimit4KChange: (limit: boolean) => void;
  mode: UpscaleMode;
  onModeChange: (mode: UpscaleMode) => void;
  calculation: ScaleCalculation | null;
  customModelFile: File | null;
  onCustomModelFileChange: (file: File | null) => void;
  modelUrl: string;
}

export const DarkroomSelector: React.FC<DarkroomSelectorProps> = ({
  currentImage,
  onImageSelected,
  onClearImage,
  scale,
  onScaleChange,
  limit4K,
  onLimit4KChange,
  mode,
  onModeChange,
  calculation,
  customModelFile,
  onCustomModelFileChange,
  modelUrl,
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

      {/* Bingkai Unggah Foto / Lembar Kontak */}
      {!currentImage ? (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full min-h-[170px] border border-dashed border-[var(--border-line)] hover:border-[var(--text-ink)] bg-transparent p-5 flex flex-col items-start justify-between text-left transition-colors cursor-pointer rounded-[4px] group"
        >
          <div className="flex flex-col gap-1">
            <span className="font-technical text-[11px] tracking-wider text-[var(--text-muted)] uppercase">
              [ 01 // SUMBER CITRA ]
            </span>
            <span className="font-serif-display text-xl sm:text-2xl text-[var(--text-ink)] group-hover:text-[var(--accent-safelight)] transition-colors">
              Pilih foto dari galeri
            </span>
            <span className="text-xs text-[var(--text-muted)] font-body mt-1">
              Sentuh untuk membuka lembar kerja foto JPG, PNG, atau WebP.
            </span>
          </div>

          <div className="w-full flex items-center justify-between text-[11px] font-technical text-[var(--text-muted)] pt-3 border-t border-[var(--border-line)] border-dotted">
            <span>ORIENTASI EXIF OTOMATIS</span>
            <span className="text-[var(--text-ink)] underline underline-offset-4">TELUSURI BERKAS &rarr;</span>
          </div>
        </button>
      ) : (
        /* Lembar Kontak Foto Terpilih */
        <div className="w-full border border-[var(--border-line)] p-3 bg-[var(--surface-subtle)] flex flex-col gap-3 rounded-[4px]">
          <div className="flex items-start gap-3">
            <div className="w-20 h-20 shrink-0 border border-[var(--border-line)] bg-black/5 overflow-hidden">
              <img
                src={currentImage.previewUrl}
                alt={currentImage.fileName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col justify-between flex-1 min-w-0">
              <div>
                <span className="font-technical text-[10px] tracking-wider text-[var(--text-muted)] uppercase block">
                  LEMBAR KONTAK // AKTIF
                </span>
                <span className="text-sm font-semibold font-body text-[var(--text-ink)] truncate block">
                  {currentImage.fileName}
                </span>
              </div>
              <div className="font-technical text-xs text-[var(--text-muted)] flex flex-col gap-0.5 mt-1">
                <span>
                  DIMENSI: <b className="text-[var(--text-ink)]">{currentImage.width} × {currentImage.height} px</b>
                </span>
                <span>
                  UKURAN: {formatFileSize(currentImage.fileSizeBytes)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[var(--border-line)]">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs font-technical text-[var(--text-muted)] hover:text-[var(--text-ink)] underline underline-offset-4"
            >
              GANTI FOTO
            </button>
            <button
              type="button"
              onClick={onClearImage}
              className="text-xs font-technical text-[var(--accent-safelight)] hover:underline underline-offset-4"
            >
              HAPUS
            </button>
          </div>
        </div>
      )}

      {/* Kontrol Segmen: Skala, 4K, dan Mesin */}
      <div className="flex flex-col gap-3">
        {/* Kontrol Segmen Skala */}
        <div className="flex flex-col gap-1.5">
          <label className="font-technical text-[11px] tracking-wider text-[var(--text-muted)] uppercase">
            FAKTOR PEMBESARAN
          </label>
          <div className="grid grid-cols-2 gap-1.5 p-1 border border-[var(--border-line)] rounded-[4px] bg-[var(--surface-subtle)]">
            <button
              type="button"
              onClick={() => onScaleChange(2)}
              className={`h-9 px-3 text-xs font-technical font-medium tracking-wider uppercase transition-colors rounded-[2px] ${
                scale === 2
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] border border-[var(--border-line)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              SKALA 2× (HEMAT RAM)
            </button>
            <button
              type="button"
              onClick={() => onScaleChange(4)}
              className={`h-9 px-3 text-xs font-technical font-medium tracking-wider uppercase transition-colors rounded-[2px] ${
                scale === 4
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] border border-[var(--border-line)] font-semibold shadow-xs'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              SKALA 4× (NATIVE)
            </button>
          </div>
        </div>

        {/* Kontrol Batas 4K & Mode dalam Baris Segmen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Toggle Batas 4K */}
          <button
            type="button"
            onClick={() => onLimit4KChange(!limit4K)}
            className={`h-10 px-3 border rounded-[4px] flex items-center justify-between font-technical text-xs transition-colors ${
              limit4K
                ? 'border-[var(--text-ink)] bg-[var(--surface-subtle)] text-[var(--text-ink)]'
                : 'border-[var(--border-line)] text-[var(--text-muted)]'
            }`}
          >
            <span>BATASI 4K (3840×2160)</span>
            <span className="font-semibold">{limit4K ? '[ AKTIF ]' : '[ NON ]'}</span>
          </button>

          {/* Pemilihan Mode Mesin */}
          <div className="h-10 p-0.5 border border-[var(--border-line)] rounded-[4px] bg-[var(--surface-subtle)] flex items-center">
            <button
              type="button"
              onClick={() => onModeChange('ai')}
              className={`flex-1 h-full text-[11px] font-technical uppercase tracking-wider rounded-[2px] transition-colors ${
                mode === 'ai'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] font-semibold border border-[var(--border-line)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              MODEL ESRGAN
            </button>
            <button
              type="button"
              onClick={() => onModeChange('algorithmic')}
              className={`flex-1 h-full text-[11px] font-technical uppercase tracking-wider rounded-[2px] transition-colors ${
                mode === 'algorithmic'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] font-semibold border border-[var(--border-line)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              RESIZE BIASA
            </button>
          </div>
        </div>

        {/* Status File Model Lokal jika Terpasang */}
        {customModelFile && (
          <div className="font-technical text-[11px] text-[var(--text-ink)] p-2 border border-[var(--border-line)] bg-[var(--surface-subtle)] flex items-center justify-between rounded-[3px]">
            <span>MODEL LOKAL: {customModelFile.name}</span>
            <button
              type="button"
              onClick={() => onCustomModelFileChange(null)}
              className="text-[var(--accent-safelight)] hover:underline"
            >
              [ GANTI ]
            </button>
          </div>
        )}
      </div>

      {/* Lembar Data Spesifikasi Teknis (Technical Data Sheet) */}
      <div className="border-t border-b border-[var(--border-line)] py-3 flex flex-col gap-2 font-technical text-xs">
        <span className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase">
          LEMBAR DATA TEKNIS
        </span>

        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px]">
          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-0.5">
            <span className="text-[var(--text-muted)]">TARGET OUTPUT</span>
            <span className="font-semibold text-[var(--text-ink)]">
              {calculation ? `${calculation.outputWidth} × ${calculation.outputHeight}` : '—'}
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-0.5">
            <span className="text-[var(--text-muted)]">ESTIMASI PETAK</span>
            <span className="text-[var(--text-ink)]">
              {calculation ? `${calculation.totalTiles} (${calculation.tilesX}×${calculation.tilesY})` : '—'}
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-0.5">
            <span className="text-[var(--text-muted)]">ESTIMASI DURASI</span>
            <span className="text-[var(--text-ink)]">
              {calculation ? `~${calculation.estimatedSeconds} detik` : '—'}
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-0.5">
            <span className="text-[var(--text-muted)]">SAFARI SAFELIMIT</span>
            <span className={calculation?.exceedsSafariLimit ? 'text-[var(--accent-safelight)] font-bold' : 'text-[var(--text-ink)]'}>
              {calculation?.exceedsSafariLimit ? 'BAHAYA (EXCEED)' : 'AMAN (≤16.7 MP)'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-[var(--text-muted)] leading-relaxed pt-1">
          Proses per petak 128 px berurutan. Semua pemrosesan berlangsung 100% di browser, berkas tidak pernah diunggah ke peladen luar.
        </p>
      </div>
    </div>
  );
};
