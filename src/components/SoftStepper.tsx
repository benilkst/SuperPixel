/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type StepNumber = 1 | 2 | 3 | 4;

interface SoftStepperProps {
  currentStep: StepNumber;
}

const STEPS = [
  { id: 1, label: 'Pilih', tooltip: 'Pilih Berkas' },
  { id: 2, label: 'Atur', tooltip: 'Atur Skala & Format' },
  { id: 3, label: 'Proses', tooltip: 'Pemrosesan Petak' },
  { id: 4, label: 'Unduh', tooltip: 'Hasil & Simpan' },
] as const;

export const SoftStepper: React.FC<SoftStepperProps> = ({ currentStep }) => {
  return (
    <div className="w-full px-2 py-2">
      <div className="relative flex items-center justify-between">
        {/* Garis Penghubung Inset */}
        <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1.5 neu-inset rounded-full pointer-events-none">
          <div
            className="h-full bg-[var(--accent)] rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep - 1) / (STEPS.length - 1)) * 100}%`,
            }}
          />
        </div>

        {STEPS.map((step) => {
          const isDone = currentStep > step.id;
          const isActive = currentStep === step.id;

          return (
            <div
              key={step.id}
              className="relative z-10 flex flex-col items-center group"
            >
              {/* Lingkaran Stepper Neumorphic */}
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all duration-200 ${
                  isActive
                    ? 'neu-raised bg-[var(--accent)] text-[var(--accent-text)] scale-110 ring-2 ring-[var(--accent)]/30'
                    : isDone
                    ? 'neu-raised bg-[var(--bg-base)] text-[var(--accent)] border border-[var(--accent)]/40'
                    : 'neu-inset text-[var(--text-secondary)] opacity-80'
                }`}
              >
                {isDone ? (
                  <svg
                    className="w-3.5 h-3.5 stroke-[2.5]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <span>{step.id}</span>
                )}
              </div>

              {/* Label Langkah */}
              <span
                className={`text-[10px] font-semibold tracking-wider uppercase mt-1 transition-colors ${
                  isActive
                    ? 'text-[var(--accent)] font-bold'
                    : isDone
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {step.label}
              </span>

              {/* Tooltip Langkah Aktif */}
              {isActive && (
                <div className="absolute -top-7 px-2 py-0.5 rounded-md neu-raised text-[10px] font-medium text-[var(--text-primary)] whitespace-nowrap pointer-events-none shadow-xs border border-[var(--border-subtle)]">
                  {step.tooltip}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
