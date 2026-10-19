/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';

interface CompareSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Asli',
  afterLabel = 'Terskala',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(clampedPct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      updatePosition(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      setSliderPos((p) => Math.max(0, p - 5));
    } else if (e.key === 'ArrowRight') {
      setSliderPos((p) => Math.min(100, p + 5));
    } else if (e.key === 'Home') {
      setSliderPos(0);
    } else if (e.key === 'End') {
      setSliderPos(100);
    }
  };

  // Prevent scroll during drag on mobile touch
  useEffect(() => {
    const preventTouch = (e: TouchEvent) => {
      if (isDragging) {
        e.preventDefault();
      }
    };
    const node = containerRef.current;
    if (node) {
      node.addEventListener('touchmove', preventTouch, { passive: false });
    }
    return () => {
      if (node) {
        node.removeEventListener('touchmove', preventTouch);
      }
    };
  }, [isDragging]);

  return (
    <div className="w-full flex flex-col items-center gap-2 select-none">
      <div className="w-full flex items-center justify-between px-1 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Perbandingan Sebelum / Sesudah
        </span>
        <button
          type="button"
          onClick={() => setIsZoomed((z) => !z)}
          className="px-2.5 py-1 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1 cursor-pointer transition-all"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1={isZoomed ? '8' : '11'} y1="11" x2={isZoomed ? '14' : '11'} y2="11" />
            {!isZoomed && <line x1="11" y1="8" x2="11" y2="14" />}
          </svg>
          {isZoomed ? 'Reset Zoom' : 'Zoom 1:1 Detail'}
        </button>
      </div>

      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-label="Slider perbandingan gambar sebelum dan sesudah"
        aria-valuenow={Math.round(sliderPos)}
        aria-valuemin={0}
        aria-valuemax={100}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-full aspect-[4/3] sm:aspect-[16/10] max-h-[60vh] rounded-2xl neu-inset overflow-hidden cursor-ew-resize touch-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] ${
          isZoomed ? 'overflow-auto cursor-grab' : ''
        }`}
      >
        {/* Layer B: After Image (Full width background) */}
        <div
          className={`absolute inset-0 w-full h-full flex items-center justify-center bg-black/5 ${
            isZoomed ? 'scale-150 origin-center transition-transform duration-200' : ''
          }`}
        >
          <img
            src={afterUrl}
            alt={afterLabel}
            className="w-full h-full object-contain pointer-events-none select-none"
          />
          <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm pointer-events-none z-10">
            {afterLabel}
          </div>
        </div>

        {/* Layer A: Before Image (Clipped by slider position) */}
        <div
          className={`absolute inset-0 h-full overflow-hidden flex items-center justify-center bg-black/5 ${
            isZoomed ? 'scale-150 origin-center transition-transform duration-200' : ''
          }`}
          style={{ width: `${sliderPos}%` }}
        >
          <div
            className="absolute top-0 left-0 h-full flex items-center justify-center pointer-events-none"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
            }}
          >
            <img
              src={beforeUrl}
              alt={beforeLabel}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
          <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-sm pointer-events-none z-10">
            {beforeLabel}
          </div>
        </div>

        {/* Divider Bar & Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(0,0,0,0.5)] z-20 pointer-events-none -translate-x-1/2"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-8 h-8 rounded-full bg-white text-[#2D2A26] shadow-lg flex items-center justify-center border-2 border-[var(--accent)] pointer-events-none">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" />
            </svg>
            <svg className="w-4 h-4 -ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6" />
              <polyline points="15 18 21 12 15 6" />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-medium">
        <span>Gunakan tombol panah ◀ ▶ pada keyboard atau geser slider</span>
      </div>
    </div>
  );
};
