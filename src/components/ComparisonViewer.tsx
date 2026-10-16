/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Eye, ZoomIn, ZoomOut, RotateCcw, Sparkles, Zap } from 'lucide-react';
import { UpscaleMode } from '../types/upscaler';

interface ComparisonViewerProps {
  originalUrl: string;
  enhancedUrl: string;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number;
  enhancedHeight: number;
  mode: UpscaleMode;
  executionProvider: string;
  elapsedMs: number;
}

export const ComparisonViewer: React.FC<ComparisonViewerProps> = ({
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
  mode,
  executionProvider,
  elapsedMs,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length > 0) {
      updateSliderFromClientX(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      updateSliderFromClientX(e.clientX);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    updateSliderFromClientX(e.clientX);
  };

  useEffect(() => {
    const handlePointerUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handlePointerUp);
    return () => window.removeEventListener('pointerup', handlePointerUp);
  }, []);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Badge Ringkasan Hasil */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60 text-xs">
        <div className="flex items-center gap-2">
          {mode === 'ai' ? (
            <span className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0">
              <Sparkles className="w-4 h-4" />
            </span>
          ) : (
            <span className="p-1.5 rounded-lg bg-amber-500 text-white shrink-0">
              <Zap className="w-4 h-4" />
            </span>
          )}
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>{enhancedWidth} × {enhancedHeight} px</span>
              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                (Selesai dalam {(elapsedMs / 1000).toFixed(1)}d)
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {executionProvider}
            </p>
          </div>
        </div>

        {/* Kontrol Zoom Ringan */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.5))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs"
            title="Perbesar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(1, z - 0.5))}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs"
            title="Perkecil"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoomLevel > 1 && (
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Kontainer Slider Perbandingan (Touch-friendly & Smooth) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onTouchMove={handleTouchMove}
        className="w-full relative aspect-[4/3] rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-700 select-none cursor-ew-resize bg-slate-900 touch-none shadow-md"
      >
        {/* Gambar Sesudah (SuperPixel / Enhanced) di Latar Belakang */}
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-100"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <img
            src={enhancedUrl}
            alt="Hasil SuperPixel"
            className="w-full h-full object-contain pointer-events-none"
            style={{ imageRendering: 'auto' }}
          />
        </div>

        {/* Gambar Sebelum (Original) di Layer Atas dengan Clip Path */}
        <div
          className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-100"
          style={{
            clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
            transform: `scale(${zoomLevel})`,
          }}
        >
          <img
            src={originalUrl}
            alt="Gambar Asli"
            className="w-full h-full object-contain pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Garis Pemisah Slider & Handle Sentuh */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.6)] z-20 pointer-events-none"
          style={{ left: `${sliderPosition}%` }}
        >
          {/* Thumb Bulat Ramah Sentuhan Jempol */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white dark:bg-slate-900 border-2 border-indigo-600 shadow-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <div className="flex items-center gap-0.5">
              <span className="w-1 h-3.5 rounded-full bg-indigo-500"></span>
              <span className="w-1 h-3.5 rounded-full bg-indigo-500"></span>
            </div>
          </div>
        </div>

        {/* Label Sebelum & Sesudah */}
        <div className="absolute bottom-3 left-3 z-30 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide border border-white/10 shadow-sm">
            Sebelum ({originalWidth}×{originalHeight})
          </span>
        </div>
        <div className="absolute bottom-3 right-3 z-30 pointer-events-none">
          <span className="px-2.5 py-1 rounded-lg bg-indigo-600/85 backdrop-blur-md text-white text-[11px] font-semibold tracking-wide border border-white/20 shadow-sm">
            Sesudah ({enhancedWidth}×{enhancedHeight})
          </span>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 dark:text-slate-400">
        👆 Geser garis pemisah ke kiri atau kanan untuk membandingkan ketajaman detail.
      </p>
    </div>
  );
};
