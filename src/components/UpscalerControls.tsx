/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Settings2,
  Clock,
  Layers,
  HardDrive,
  Upload,
} from 'lucide-react';
import { ScaleCalculation } from '../utils/canvasLimit';
import { UpscaleMode } from '../types/upscaler';

interface UpscalerControlsProps {
  scale: 2 | 4;
  onScaleChange: (scale: 2 | 4) => void;
  limit4K: boolean;
  onLimit4KChange: (limit: boolean) => void;
  mode: UpscaleMode;
  onModeChange: (mode: UpscaleMode) => void;
  calculation: ScaleCalculation | null;
  modelUrl: string;
  onModelUrlChange: (url: string) => void;
  customModelFile: File | null;
  onCustomModelFileChange: (file: File | null) => void;
  isModelCached: boolean;
  onClearCache: () => void;
  onStart: () => void;
  disabled?: boolean;
}

export const UpscalerControls: React.FC<UpscalerControlsProps> = ({
  scale,
  onScaleChange,
  limit4K,
  onLimit4KChange,
  mode,
  onModeChange,
  calculation,
  modelUrl,
  onModelUrlChange,
  customModelFile,
  onCustomModelFileChange,
  isModelCached,
  onClearCache,
  onStart,
  disabled,
}) => {
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Pemilihan Skala (2x vs 4x) */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Pilih Faktor Skala
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => onScaleChange(2)}
            disabled={disabled}
            className={`min-h-[56px] p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
              scale === 2
                ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-lg font-extrabold tracking-tight">2× Skala</span>
            <span className="text-[11px] font-normal opacity-80">
              Cepat & Paling Hemat RAM
            </span>
          </button>

          <button
            type="button"
            onClick={() => onScaleChange(4)}
            disabled={disabled}
            className={`min-h-[56px] p-3 rounded-2xl border flex flex-col items-center justify-center transition-all ${
              scale === 4
                ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-bold ring-2 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-lg font-extrabold tracking-tight">4× Skala</span>
            <span className="text-[11px] font-normal opacity-80">
              Resolusi Ekstra Tinggi
            </span>
          </button>
        </div>
      </div>

      {/* 2. Opsi Batasi Output Maksimal 4K */}
      <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex items-start justify-between gap-3 shadow-xs">
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            Batasi output maksimal 4K (3840×2160)
          </span>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Menjaga rasio aspek tetap asli sambil mencegah Safari iOS menutup tab
            akibat keterbatasan canvas perangkat.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-0.5">
          <input
            type="checkbox"
            checked={limit4K}
            onChange={(e) => onLimit4KChange(e.target.checked)}
            disabled={disabled}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      {/* 3. Pemilihan Mode Pemrosesan */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Mesin Pemrosesan
          </label>
          <button
            type="button"
            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 hover:underline"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showAdvancedSettings ? 'Tutup Pengaturan' : 'Atur Model ONNX'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onModeChange('ai')}
            disabled={disabled}
            className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
              mode === 'ai'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>AI Super-Resolution</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              ONNX (WebGPU / WASM)
            </span>
          </button>

          <button
            type="button"
            onClick={() => onModeChange('algorithmic')}
            disabled={disabled}
            className={`p-3 rounded-xl border flex flex-col items-start gap-1 text-left transition-all ${
              mode === 'algorithmic'
                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200 ring-1 ring-indigo-500/20'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold text-xs">
              <Zap className="w-3.5 h-3.5 text-amber-500" />
              <span>Algoritmik Cepat</span>
            </div>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
              Lanczos + Unsharp Mask
            </span>
          </button>
        </div>
      </div>

      {/* Accordion Pengaturan Model ONNX */}
      {showAdvancedSettings && (
        <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
              Model: realesr-general-x4v3.onnx (4.6 MB)
            </span>
            {isModelCached && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-medium">
                Tersimpan di Cache API
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Arsitektur <b>SRVGGNetCompact</b> (BSD-3). Kontrak: float32 [1,3,h,w] RGB [0-1] NCHW &rarr; [1,3,4h,4w] [0-1]. Native x4 (pilihan x2 di-upscale x4 lalu di-downscale ke x2 dengan interpolasi Bicubic berkualitas tinggi).
          </p>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              URL Model ONNX:
            </label>
            <input
              type="text"
              value={modelUrl}
              onChange={(e) => onModelUrlChange(e.target.value)}
              placeholder="https://.../realesr-general-x4v3.onnx"
              disabled={disabled}
              className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
              Opsi File Lokal (Bebas Kendala CORS)
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Jika unduhan dari URL diblokir oleh kebijakan CORS browser, unduh file model secara manual atau pilih file dari memori iPhone / komputer Anda:
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <label className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold cursor-pointer flex items-center gap-1.5 transition-all shadow-xs">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File .onnx dari Perangkat</span>
                <input
                  type="file"
                  accept=".onnx"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onCustomModelFileChange(f);
                  }}
                  className="hidden"
                />
              </label>

              {modelUrl && (
                <a
                  href={modelUrl}
                  target="_blank"
                  rel="noreferrer"
                  download="realesr-general-x4v3.onnx"
                  className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium transition-colors"
                >
                  Unduh Model (4.6 MB)
                </a>
              )}
            </div>

            {customModelFile && (
              <div className="flex items-center gap-2 mt-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>File aktif: {customModelFile.name} ({(customModelFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
              </div>
            )}
          </div>

          {isModelCached && (
            <button
              type="button"
              onClick={onClearCache}
              className="self-start text-[11px] text-rose-600 dark:text-rose-400 hover:underline"
            >
              Hapus Cache Model Browser
            </button>
          )}

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
            💡 Sesuai instruksi: Jika URL tidak diisi atau gagal dimuat, sistem
            otomatis beralih ke peningkatan Lanczos + Smart Sharpening tanpa pesan error yang mengganggu.
          </p>
        </div>
      )}

      {/* 4. Panel Info Detail Resolusi & Estimasi Waktu */}
      {calculation && (
        <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 flex flex-col gap-2.5 text-xs shadow-xs">
          <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Resolusi Input
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {calculation.inputWidth} × {calculation.inputHeight} px
              </span>
            </div>
            <div>
              <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                Resolusi Target Output
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-indigo-400">
                  {calculation.outputWidth} × {calculation.outputHeight} px
                </span>
                {calculation.isCappedBy4K && (
                  <span className="px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                    4K
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Estimasi: ~{calculation.estimatedSeconds} detik</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {calculation.totalTiles} Petak ({128}×{128} px)
              </span>
            </div>
          </div>

          {/* Peringatan jika melebihi batas canvas Safari iOS */}
          {calculation.warningMessage && (
            <div
              className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                calculation.exceedsSafariLimit
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-900'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-snug">{calculation.warningMessage}</span>
            </div>
          )}
        </div>
      )}

      {/* 5. Tombol Aksi Utama yang Ramah Jempol (Thumb-Friendly Primary Button) */}
      <button
        type="button"
        onClick={onStart}
        disabled={disabled || !calculation || calculation.exceedsSafariLimit}
        className="w-full min-h-[54px] rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white font-bold text-base shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
      >
        <Sparkles className="w-5 h-5" />
        <span>Mulai Tingkatkan Gambar ({scale}×)</span>
      </button>
    </div>
  );
};
