/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

interface StateProcessProps {
  previewUrl: string;
  currentTile: number;
  totalTiles: number;
  tilesX: number;
  tilesY: number;
  percentage: number;
  statusText: string;
  phase: string;
  elapsedSeconds: number;
  estimatedTotalSeconds: number;
  onRequestCancel: () => void;
}

export const StateProcess: React.FC<StateProcessProps> = ({
  previewUrl,
  currentTile,
  totalTiles,
  tilesX,
  tilesY,
  percentage,
  statusText,
  phase,
  elapsedSeconds,
  estimatedTotalSeconds,
  onRequestCancel,
}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // Gambar peta tile ke canvas ringan dengan batching super cepat
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const sx = Math.max(1, tilesX);
    const sy = Math.max(1, tilesY);
    const cellW = w / sx;
    const cellH = h / sy;

    // 1. Gambar latar belakang petak belum diproses
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, 0, w, h);

    // 2. Gambar petak yang sudah selesai (batching cepat)
    ctx.fillStyle = 'rgba(14, 92, 94, 0.4)';
    let idx = 1;
    for (let r = 0; r < sy; r++) {
      for (let c = 0; c < sx; c++) {
        if (idx < currentTile) {
          ctx.fillRect(c * cellW + 0.5, r * cellH + 0.5, cellW - 1, cellH - 1);
        } else if (idx === currentTile) {
          // Petak aktif saat ini (teal pekat dengan bingkai putih)
          ctx.save();
          ctx.fillStyle = 'rgba(14, 92, 94, 0.95)';
          ctx.fillRect(c * cellW + 0.5, r * cellH + 0.5, cellW - 1, cellH - 1);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.strokeRect(c * cellW + 1, r * cellH + 1, cellW - 2, cellH - 2);
          ctx.restore();
        }
        idx++;
      }
    }

    // 3. Garis grid ringan (single path)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let c = 1; c < sx; c++) {
      const x = Math.round(c * cellW);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
    }
    for (let r = 1; r < sy; r++) {
      const y = Math.round(r * cellH);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }, [currentTile, tilesX, tilesY]);

  const isModelLoading = phase === 'loading_model';
  const remainingSeconds = Math.max(
    0,
    Math.round(estimatedTotalSeconds - elapsedSeconds)
  );

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Pratinjau Gambar dalam Panel Inset dengan Peta Tile di Atasnya */}
      <div className="relative w-full aspect-[4/3] max-h-[300px] p-2 rounded-3xl neu-inset overflow-hidden flex items-center justify-center">
        {/* Gambar Sumber */}
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Pratinjau Proses"
            className="w-full h-full object-contain rounded-2xl opacity-60"
          />
        ) : (
          <div className="w-full h-full rounded-2xl bg-black/5" />
        )}

        {/* Peta Tile (Canvas Ringan & Cepat Tanpa Beban DOM) */}
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          className="absolute inset-2 w-[calc(100%-1rem)] h-[calc(100%-1rem)] object-contain pointer-events-none rounded-2xl"
        />

        {/* Floating Tile Counter Badge di Sudut Bawah */}
        <div className="absolute bottom-4 left-4 right-4 p-2.5 rounded-2xl neu-raised flex items-center justify-between text-xs font-semibold backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent)] animate-pulse shrink-0"></span>
            <span className="text-[var(--text-primary)] font-tabular">
              Tile {currentTile} dari {totalTiles}
            </span>
          </div>

          <span className="font-bold text-[var(--accent)] font-tabular text-sm">
            {percentage}%
          </span>
        </div>
      </div>

      {/* Keadaan Skeleton Rows saat Model Sedang Dimuat */}
      {isModelLoading ? (
        <div className="w-full p-4 rounded-3xl neu-raised flex flex-col gap-3 animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-full bg-[var(--accent)]/30 animate-spin"></div>
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Menyiapkan Model ONNX (WebGPU/WASM)...
            </span>
          </div>
          <div className="h-3 w-3/4 rounded-full neu-inset"></div>
          <div className="h-3 w-1/2 rounded-full neu-inset"></div>
        </div>
      ) : (
        /* Progress Linear Neumorphic */
        <div className="w-full p-4 rounded-3xl neu-raised flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-[var(--text-primary)]">
              {statusText}
            </span>
            <span className="text-[var(--text-secondary)] font-tabular text-[11px]">
              Sisa: ~{remainingSeconds} detik
            </span>
          </div>

          {/* Trek Inset dengan Isian Teal */}
          <div className="w-full h-3 rounded-full neu-inset overflow-hidden p-0.5">
            <div
              className="h-full bg-[var(--accent)] rounded-full transition-all duration-200 ease-out"
              style={{ width: `${Math.min(100, Math.max(3, percentage))}%` }}
            />
          </div>

          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] font-medium pt-1 font-tabular">
            <span>Berjalan: {elapsedSeconds.toFixed(1)}s</span>
            <span>Memori per petak: 128 px</span>
          </div>
        </div>
      )}

      {/* Tombol Batal Sekunder */}
      <button
        type="button"
        onClick={onRequestCancel}
        className="w-full h-11 rounded-full neu-btn-secondary text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--error)] transition-colors cursor-pointer"
      >
        Batalkan Pemrosesan
      </button>
    </div>
  );
};
