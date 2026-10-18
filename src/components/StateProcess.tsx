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
  elapsedSeconds: number;
  onCancel: () => void;
}

export const StateProcess: React.FC<StateProcessProps> = ({
  previewUrl,
  currentTile,
  totalTiles,
  tilesX,
  tilesY,
  percentage,
  statusText,
  elapsedSeconds,
  onCancel,
}) => {
  const activeTileIndex = Math.max(0, currentTile - 1);
  const activeTileX = tilesX > 0 ? activeTileIndex % tilesX : 0;
  const activeTileY = tilesX > 0 ? Math.floor(activeTileIndex / tilesX) : 0;

  const tilePctW = tilesX > 0 ? 100 / tilesX : 100;
  const tilePctH = tilesY > 0 ? 100 / tilesY : 100;

  const leftPct = activeTileX * tilePctW;
  const topPct = activeTileY * tilePctH;

  const remainingSeconds =
    percentage > 0
      ? Math.max(0, Math.round((elapsedSeconds / percentage) * (100 - percentage)))
      : null;

  return (
    <div className="w-full flex flex-col gap-4">
      {/* 1. Preview Kanvas dengan Sorotan Petak Berjalan */}
      <div className="w-full p-3 rounded-3xl neu-inset flex flex-col items-center">
        <div className="relative w-full aspect-[4/3] max-h-[300px] rounded-2xl overflow-hidden bg-black/10 flex items-center justify-center">
          <img
            src={previewUrl}
            alt="Proses"
            className="w-full h-full object-contain pointer-events-none filter brightness-95"
          />

          {/* Grid Overlay Subtil */}
          <div
            className="absolute inset-0 pointer-events-none grid opacity-25"
            style={{
              gridTemplateColumns: `repeat(${tilesX}, 1fr)`,
              gridTemplateRows: `repeat(${tilesY}, 1fr)`,
            }}
          >
            {Array.from({ length: totalTiles }).map((_, i) => (
              <div
                key={i}
                className="border-[0.5px] border-white/60"
              />
            ))}
          </div>

          {/* Petak Aktif yang Sedang Diproses */}
          {totalTiles > 0 && currentTile > 0 && currentTile <= totalTiles && (
            <div
              className="absolute border-2 border-[var(--accent)] bg-[var(--accent)]/30 transition-all duration-75 shadow-lg"
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${tilePctW}%`,
                height: `${tilePctH}%`,
              }}
            />
          )}

          {/* Badge Petak */}
          <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full neu-raised text-[10px] font-bold font-tabular text-[var(--text-primary)] bg-[var(--base)]/90 backdrop-blur-sm">
            Tile {currentTile} dari {totalTiles}
          </div>

          {/* Badge Persentase */}
          <div className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full neu-raised text-[10px] font-bold font-tabular text-[var(--accent)] bg-[var(--base)]/90 backdrop-blur-sm">
            {percentage}%
          </div>
        </div>
      </div>

      {/* 2. Kartu Status Kemajuan & Estimasi */}
      <div className="w-full p-4 rounded-3xl neu-raised flex flex-col gap-3">
        <div className="flex justify-between items-center text-xs">
          <span className="font-bold text-[var(--text-primary)] truncate pr-2">
            {statusText}
          </span>
          {remainingSeconds !== null && (
            <span className="text-[11px] font-medium text-[var(--text-secondary)] shrink-0 font-tabular">
              Sisa: ~{remainingSeconds} detik
            </span>
          )}
        </div>

        {/* Bilah Kemajuan Neumorphic Inset */}
        <div className="w-full h-3 rounded-full neu-inset overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-150 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Metrik Waktu Berjalan */}
        <div className="flex justify-between items-center text-[10px] text-[var(--text-secondary)] font-tabular pt-1">
          <span>Berjalan: {elapsedSeconds.toFixed(1)}s</span>
          <span>Resolusi petak: 256 px</span>
        </div>
      </div>

      {/* 3. Tombol Batalkan Pemrosesan */}
      <button
        type="button"
        onClick={onCancel}
        className="w-full h-11 rounded-full neu-btn-secondary text-xs font-bold uppercase tracking-wider text-[var(--error)] cursor-pointer"
      >
        Batalkan Pemrosesan
      </button>
    </div>
  );
};
