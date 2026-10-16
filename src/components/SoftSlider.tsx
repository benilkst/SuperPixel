/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';

interface SoftSliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  label: string;
  unit?: string;
  disabled?: boolean;
}

export const SoftSlider: React.FC<SoftSliderProps> = ({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
  unit = '%',
  disabled,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const percentage = Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100));

  const updateFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const rawPct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const rawVal = min + rawPct * (max - min);
      const steppedVal = Math.round(rawVal / step) * step;
      onChange(Math.min(max, Math.max(min, steppedVal)));
    },
    [min, max, step, onChange, disabled]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateFromClientX(e.clientX);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handlePointerMove = (e: PointerEvent) => {
      updateFromClientX(e.clientX);
    };

    const handlePointerUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, updateFromClientX]);

  return (
    <div className="w-full flex flex-col gap-2 p-3 rounded-2xl neu-raised select-none">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold text-[var(--text-primary)]">{label}</span>
        <span className="font-tabular font-bold text-[var(--accent)] text-sm">
          {value}
          {unit}
        </span>
      </div>

      {/* Trek Inset dengan Isian Teal dan Gelembung Nilai */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        className="relative w-full h-4 rounded-full neu-inset cursor-pointer flex items-center touch-none mt-4 mb-2"
      >
        {/* Isian Teal */}
        <div
          className="h-full bg-[var(--accent)] rounded-full transition-all duration-75"
          style={{ width: `${percentage}%` }}
        />

        {/* Pegangan Raised dengan Gelembung Nilai di Atasnya */}
        <div
          className="absolute -translate-x-1/2 flex items-center justify-center pointer-events-none"
          style={{ left: `${percentage}%` }}
        >
          {/* Gelembung Nilai Terapung */}
          <div className="absolute -top-7 px-2 py-0.5 rounded-md neu-raised text-[11px] font-bold font-tabular text-[var(--accent)] whitespace-nowrap border border-[var(--border-subtle)] shadow-xs">
            {value}
            {unit}
          </div>

          {/* Thumb Bulat Bergaya Raised */}
          <div
            className={`w-6 h-6 rounded-full neu-raised border border-[var(--accent)]/40 transition-transform ${
              isDragging ? 'scale-115 ring-2 ring-[var(--accent)]/40' : ''
            }`}
          />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-[var(--text-secondary)] font-medium">
        <span>Kecil ({min}{unit})</span>
        <span>Seimbang</span>
        <span>Maksimal ({max}{unit})</span>
      </div>
    </div>
  );
};
