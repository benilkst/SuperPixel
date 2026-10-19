/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CompareSlider } from './CompareSlider';
import { LoadedImageInfo } from './ImageUploader';

interface StateResultProps {
  originalImage: LoadedImageInfo;
  resultUrl: string;
  resultBlob: Blob;
  outputWidth: number;
  outputHeight: number;
  effectiveScale: number;
  executionProvider: string;
  elapsedMs: number;
  onReset: () => void;
}

export const StateResult: React.FC<StateResultProps> = ({
  originalImage,
  resultUrl,
  resultBlob,
  outputWidth,
  outputHeight,
  effectiveScale,
  executionProvider,
  elapsedMs,
  onReset,
}) => {
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png');
  const [isExporting, setIsExporting] = useState(false);

  const handleDownload = async () => {
    setIsExporting(true);
    try {
      const baseName = originalImage.fileName.replace(/\.[^/.]+$/, '');
      const downloadName = `${baseName}-superpixel-${effectiveScale}x.${downloadFormat}`;

      if (downloadFormat === 'png' && resultBlob.type === 'image/png') {
        const link = document.createElement('a');
        link.href = resultUrl;
        link.download = downloadName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Convert format via canvas
        const img = new Image();
        img.src = resultUrl;
        await new Promise((res) => {
          img.onload = res;
        });

        const canvas = document.createElement('canvas');
        canvas.width = outputWidth;
        canvas.height = outputHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = downloadName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
              }
            },
            `image/${downloadFormat}`,
            0.92
          );
        }
      }
    } catch (err) {
      console.error('Gagal mengunduh gambar:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([resultBlob], `upscaled-${effectiveScale}x.png`, {
          type: resultBlob.type,
        });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Hasil Upscale SuperPixel',
            text: `Hasil upscale ${effectiveScale}x (${outputWidth}x${outputHeight}) dengan SuperPixel!`,
          });
        }
      } catch (err) {
        console.warn('Share dibatalkan atau tidak didukung:', err);
      }
    }
  };

  const elapsedSec = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="w-full flex flex-col gap-5">
      {/* Compare Slider */}
      <CompareSlider
        beforeUrl={originalImage.previewUrl}
        afterUrl={resultUrl}
        beforeLabel={`Asli (${originalImage.width}×${originalImage.height})`}
        afterLabel={`Terskala (${outputWidth}×${outputHeight})`}
      />

      {/* Info Card */}
      <div className="p-4 rounded-3xl neu-raised flex flex-col gap-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Resolusi Baru
          </span>
          <span className="font-mono font-bold text-[var(--text-primary)]">
            {originalImage.width}×{originalImage.height} → {outputWidth}×{outputHeight} ({effectiveScale}×)
          </span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Akselerasi & Waktu
          </span>
          <span className="text-[11px] font-semibold text-[var(--accent)]">
            {executionProvider} · {elapsedSec} detik
          </span>
        </div>

        {/* Format Selector */}
        <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5 text-xs">
          <span className="font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">
            Format Simpan
          </span>
          <div className="flex items-center gap-1.5 p-1 rounded-xl neu-inset">
            <button
              type="button"
              onClick={() => setDownloadFormat('png')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                downloadFormat === 'png'
                  ? 'neu-raised text-[var(--accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              PNG (Lossless)
            </button>
            <button
              type="button"
              onClick={() => setDownloadFormat('jpeg')}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                downloadFormat === 'jpeg'
                  ? 'neu-raised text-[var(--accent)]'
                  : 'text-[var(--text-secondary)]'
              }`}
            >
              JPG (Kecil)
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={onReset}
          className="w-full sm:flex-1 py-3.5 px-4 rounded-2xl neu-raised hover:neu-pressed active:neu-pressed text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer text-center"
        >
          Proses Foto Baru
        </button>

        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <button
            type="button"
            onClick={handleShare}
            aria-label="Bagikan gambar"
            className="w-full sm:w-auto py-3.5 px-4 rounded-2xl neu-raised hover:neu-pressed active:neu-pressed text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            <span>Bagikan</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleDownload}
          disabled={isExporting}
          className="w-full sm:flex-2 py-3.5 px-6 rounded-2xl neu-btn-primary text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all active:scale-[0.98]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isExporting ? 'Menyiapkan Berkas...' : `Unduh ${downloadFormat.toUpperCase()}`}
        </button>
      </div>
    </div>
  );
};
