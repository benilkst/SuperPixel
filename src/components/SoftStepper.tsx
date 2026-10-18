/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export type StepNumber = 1 | 2 | 3 | 4;

interface SoftStepperProps {
  currentStep: StepNumber;
}

export const SoftStepper: React.FC<SoftStepperProps> = ({ currentStep }) => {
  const steps = [
    { num: 1, label: 'PILIH' },
    { num: 2, label: 'ATUR' },
    { num: 3, label: 'PROSES' },
    { num: 4, label: 'UNDUH' },
  ];

  return (
    <div className="w-full flex flex-col items-center gap-2 py-1 select-none">
      <div className="w-full flex items-center justify-between relative px-2">
        <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-1.5 neu-inset rounded-full z-0 overflow-hidden">
          <div
            className="h-full bg-[var(--accent)] transition-all duration-300 ease-out"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />
        </div>

        {steps.map((s) => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;

          return (
            <div key={s.num} className="flex flex-col items-center gap-1.5 z-10">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  isCurrent
                    ? 'neu-raised text-[var(--accent)] scale-110'
                    : isDone
                    ? 'neu-btn-primary text-white'
                    : 'neu-inset text-[var(--text-secondary)] opacity-80'
                }`}
              >
                {isDone ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  s.num
                )}
              </div>
              <span
                className={`text-[9px] font-bold tracking-wider uppercase transition-colors ${
                  isCurrent
                    ? 'text-[var(--text-primary)] font-extrabold'
                    : isDone
                    ? 'text-[var(--accent)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
