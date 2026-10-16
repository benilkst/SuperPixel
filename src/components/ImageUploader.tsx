/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';
import { ImagePlus, Upload, RefreshCw, AlertCircle, FileImage } from 'lucide-react';
import { loadImageWithExifOrientation } from '../utils/exif';

export interface LoadedImageInfo {
  file: File | Blob;
  fileName: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  previewUrl: string;
}

interface ImageUploaderProps {
  onImageLoaded: (info: LoadedImageInfo) => void;
  currentImage: LoadedImageInfo | null;
  onClear: () => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageLoaded,
  currentImage,
  onClear,
  disabled,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await processSelectedFile(file);
    // Reset input value agar dapat memilih file yang sama lagi jika diinginkan
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processSelectedFile = async (file: File | Blob, nameOverride?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (!file.type.startsWith('image/')) {
        throw new Error('Format file tidak didukung. Harap pilih gambar JPG atau PNG.');
      }

      // Muat gambar dengan koreksi orientasi EXIF (iPhone camera friendly)
      const { canvas, width, height } = await loadImageWithExifOrientation(file);
      const previewUrl = canvas.toDataURL('image/jpeg', 0.85);
      const fileName = nameOverride || ('name' in file ? file.name : 'gambar.jpg');

      onImageLoaded({
        file,
        fileName,
        fileSizeBytes: file.size,
        width,
        height,
        canvas,
        previewUrl,
      });
    } catch (err: unknown) {
      console.error(err);
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat memuat gambar. Silakan coba gambar lain.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Contoh gambar bawaan untuk pengujian cepat 1-sentuhan
  const loadSampleImage = async (type: 'flower' | 'portrait') => {
    setIsLoading(true);
    try {
      const sampleCanvas = document.createElement('canvas');
      sampleCanvas.width = 320;
      sampleCanvas.height = 240;
      const ctx = sampleCanvas.getContext('2d');
      if (!ctx) return;

      if (type === 'flower') {
        // Gambar sintetis pemandangan bunga untuk tes upscale
        const gradient = ctx.createLinearGradient(0, 0, 320, 240);
        gradient.addColorStop(0, '#f9a8d4');
        gradient.addColorStop(0.5, '#c084fc');
        gradient.addColorStop(1, '#818cf8');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 320, 240);

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(160, 120, 45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(160, 120, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Sample 320×240', 160, 200);
      } else {
        // Sampel pola geometris bertekstur
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 240);

        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 4;
        for (let i = 20; i < 300; i += 30) {
          ctx.beginPath();
          ctx.moveTo(i, 20);
          ctx.lineTo(i + 15, 220);
          ctx.stroke();
        }

        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Detail Tekstur', 160, 120);
      }

      const blob = await new Promise<Blob>((resolve) =>
        sampleCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.9)
      );

      await processSelectedFile(blob, `sample_${type}.jpg`);
    } catch {
      setErrorMessage('Gagal memuat sampel gambar');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Input File Tersembunyi */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        disabled={disabled || isLoading}
        className="hidden"
        id="image-file-input"
      />

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!currentImage ? (
        <div className="flex flex-col gap-3">
          {/* Tombol Utama Input File yang Ramah Jempol */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isLoading}
            className="w-full min-h-[140px] p-6 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-800/80 bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 active:scale-[0.99] transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 group-hover:scale-105 transition-transform">
              {isLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin" />
              ) : (
                <ImagePlus className="w-7 h-7" />
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Pilih Gambar dari Galeri
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Mendukung JPG, PNG, atau WebP (Orientasi EXIF otomatis diperbaiki)
              </p>
            </div>
          </button>

          {/* Opsi Sampel Instan untuk Pengujian Cepat */}
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Atau coba sampel cepat:
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => loadSampleImage('flower')}
                disabled={isLoading}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Bunga (Warna)
              </button>
              <button
                type="button"
                onClick={() => loadSampleImage('portrait')}
                disabled={isLoading}
                className="px-2.5 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium transition-colors"
              >
                Pola Garis
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Pratinjau Gambar yang Telah Dipilih */
        <div className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 relative">
                <img
                  src={currentImage.previewUrl}
                  alt="Pratinjau input"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {currentImage.fileName}
                </p>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  <span className="font-medium text-indigo-600 dark:text-indigo-400">
                    {currentImage.width} × {currentImage.height} px
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(currentImage.fileSizeBytes)}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClear}
              disabled={disabled}
              className="px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            >
              Ganti Foto
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
