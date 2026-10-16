/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';

interface DarkroomProcessingProps {
  previewUrl: string;
  currentTile: number;
  totalTiles: number;
  tilesX: number;
  tilesY: number;
  percentage: number;
  statusText: string;
  phase: string;
  elapsedSeconds: number;
}

export const DarkroomProcessing: React.FC<DarkroomProcessingProps> = ({
  previewUrl,
  currentTile,
  totalTiles,
  tilesX,
  tilesY,
  percentage,
  statusText,
  phase,
  elapsedSeconds,
}) => {
  // Buat array grid petak untuk dirender di atas gambar
  const gridCells = useMemo(() => {
    const cells = [];
    const safeTilesX = Math.max(1, tilesX);
    const safeTilesY = Math.max(1, tilesY);
    const total = safeTilesX * safeTilesY;

    for (let i = 1; i <= total; i++) {
      const isDone = i < currentTile;
      const isActive = i === currentTile;
      cells.push({ index: i, isDone, isActive });
    }
    return cells;
  }, [tilesX, tilesY, currentTile]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* Label Kamar Gelap */}
      <div className="flex items-center justify-between font-technical text-xs text-[var(--text-muted)] border-b border-[var(--border-line)] pb-1.5">
        <span className="tracking-wider uppercase">
          [ 02 // PROSES PAPARAN KAMAR GELAP ]
        </span>
        <span className="text-[var(--accent-safelight)] font-medium">
          ● SAFELIGHT AKTIF
        </span>
      </div>

      {/* Pratinjau Citra dengan Peta Tile Overlay */}
      <div className="relative w-full aspect-[4/3] max-h-[320px] bg-[#0E0D0B] border border-[var(--border-line)] overflow-hidden rounded-[3px]">
        {/* Gambar Sumber */}
        <img
          src={previewUrl}
          alt="Pratinjau Proses"
          className="w-full h-full object-contain opacity-65"
        />

        {/* Peta Tile (Tile Grid) di Atas Gambar */}
        <div
          className="absolute inset-0 grid pointer-events-none"
          style={{
            gridTemplateColumns: `repeat(${Math.max(1, tilesX)}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${Math.max(1, tilesY)}, minmax(0, 1fr))`,
          }}
        >
          {gridCells.map((cell) => (
            <div
              key={cell.index}
              className={`border border-white/10 transition-colors duration-150 ${
                cell.isActive
                  ? 'bg-[#D9411E]/70 border-[#D9411E] ring-1 ring-[#D9411E]'
                  : cell.isDone
                  ? 'bg-[#D9411E]/20 border-white/5'
                  : 'bg-black/40'
              }`}
            />
          ))}
        </div>

        {/* Notasi Progres Terbaca Langsung dari Citra */}
        <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between bg-black/85 backdrop-blur-xs p-2.5 border border-white/15 text-white font-technical">
          <div className="flex flex-col">
            <span className="text-[10px] text-zinc-400 tracking-wider">
              KEMAJUAN PAPARAN PETAK
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="font-serif-display text-2xl font-bold text-white tracking-tight">
                {currentTile}
              </span>
              <span className="text-sm text-zinc-400">/ {totalTiles}</span>
              <span className="text-xs text-[#D9411E] font-bold ml-1">
                ({percentage}%)
              </span>
            </div>
          </div>

          <div className="text-right text-[11px] text-zinc-300 flex flex-col items-end">
            <span>DURASI: {elapsedSeconds.toFixed(1)}s</span>
            <span className="text-[10px] text-zinc-400 truncate max-w-[150px]">
              {statusText}
            </span>
          </div>
        </div>
      </div>

      {/* Lembar Catatan Teknis Selama Pemrosesan */}
      <div className="p-3 border border-[var(--border-line)] bg-[var(--surface-subtle)] font-technical text-xs flex flex-col gap-1.5 rounded-[4px]">
        <div className="flex justify-between text-[11px] text-[var(--text-muted)] border-b border-[var(--border-line)] border-dotted pb-1">
          <span>ALOKASI PETAK</span>
          <span className="text-[var(--text-ink)] font-semibold">
            128 × 128 px (Overlap 16 px)
          </span>
        </div>
        <div className="flex justify-between text-[11px] text-[var(--text-muted)]">
          <span>MANAJEMEN MEMORI</span>
          <span className="text-[var(--text-ink)]">
            Tensor & canvas sementara dinolkan per petak
          </span>
        </div>
      </div>
    </div>
  );
};
