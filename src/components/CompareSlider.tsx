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
  imageWidth?: number;
  imageHeight?: number;
}

export const CompareSlider: React.FC<CompareSliderProps> = ({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Asli',
  afterLabel = 'Terskala',
  imageWidth,
  imageHeight,
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragMode, setDragMode] = useState<'NONE' | 'SLIDER' | 'PAN'>('NONE');

  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialPos: number;
    initialPanX: number;
    initialPanY: number;
  }>({ clientX: 0, clientY: 0, initialPos: 50, initialPanX: 0, initialPanY: 0 });

  // Update slider position from client X
  const updateSliderFromClientX = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(clampedPct);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const sliderPx = (sliderPos / 100) * rect.width;
    const distToSlider = Math.abs(clickX - sliderPx);

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialPos: sliderPos,
      initialPanX: pan.x,
      initialPanY: pan.y,
    };

    // Jika dekat dengan garis slider (area sentuh 32px) atau saat zoom 1x: geser slider
    if (distToSlider <= 32 || zoom <= 1.05) {
      setDragMode('SLIDER');
      if (distToSlider > 32 && zoom <= 1.05) {
        updateSliderFromClientX(e.clientX);
      }
    } else {
      // Saat sedang zoom dan klik di luar garis slider: geser pan gambar untuk inspeksi detail
      setDragMode('PAN');
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (dragMode === 'NONE' || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();

    if (dragMode === 'SLIDER') {
      updateSliderFromClientX(e.clientX);
    } else if (dragMode === 'PAN') {
      const deltaX = e.clientX - dragStartRef.current.clientX;
      const deltaY = e.clientY - dragStartRef.current.clientY;

      const maxPanX = Math.max(0, (rect.width * (zoom - 1)) / 2);
      const maxPanY = Math.max(0, (rect.height * (zoom - 1)) / 2);

      const newPanX = Math.max(
        -maxPanX,
        Math.min(maxPanX, dragStartRef.current.initialPanX + deltaX)
      );
      const newPanY = Math.max(
        -maxPanY,
        Math.min(maxPanY, dragStartRef.current.initialPanY + deltaY)
      );

      setPan({ x: newPanX, y: newPanY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDragMode('NONE');
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (zoom > 1.05) {
      // Reset zoom
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      // Zoom ke 2x dengan titik fokus pada koordinat yang diklik
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const targetZoom = 2;
      const maxPanX = (rect.width * (targetZoom - 1)) / 2;
      const maxPanY = (rect.height * (targetZoom - 1)) / 2;

      const targetPanX = Math.max(
        -maxPanX,
        Math.min(maxPanX, (centerX - clickX) * (targetZoom - 1))
      );
      const targetPanY = Math.max(
        -maxPanY,
        Math.min(maxPanY, (centerY - clickY) * (targetZoom - 1))
      );

      setZoom(targetZoom);
      setPan({ x: targetPanX, y: targetPanY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -Math.sign(e.deltaY) * 0.25;
    const newZoom = Math.max(1, Math.min(3.5, Number((zoom + delta).toFixed(2))));

    if (newZoom <= 1.05) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    } else {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const maxPanX = Math.max(0, (rect.width * (newZoom - 1)) / 2);
      const maxPanY = Math.max(0, (rect.height * (newZoom - 1)) / 2);

      setZoom(newZoom);
      setPan((p) => ({
        x: Math.max(-maxPanX, Math.min(maxPanX, p.x)),
        y: Math.max(-maxPanY, Math.min(maxPanY, p.y)),
      }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 10 : 5;
    if (e.key === 'ArrowLeft') {
      setSliderPos((p) => Math.max(0, p - step));
    } else if (e.key === 'ArrowRight') {
      setSliderPos((p) => Math.min(100, p + step));
    } else if (e.key === 'Home') {
      setSliderPos(0);
    } else if (e.key === 'End') {
      setSliderPos(100);
    } else if (e.key === '+' || e.key === '=') {
      setZoom((z) => Math.min(3.5, Number((z + 0.5).toFixed(1))));
    } else if (e.key === '-' || e.key === '_') {
      setZoom((z) => {
        const nz = Math.max(1, Number((z - 0.5).toFixed(1)));
        if (nz === 1) setPan({ x: 0, y: 0 });
        return nz;
      });
    }
  };

  // Cegah scroll halaman peramban saat drag slider atau pan di layar sentuh
  useEffect(() => {
    const preventTouch = (e: TouchEvent) => {
      if (dragMode !== 'NONE') {
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
  }, [dragMode]);

  // Hitung aspek rasio agar container proporsional terhadap orientasi gambar
  const isPortrait = imageWidth && imageHeight ? imageHeight > imageWidth : false;
  const containerAspect =
    imageWidth && imageHeight
      ? Math.max(0.5, Math.min(1.8, imageWidth / imageHeight))
      : 4 / 3;

  return (
    <div className="w-full flex flex-col items-center gap-2.5 select-none">
      {/* Header Bar Kontrol Perbandingan & Zoom */}
      <div className="w-full flex items-center justify-between px-1 text-xs">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
          Perbandingan Sebelum / Sesudah
        </span>

        <div className="flex items-center gap-1.5">
          {/* Zoom Control Pill */}
          <div className="flex items-center gap-1 p-0.5 rounded-full neu-inset">
            <button
              type="button"
              disabled={zoom <= 1}
              onClick={() => {
                const nz = Math.max(1, Number((zoom - 0.5).toFixed(1)));
                setZoom(nz);
                if (nz === 1) setPan({ x: 0, y: 0 });
              }}
              title="Perkecil zoom"
              aria-label="Perkecil zoom"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:neu-raised cursor-pointer transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => {
                if (zoom <= 1.05) {
                  setZoom(2);
                } else {
                  setZoom(1);
                  setPan({ x: 0, y: 0 });
                }
              }}
              className="px-2.5 py-0.5 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-[10px] font-bold uppercase tracking-wider text-[var(--accent)] flex items-center gap-1 cursor-pointer transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
                {zoom <= 1.05 ? (
                  <>
                    <line x1="11" y1="8" x2="11" y2="14" />
                    <line x1="8" y1="11" x2="14" y2="11" />
                  </>
                ) : (
                  <line x1="8" y1="11" x2="14" y2="11" />
                )}
              </svg>
              <span>{zoom <= 1.05 ? 'Zoom 1:1 Detail' : `${zoom.toFixed(1)}×`}</span>
            </button>

            <button
              type="button"
              disabled={zoom >= 3.5}
              onClick={() => {
                const nz = Math.min(3.5, Number((zoom + 0.5).toFixed(1)));
                setZoom(nz);
              }}
              title="Perbesar zoom"
              aria-label="Perbesar zoom"
              className="w-6 h-6 rounded-full flex items-center justify-center text-[var(--text-primary)] disabled:opacity-30 disabled:cursor-not-allowed hover:neu-raised cursor-pointer transition-all"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {zoom > 1.05 && (
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="px-2.5 py-1 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Viewport Container */}
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
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        style={{
          aspectRatio: containerAspect,
          maxHeight: isPortrait ? '58vh' : '52vh',
          minHeight: '280px',
        }}
        className={`relative w-full mx-auto rounded-3xl neu-inset overflow-hidden touch-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] select-none bg-black/5 dark:bg-black/30 ${
          zoom > 1.05
            ? dragMode === 'PAN'
              ? 'cursor-grabbing'
              : 'cursor-grab'
            : 'cursor-ew-resize'
        }`}
      >
        {/* Layer B: Gambar Terskala (After) */}
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none">
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none select-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragMode === 'PAN' ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <img
              src={afterUrl}
              alt={afterLabel}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Layer A: Gambar Asli (Before) - Terpotong sempurna sesuai posisi slider */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none select-none z-10"
          style={{
            clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
            WebkitClipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)`,
          }}
        >
          <div
            className="w-full h-full flex items-center justify-center pointer-events-none select-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: dragMode === 'PAN' ? 'none' : 'transform 0.18s cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <img
              src={beforeUrl}
              alt={beforeLabel}
              draggable={false}
              className="w-full h-full object-contain pointer-events-none select-none"
            />
          </div>
        </div>

        {/* Pinned Label Kiri: Asli */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md pointer-events-none z-30 shadow-sm border border-white/10">
          {beforeLabel}
        </div>

        {/* Pinned Label Kanan: Terskala */}
        <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/60 text-white text-[10px] font-bold tracking-wider uppercase backdrop-blur-md pointer-events-none z-30 shadow-sm border border-white/10">
          {afterLabel}
        </div>

        {/* Floating Zoom Info Pill saat Zoom aktif */}
        {zoom > 1.05 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 text-white text-[10px] font-semibold tracking-wide backdrop-blur-md z-30 flex items-center gap-2 shadow-md border border-white/10">
            <span>Zoom: {zoom.toFixed(1)}×</span>
            <span className="opacity-40">|</span>
            <span className="text-white/80">Geser untuk navigasi</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 hover:bg-white/30 text-[9px] font-bold uppercase transition-all cursor-pointer"
            >
              Reset
            </button>
          </div>
        )}

        {/* Garis Pembatas Vertikal & Handle Slider */}
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-20 -translate-x-1/2 flex flex-col items-center justify-center"
          style={{ left: `${sliderPos}%` }}
        >
          {/* Garis vertikal kontras tinggi */}
          <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.7)]" />

          {/* Tombol lingkaran slider dengan ikon panah ganda */}
          <div className="absolute top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-[#2D2A26] shadow-xl flex items-center justify-center border-2 border-[var(--accent)] select-none">
            <svg
              className="w-4 h-4 text-[var(--accent)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="15 18 9 12 15 6" />
              <polyline points="9 18 3 12 9 6" />
            </svg>
            <svg
              className="w-4 h-4 -ml-2.5 text-[var(--accent)]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <polyline points="9 18 15 12 9 6" />
              <polyline points="15 18 21 12 15 6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Petunjuk Interaksi Bawah */}
      <div className="flex items-center justify-between w-full px-1 text-[10px] text-[var(--text-secondary)] font-medium">
        <span>
          {zoom > 1.05
            ? 'Geser garis handle ◀▶ untuk bandingkan · Geser gambar untuk navigasi detail'
            : 'Gunakan tombol panah ◀▶ pada keyboard atau geser slider'}
        </span>
        <span className="hidden sm:inline opacity-75">Klik 2× untuk zoom cepat</span>
      </div>
    </div>
  );
};
export default CompareSlider;
