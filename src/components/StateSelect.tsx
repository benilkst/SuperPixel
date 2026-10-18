/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ImageUploader, LoadedImageInfo } from './ImageUploader';
import { UpscalerControls } from './UpscalerControls';
import { ScaleCalculation } from '../utils/canvasLimit';
import { UpscaleMode } from '../types/upscaler';
import { MODEL_URL } from '../constants/config';
import { downloadAndCacheModel } from '../utils/modelCache';

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
  onModelStorageUpdated?: () => void;
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
  onModelStorageUpdated,
}) => {
  const localModelInputRef = useRef<HTMLInputElement>(null);
  const [isDownloadingModel, setIsDownloadingModel] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<{
    percentage: number;
    loadedMb: string;
    totalMb: string;
  } | null>(null);

  const handleManualDownloadModel = async () => {
    setIsDownloadingModel(true);
    setDownloadProgress({ percentage: 0, loadedMb: '0.0', totalMb: '4.6' });

    try {
      await downloadAndCacheModel(MODEL_URL, (pct, loaded, total) => {
        setDownloadProgress({
          percentage: pct,
          loadedMb: (loaded / (1024 * 1024)).toFixed(1),
          totalMb: (total / (1024 * 1024)).toFixed(1),
        });
      });
      setIsDownloadingModel(false);
      setDownloadProgress(null);
      onModelStorageUpdated?.();
    } catch (err) {
      setIsDownloadingModel(false);
      setDownloadProgress(null);
      console.warn('Gagal mengunduh model secara manual:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Banner Jaminan Privasi On-Device (Keunggulan Utama Dibanding Cloud) */}
      <div className="w-full p-3.5 rounded-3xl neu-raised flex items-center gap-3 border border-[var(--accent)]/20 bg-[var(--accent)]/5">
        <div className="w-10 h-10 rounded-2xl neu-inset flex items-center justify-center text-[var(--accent)] shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-[var(--text-primary)]">
              100% On-Device & Privat
            </span>
            <span className="px-1.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wider bg-[var(--accent)] text-white">
              Bebas Cloud
            </span>
          </div>
          <p className="text-[11px] text-[var(--text-secondary)] leading-tight mt-0.5">
            Foto diproses sepenuhnya di browser perangkat Anda tanpa pernah diunggah ke server mana pun. Aman untuk data pribadi & dokumen rahasia.
          </p>
        </div>
      </div>

      {/* 2. Pengunggah Citra */}
      <ImageUploader
        currentImage={currentImage}
        onImageSelected={onImageSelected}
        onClearImage={onClearImage}
      />

      {/* 3. Pengaturan Parameter Citra */}
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

      {/* 4. Panel Manajemen Cache Model AI */}
      <div className="flex flex-col gap-2.5 p-3.5 rounded-2xl neu-inset">
        {mode === 'ai' && (
          <>
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[var(--text-primary)]">
                Model AI Real-ESRGAN (4.6 MB)
              </span>
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase font-tabular">
                {isModelStored ? 'Tersimpan Offline' : 'Siap Diunduh'}
              </span>
            </div>

            {/* Jika sedang mengunduh model manual */}
            {isDownloadingModel && downloadProgress && (
              <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-black/5 dark:bg-white/5">
                <div className="flex justify-between items-center text-[11px] text-[var(--text-secondary)] font-tabular">
                  <span>Mengunduh ke cache perangkat...</span>
                  <span className="font-bold text-[var(--accent)]">
                    {downloadProgress.loadedMb} / {downloadProgress.totalMb} MB ({downloadProgress.percentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full neu-inset overflow-hidden p-0.5">
                  <div
                    className="h-full rounded-full bg-[var(--accent)] transition-all duration-150"
                    style={{ width: `${downloadProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* Status dan Tombol Aksi Cache */}
            <div className="flex items-center justify-between text-[11px] text-[var(--text-secondary)] pt-0.5">
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isModelStored ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span className="truncate">
                  {customModelFile
                    ? `Model lokal: ${customModelFile.name}`
                    : isModelStored
                    ? 'Tersimpan di Cache API (Bebas kuota internet)'
                    : 'Belum disimpan ke penyimpanan perangkat'}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {!isModelStored && !customModelFile && !isDownloadingModel && (
                  <button
                    type="button"
                    onClick={handleManualDownloadModel}
                    className="h-6 px-2.5 rounded-full neu-btn-primary text-[10px] font-bold uppercase tracking-wider cursor-pointer"
                  >
                    Simpan Offline
                  </button>
                )}
                {isModelStored && onClearModelStorage && (
                  <button
                    type="button"
                    onClick={onClearModelStorage}
                    className="underline hover:text-[var(--error)] cursor-pointer transition-colors"
                  >
                    Hapus Cache
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => localModelInputRef.current?.click()}
                  className="underline hover:text-[var(--accent)] cursor-pointer"
                >
                  {customModelFile ? 'Ganti .onnx' : 'Pilih .onnx'}
                </button>
              </div>
            </div>
          </>
        )}

        {mode === 'algorithmic' && (
          <div className="px-1 text-[11px] text-[var(--text-secondary)] leading-relaxed">
            <span className="font-semibold text-[var(--accent)]">Mesin Ultra-HD Super-Res:</span>{' '}
            Menggunakan spline Catmull-Rom anti-ringing dan penajaman kontur adaptif frekuensi multi-skala. Konsumsi RAM sangat rendah (&lt; 15 MB) dan 100% bebas crash memori di Safari iPhone.
          </div>
        )}
      </div>

      {/* 5. Lembar Estimasi Ukuran Output & Pengaman Memori Sebelum Eksekusi */}
      {calculation && (
        <div className="p-4 rounded-3xl neu-raised flex flex-col gap-2.5 text-xs">
          <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-secondary)] px-0.5">
            Estimasi Output & Memori (Pre-Flight)
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div className="p-2.5 rounded-2xl neu-inset flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">Resolusi Input</span>
              <span className="font-bold text-[var(--text-primary)] font-tabular text-[11px]">
                {calculation.inputWidth} × {calculation.inputHeight} px
              </span>
              <span className="text-[9px] text-[var(--text-secondary)] font-tabular">
                {calculation.inputMegapixels} Megapiksel
              </span>
            </div>

            <div className="p-2.5 rounded-2xl neu-inset flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">Resolusi Target</span>
              <span className="font-bold text-[var(--accent)] font-tabular text-[11px]">
                {calculation.outputWidth} × {calculation.outputHeight} px
              </span>
              <span className="text-[9px] text-[var(--accent)] font-tabular font-bold">
                {calculation.outputMegapixels} Megapiksel ({calculation.effectiveScale.toFixed(2)}x)
              </span>
            </div>

            <div className="p-2.5 rounded-2xl neu-inset flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">Estimasi Berkas</span>
              <span className="font-bold text-[var(--text-primary)] font-tabular text-[11px]">
                {downloadFormat === 'png'
                  ? `~${calculation.estimatedPngSizeMB} MB (PNG)`
                  : `~${calculation.estimatedJpgSizeMB} MB (JPG ${jpegQuality}%)`}
              </span>
              <span className="text-[9px] text-[var(--text-secondary)] font-tabular">
                Buffer RAM: ~{calculation.estimatedRamMB} MB
              </span>
            </div>

            <div className="p-2.5 rounded-2xl neu-inset flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--text-secondary)] font-medium">Petak & Durasi</span>
              <span className="font-bold text-[var(--text-primary)] font-tabular text-[11px]">
                {calculation.totalTiles} Petak (256 px)
              </span>
              <span className="text-[9px] text-[var(--text-secondary)] font-tabular">
                Estimasi ~{calculation.estimatedSeconds} detik
              </span>
            </div>
          </div>

          {/* Peringatan Keamanan Input Gambar Sangat Besar */}
          {calculation.inputWarning && (
            <div className="p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-[11px] leading-relaxed flex items-start gap-2">
              <span className="text-xs">⚠️</span>
              <span>{calculation.inputWarning}</span>
            </div>
          )}

          {/* Peringatan Batas Memori Safari */}
          {calculation.warningMessage && (
            <div className="p-2.5 rounded-2xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--text-primary)] text-[11px] leading-relaxed flex items-start gap-2">
              <span className="text-xs">ℹ️</span>
              <span>{calculation.warningMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
