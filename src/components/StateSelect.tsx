/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef } from 'react';
import { ImageUploader, LoadedImageInfo } from './ImageUploader';
import { UpscalerControls } from './UpscalerControls';
import { ScaleCalculation } from '../utils/canvasLimit';
import { UpscaleMode } from '../types/upscaler';

interface StateSelectProps {
  currentImage: LoadedImageInfo | null;
  onImageSelected: (file: File) => void;
  onClearImage: () => void;
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
  allowExtremeResolution,
  onAllowExtremeResolutionChange,
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
  const localModelInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Pengunggah Citra */}
      <ImageUploader
        currentImage={currentImage}
        onImageSelected={onImageSelected}
        onClearImage={onClearImage}
      />

      {/* 2. Pengaturan Parameter Citra */}
      <UpscalerControls
        scale={scale}
        onScaleChange={onScaleChange}
        limit4K={limit4K}
        onLimit4KChange={onLimit4KChange}
        allowExtremeResolution={allowExtremeResolution}
        onAllowExtremeResolutionChange={onAllowExtremeResolutionChange}
        downloadFormat={downloadFormat}
        onDownloadFormatChange={onDownloadFormatChange}
        jpegQuality={jpegQuality}
        onJpegQualityChange={onJpegQualityChange}
        mode={mode}
        onModeChange={onModeChange}
        disabled={!currentImage}
      />

      {/* Input File Model ONNX Kustom Tersembunyi */}
      <input
        ref={localModelInputRef}
        type="file"
        accept=".onnx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onCustomModelFileChange(file);
          }
        }}
      />

      {/* Status Model & Model Kustom */}
      <div className="flex flex-col gap-2 p-3 rounded-2xl neu-inset">
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

        {mode === 'algorithmic' && (
          <div className="px-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--accent)]">Mode Ultra-HD Super-Res:</span>{' '}
            Menggunakan spline Catmull-Rom anti-ringing dan penajaman kontur adaptif. 100% aman tanpa crash memori di Safari iPhone.
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

          {calculation.warningMessage && (
            <div className="p-2.5 rounded-xl bg-[var(--error)]/10 text-[var(--error)] text-[11px] leading-relaxed">
              {calculation.warningMessage}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
