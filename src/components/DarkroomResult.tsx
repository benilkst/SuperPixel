/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { UpscaleMode } from '../types/upscaler';

interface DarkroomResultProps {
  originalUrl: string;
  enhancedUrl: string;
  canvas: HTMLCanvasElement;
  originalWidth: number;
  originalHeight: number;
  enhancedWidth: number;
  enhancedHeight: number;
  effectiveScale: number;
  mode: UpscaleMode;
  executionProvider: string;
  elapsedMs: number;
  totalTiles: number;
  defaultFileName: string;
  format: 'jpeg' | 'png';
  onFormatChange: (fmt: 'jpeg' | 'png') => void;
  jpegQuality: number;
  onJpegQualityChange: (q: number) => void;
  estimatedSizeStr: string;
}

export const DarkroomResult: React.FC<DarkroomResultProps> = ({
  originalUrl,
  enhancedUrl,
  originalWidth,
  originalHeight,
  enhancedWidth,
  enhancedHeight,
  effectiveScale,
  mode,
  executionProvider,
  elapsedMs,
  totalTiles,
  format,
  onFormatChange,
  jpegQuality,
  onJpegQualityChange,
  estimatedSizeStr,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50); // 0..100%
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const p = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPos(p);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length > 0) {
      updatePosition(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleUp = () => setIsDragging(false);
    window.addEventListener('pointerup', handleUp);
    return () => window.removeEventListener('pointerup', handleUp);
  }, []);

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Label Keadaan */}
      <div className="flex items-center justify-between font-technical text-xs text-[var(--text-muted)] border-b border-[var(--border-line)] pb-1.5">
        <span className="tracking-wider uppercase">
          [ 03 // HASIL PEMBESARAN & LEMBAR DATA ]
        </span>
        <span className="text-[var(--text-ink)] font-semibold">
          {enhancedWidth} × {enhancedHeight} PX
        </span>
      </div>

      {/* Slider Perbandingan Memenuhi Lebar Layar */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onTouchMove={handleTouchMove}
        className="relative w-full aspect-[4/3] max-h-[380px] bg-[#0E0D0B] border border-[var(--border-line)] overflow-hidden select-none touch-none cursor-ew-resize rounded-[3px]"
      >
        {/* Layer Sesudah (SuperPixel) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={enhancedUrl}
            alt="Sesudah"
            className="w-full h-full object-contain pointer-events-none"
          />
        </div>

        {/* Layer Sebelum (Original) dengan Clip Path */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
        >
          <img
            src={originalUrl}
            alt="Sebelum"
            className="w-full h-full object-contain pointer-events-none"
            style={{ imageRendering: 'pixelated' }}
          />
        </div>

        {/* Garis Pemisah 1 px & Pegangan Loupe Presisi */}
        <div
          className="absolute top-0 bottom-0 w-[1px] bg-white z-20 pointer-events-none shadow-[0_0_8px_rgba(0,0,0,0.8)]"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Pegangan Retikel Kecil */}
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-8 bg-black/90 border border-white/80 flex items-center justify-center">
            <div className="w-0.5 h-4 bg-white/70"></div>
          </div>
        </div>

        {/* Label Sudut Monospace Sesuai Desain Fotografi */}
        <div className="absolute top-2 left-2 z-30 pointer-events-none">
          <span className="font-technical text-[10px] tracking-wider bg-black/80 text-white px-2 py-0.5 border border-white/20">
            SEBELUM ({originalWidth}×{originalHeight})
          </span>
        </div>

        <div className="absolute top-2 right-2 z-30 pointer-events-none">
          <span className="font-technical text-[10px] tracking-wider bg-black/80 text-white px-2 py-0.5 border border-white/20">
            SESUDAH ({enhancedWidth}×{enhancedHeight})
          </span>
        </div>
      </div>

      <p className="text-[11px] font-technical text-[var(--text-muted)] text-center">
        &larr; GESER RETIKEL UNTUK MEMERIKSA DETAIL EMULSI &rarr;
      </p>

      {/* Tabel Dua Kolom Ala Lembar Data Teknis Fotografer */}
      <div className="border border-[var(--border-line)] p-3.5 bg-[var(--surface-subtle)] font-technical text-xs flex flex-col gap-2 rounded-[4px]">
        <div className="text-[10px] font-semibold text-[var(--text-muted)] tracking-wider uppercase border-b border-[var(--border-line)] pb-1">
          CATATAN TEKNIS EKSPOR
        </div>

        <div className="flex flex-col gap-1.5 text-[11px]">
          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-1">
            <span className="text-[var(--text-muted)]">RESOLUSI ASLI (INPUT)</span>
            <span className="text-[var(--text-ink)] font-semibold">
              {originalWidth} × {originalHeight} px ({(
                (originalWidth * originalHeight) /
                1_000_000
              ).toFixed(2)} MP)
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-1">
            <span className="text-[var(--text-muted)]">RESOLUSI HASIL (OUTPUT)</span>
            <span className="text-[var(--text-ink)] font-semibold">
              {enhancedWidth} × {enhancedHeight} px ({(
                (enhancedWidth * enhancedHeight) /
                1_000_000
              ).toFixed(2)} MP)
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-1">
            <span className="text-[var(--text-muted)]">FAKTOR SKALA EFEKTIF</span>
            <span className="text-[var(--text-ink)] font-semibold">
              {effectiveScale.toFixed(2)}×
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-1">
            <span className="text-[var(--text-muted)]">DURASI PAPARAN</span>
            <span className="text-[var(--text-ink)] font-semibold">
              {(elapsedMs / 1000).toFixed(2)} detik ({totalTiles} petak)
            </span>
          </div>

          <div className="flex justify-between border-b border-[var(--border-line)] border-dotted pb-1">
            <span className="text-[var(--text-muted)]">METODE PEMROSESAN</span>
            <span className="text-[var(--text-ink)] font-semibold">
              {mode === 'ai' ? 'Model ESRGAN' : 'Resize Biasa (Bicubic + Unsharp Mask)'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-[var(--text-muted)]">ENGINE / AKSELERASI</span>
            <span className="text-[var(--text-ink)]">
              {executionProvider}
            </span>
          </div>
        </div>
      </div>

      {/* Pengaturan Format Unduhan (Kontrol Segmen Satu Baris) */}
      <div className="flex flex-col gap-2">
        <label className="font-technical text-[11px] tracking-wider text-[var(--text-muted)] uppercase">
          FORMAT DAN KUALITAS UNDUHAN
        </label>

        <div className="grid grid-cols-2 gap-2">
          {/* Format Segmen */}
          <div className="h-10 p-0.5 border border-[var(--border-line)] rounded-[4px] bg-[var(--surface-subtle)] flex items-center font-technical text-xs">
            <button
              type="button"
              onClick={() => onFormatChange('jpeg')}
              className={`flex-1 h-full rounded-[2px] transition-colors ${
                format === 'jpeg'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] font-bold border border-[var(--border-line)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              JPG (EFISIEN)
            </button>
            <button
              type="button"
              onClick={() => onFormatChange('png')}
              className={`flex-1 h-full rounded-[2px] transition-colors ${
                format === 'png'
                  ? 'bg-[var(--bg-paper)] text-[var(--text-ink)] font-bold border border-[var(--border-line)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
              }`}
            >
              PNG (LOSSLESS)
            </button>
          </div>

          {/* Kualitas JPG atau Label Lossless */}
          {format === 'jpeg' ? (
            <div className="h-10 px-2.5 border border-[var(--border-line)] rounded-[4px] bg-[var(--surface-subtle)] flex items-center justify-between font-technical text-xs">
              <span className="text-[var(--text-muted)]">KUALITAS:</span>
              <div className="flex items-center gap-1.5">
                {[85, 92, 98].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => onJpegQualityChange(q)}
                    className={`px-1.5 py-0.5 rounded-[2px] text-[11px] ${
                      jpegQuality === q
                        ? 'bg-[var(--text-ink)] text-[var(--bg-paper)] font-bold'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-ink)]'
                    }`}
                  >
                    {q}%
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-10 px-3 border border-[var(--border-line)] rounded-[4px] bg-[var(--surface-subtle)] flex items-center justify-between font-technical text-xs">
              <span className="text-[var(--text-muted)]">KOMPRESI:</span>
              <span className="font-semibold text-[var(--text-ink)]">LOSSLESS 100%</span>
            </div>
          )}
        </div>

        {estimatedSizeStr && (
          <span className="font-technical text-[11px] text-[var(--text-muted)]">
            PERKIRAAN UKURAN BERKAS: ~{estimatedSizeStr}
          </span>
        )}
      </div>
    </div>
  );
};
