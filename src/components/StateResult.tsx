/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { UpscaleMode } from '../types/upscaler';

interface StateResultProps {
  originalUrl: string;
  enhancedUrl: string;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number;
  enhancedHeight: number;
  effectiveScale: number;
  elapsedMs: number;
  mode: UpscaleMode;
  executionProvider: string;
  format: 'jpeg' | 'png';
  estimatedSizeStr?: string;
  onReset: () => void;
}

type ZoomLevel = 'fit' | '1x' | '2x';

export const StateResult: React.FC<StateResultProps> = ({
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
  effectiveScale,
  elapsedMs,
  mode,
  executionProvider,
  format,
  estimatedSizeStr,
  onReset,
}) => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDraggingSlider, setIsDraggingSlider] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('fit');

  // Pan offset saat mode zoom aktif
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const sliderHandleRef = useRef<HTMLDivElement>(null);

  // Perbarui posisi slider (0 - 100%)
  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Jika pointer menyentuh area dekat pegangan slider, gerakkan slider
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const handleX = rect.left + (sliderPosition / 100) * rect.width;
    const isNearHandle = Math.abs(e.clientX - handleX) < 36;

    if (isNearHandle || zoomLevel === 'fit') {
      setIsDraggingSlider(true);
      updatePosition(e.clientX);
    } else {
      // Jika mode zoom aktif dan tidak menggeser handle, aktifkan drag-to-pan
      setIsPanning(true);
      panStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingSlider) {
      updatePosition(e.clientX);
    } else if (isPanning && zoomLevel !== 'fit') {
      setPanOffset({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      if (isDraggingSlider) {
        updatePosition(e.touches[0].clientX);
      } else if (isPanning && zoomLevel !== 'fit') {
        setPanOffset({
          x: e.touches[0].clientX - panStartRef.current.x,
          y: e.touches[0].clientY - panStartRef.current.y,
        });
      }
    }
  };

  useEffect(() => {
    const handleUp = () => {
      setIsDraggingSlider(false);
      setIsPanning(false);
    };
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  // Dukungan Aksesibilitas Keyboard untuk Slider
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 2;
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - step));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + step));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      setSliderPosition((prev) => (prev > 50 ? 0 : 100));
    }
  };

  // Reset pan saat zoom level berganti ke 'fit'
  const handleZoomChange = (level: ZoomLevel) => {
    setZoomLevel(level);
    if (level === 'fit') {
      setPanOffset({ x: 0, y: 0 });
    }
  };

  // Tentukan skala tampilan citra
  const scaleMultiplier = zoomLevel === 'fit' ? 1 : zoomLevel === '1x' ? 2.2 : 4.0;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Bar Alat Zoom Interaktif */}
      <div className="w-full p-1.5 rounded-2xl neu-inset flex items-center justify-between gap-1 text-xs select-none">
        <div className="flex items-center gap-1.5 px-2 text-[var(--text-secondary)]">
          <svg className="w-3.5 h-3.5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
          <span className="text-[11px] font-bold tracking-wider uppercase">Inspeksi Detail</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleZoomChange('fit')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              zoomLevel === 'fit'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            Fit Layar
          </button>
          <button
            type="button"
            onClick={() => handleZoomChange('1x')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              zoomLevel === '1x'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            1:1 Piksel
          </button>
          <button
            type="button"
            onClick={() => handleZoomChange('2x')}
            className={`px-3 py-1 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
              zoomLevel === '2x'
                ? 'neu-raised text-[var(--accent)] font-extrabold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            2x Zoom
          </button>
        </div>
      </div>

      {/* 2. Slider Sebelum/Sesudah Penuh Lebar dalam Panel Inset */}
      <div className="w-full p-2 rounded-3xl neu-inset">
        <div
          ref={containerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onTouchMove={handleTouchMove}
          className={`relative w-full aspect-[4/3] max-h-[360px] rounded-2xl overflow-hidden select-none touch-none bg-black/5 ${
            zoomLevel === 'fit' ? 'cursor-ew-resize' : isPanning ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          {/* Petunjuk Drag Pan saat mode Zoom aktif */}
          {zoomLevel !== 'fit' && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none px-2.5 py-1 rounded-full neu-raised text-[9px] font-bold text-[var(--accent)] bg-[var(--base)]/90 backdrop-blur-xs">
              Geser layar untuk menjelajahi area detail
            </div>
          )}

          {/* Kontainer Gambar Bersama dengan Transform Zoom & Pan */}
          <div
            className="absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-75"
            style={{
              transform: `scale(${scaleMultiplier}) translate(${panOffset.x / scaleMultiplier}px, ${panOffset.y / scaleMultiplier}px)`,
              transformOrigin: 'center center',
            }}
          >
            {/* Layer Sesudah (Enhanced) */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              <img
                src={enhancedUrl}
                alt="Sesudah"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Layer Sebelum (Original) yang dipotong oleh slider */}
            <div
              className="absolute inset-y-0 left-0 overflow-hidden"
              style={{ width: `${sliderPosition}%` }}
            >
              <div
                className="relative h-full flex items-center justify-center"
                style={{
                  width: containerRef.current ? containerRef.current.clientWidth : '100%',
                }}
              >
                <img
                  src={originalUrl}
                  alt="Sebelum"
                  className="w-full h-full object-contain pointer-events-none"
                />
              </div>
            </div>
          </div>

          {/* Garis Pemisah Interaktif */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] z-20 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Handle Slider dengan Aksesibilitas Keyboard Lengkap */}
            <div
              ref={sliderHandleRef}
              tabIndex={0}
              role="slider"
              aria-label="Penggeser perbandingan sebelum dan sesudah (Gunakan panah kiri/kanan)"
              aria-valuenow={Math.round(sliderPosition)}
              aria-valuemin={0}
              aria-valuemax={100}
              onKeyDown={handleKeyDown}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-[var(--accent)] shadow-md flex items-center justify-center text-xs font-bold pointer-events-auto cursor-ew-resize focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:scale-110 transition-transform active:scale-95"
            >
              ⇄
            </div>
          </div>

          {/* Label Sebelum / Sesudah */}
          <div className="absolute top-3 left-3 z-30 pointer-events-none">
            <span className="px-2 py-0.5 rounded-lg neu-raised text-[10px] font-bold tracking-wider uppercase text-[var(--text-secondary)] font-tabular">
              SEBELUM
            </span>
          </div>

          <div className="absolute top-3 right-3 z-30 pointer-events-none">
            <span className="px-2 py-0.5 rounded-lg neu-raised text-[10px] font-bold tracking-wider uppercase text-[var(--accent)] font-tabular">
              SESUDAH
            </span>
          </div>
        </div>
      </div>

      {/* 3. Kartu Raised Berisi Data Teknis Hasil Pembesaran */}
      <div className="w-full p-4 rounded-3xl neu-raised flex flex-col gap-2.5">
        <span className="text-[11px] font-bold tracking-wider uppercase text-[var(--text-secondary)] px-0.5">
          Data Teknis Hasil Pembesaran
        </span>

        <div className="flex flex-col gap-2 text-xs">
          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Input</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {originalWidth} × {originalHeight} px ({((originalWidth * originalHeight) / 1_000_000).toFixed(1)} MP)
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Output</span>
            <span className="font-bold text-[var(--accent)] font-tabular">
              {enhancedWidth} × {enhancedHeight} px ({((enhancedWidth * enhancedHeight) / 1_000_000).toFixed(1)} MP)
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Skala Efektif</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {effectiveScale.toFixed(2)}×
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Waktu Pemrosesan</span>
            <span className="font-bold text-[var(--text-primary)] font-tabular">
              {(elapsedMs / 1000).toFixed(2)} detik
            </span>
          </div>

          <div className="flex justify-between items-center py-1 border-b border-[var(--border-subtle)]">
            <span className="text-[var(--text-secondary)] font-medium">Mesin Eksekusi</span>
            <span className="px-2 py-0.5 rounded-full bg-[var(--accent)] text-[var(--accent-text)] text-[10px] font-bold tracking-wide uppercase truncate max-w-[200px]">
              {executionProvider || (mode === 'ai' ? 'AI Real-ESRGAN' : 'Ultra-HD Super-Res')}
            </span>
          </div>

          <div className="flex justify-between items-center pt-0.5">
            <span className="text-[var(--text-secondary)] font-medium">Berkas ({format.toUpperCase()})</span>
            <span className="font-medium text-[var(--text-secondary)] font-tabular">
              {estimatedSizeStr ? `~${estimatedSizeStr}` : 'Siap diunduh'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Tombol Sekunder Proses Foto Lain */}
      <button
        type="button"
        onClick={onReset}
        className="w-full h-11 rounded-full neu-btn-secondary text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] cursor-pointer"
      >
        Proses Foto Lain
      </button>
    </div>
  );
};
