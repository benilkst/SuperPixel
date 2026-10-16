/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Download, Check, RefreshCw, FileText } from 'lucide-react';

interface DownloadCardProps {
  canvas: HTMLCanvasElement | null;
  defaultFileName: string;
  onReset: () => void;
}

export const DownloadCard: React.FC<DownloadCardProps> = ({
  canvas,
  defaultFileName,
  onReset,
}) => {
  const [format, setFormat] = useState<'png' | 'jpeg'>('jpeg');
  const [quality, setQuality] = useState<number>(92); // 10 to 100
  const [estimatedSizeStr, setEstimatedSizeStr] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isDownloaded, setIsDownloaded] = useState<boolean>(false);

  // Perkirakan ukuran file secara dinamis
  useEffect(() => {
    if (!canvas) return;

    let isMounted = true;
    const calculateSize = async () => {
      try {
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const q = format === 'png' ? undefined : quality / 100;
        canvas.toBlob(
          (blob) => {
            if (!isMounted || !blob) return;
            const bytes = blob.size;
            if (bytes < 1024) setEstimatedSizeStr(`${bytes} B`);
            else if (bytes < 1024 * 1024)
              setEstimatedSizeStr(`${(bytes / 1024).toFixed(1)} KB`);
            else setEstimatedSizeStr(`${(bytes / (1024 * 1024)).toFixed(2)} MB`);
          },
          mime,
          q
        );
      } catch (e) {
        console.warn('Gagal menghitung perkiraan ukuran:', e);
      }
    };

    const timeout = setTimeout(calculateSize, 120);
    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [canvas, format, quality]);

  const handleDownload = () => {
    if (!canvas) return;
    setIsExporting(true);

    try {
      const mime = format === 'png' ? 'image/png' : 'image/jpeg';
      const extension = format === 'png' ? 'png' : 'jpg';
      const q = format === 'png' ? undefined : quality / 100;

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            setIsExporting(false);
            return;
          }

          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          const baseName = defaultFileName.replace(/\.[^/.]+$/, '');
          link.download = `${baseName}_superpixel.${extension}`;
          link.href = url;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          setTimeout(() => URL.revokeObjectURL(url), 2000);
          setIsExporting(false);
          setIsDownloaded(true);
          setTimeout(() => setIsDownloaded(false), 3000);
        },
        mime,
        q
      );
    } catch (err) {
      console.error('Gagal mengekspor file:', err);
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 shadow-sm flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
          Unduh Hasil Gambar
        </h3>
        {estimatedSizeStr && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            Perkiraan: ~{estimatedSizeStr}
          </span>
        )}
      </div>

      {/* Pemilihan Format (JPG vs PNG) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Format File
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFormat('jpeg')}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
              format === 'jpeg'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>JPG (Ukuran Ringan)</span>
            <span className="text-[10px] font-normal opacity-80">Cocok untuk foto & web</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat('png')}
            className={`p-2.5 rounded-xl border text-xs font-semibold transition-all flex flex-col items-center gap-0.5 ${
              format === 'png'
                ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>PNG (Kualitas Penuh)</span>
            <span className="text-[10px] font-normal opacity-80">Lossless tanpa kompresi</span>
          </button>
        </div>
      </div>

      {/* Slider Kualitas untuk JPG */}
      {format === 'jpeg' && (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Kualitas Kompresi JPG:
            </span>
            <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
              {quality}%
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={quality}
            onChange={(e) => setQuality(parseInt(e.target.value, 10))}
            className="w-full accent-indigo-600 h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Ukuran Terkecil (10%)</span>
            <span>Seimbang (85-92%)</span>
            <span>Maksimal (100%)</span>
          </div>
        </div>
      )}

      {/* Tombol Unduh Utama yang Ramah Jempol */}
      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={handleDownload}
          disabled={!canvas || isExporting}
          className="w-full min-h-[52px] rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
        >
          {isExporting ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : isDownloaded ? (
            <>
              <Check className="w-5 h-5 text-white" />
              <span>Berhasil Diunduh!</span>
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              <span>Unduh Gambar ({format.toUpperCase()})</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Tingkatkan Gambar Lain
        </button>
      </div>
    </div>
  );
};
