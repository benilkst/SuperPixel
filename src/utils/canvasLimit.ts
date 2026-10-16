/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MAX_4K_WIDTH,
  MAX_4K_HEIGHT,
  SAFARI_IOS_MAX_CANVAS_PIXELS,
  SAFARI_SAFE_MAX_DIMENSION,
} from '../constants/config';

export interface ScaleCalculation {
  inputWidth: number;
  inputHeight: number;
  requestedScale: number;
  effectiveScale: number;
  outputWidth: number;
  outputHeight: number;
  totalPixels: number;
  isCappedBy4K: boolean;
  exceedsSafariLimit: boolean;
  warningMessage?: string;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
  estimatedSeconds: number;
}

/**
 * Menghitung resolusi output yang aman, batasan 4K, batasan Safari iOS,
 * serta jumlah petak pemrosesan.
 */
export function calculateOutputDimensions(
  inputWidth: number,
  inputHeight: number,
  requestedScale: 2 | 4,
  limit4K: boolean,
  tileSize: number = 128,
  overlap: number = 16,
  isAIMode: boolean = true
): ScaleCalculation {
  let targetWidth = inputWidth * requestedScale;
  let targetHeight = inputHeight * requestedScale;
  let effectiveScale: number = requestedScale;
  let isCappedBy4K = false;

  // Batasi maksimal 4K jika diaktifkan (3840x2160 untuk landscape, 2160x3840 untuk portrait)
  if (limit4K) {
    const isLandscape = inputWidth >= inputHeight;
    const maxBoundW = isLandscape ? MAX_4K_WIDTH : MAX_4K_HEIGHT;
    const maxBoundH = isLandscape ? MAX_4K_HEIGHT : MAX_4K_WIDTH;

    if (targetWidth > maxBoundW || targetHeight > maxBoundH) {
      isCappedBy4K = true;
      const scaleW = maxBoundW / inputWidth;
      const scaleH = maxBoundH / inputHeight;
      effectiveScale = Math.min(requestedScale, Math.min(scaleW, scaleH));

      // Bulatkan ke bilangan bulat terdekat untuk pixel dimensions
      targetWidth = Math.round(inputWidth * effectiveScale);
      targetHeight = Math.round(inputHeight * effectiveScale);
    }
  }

  const totalPixels = targetWidth * targetHeight;
  const exceedsSafariLimit =
    totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS ||
    targetWidth > 8192 ||
    targetHeight > 8192;

  let warningMessage: string | undefined;

  if (exceedsSafariLimit) {
    warningMessage = `Peringatan: Resolusi output (${targetWidth}×${targetHeight} = ${(
      totalPixels / 1_000_000
    ).toFixed(1)} MP) melebihi batas canvas Safari iOS (~16.7 MP). Safari pada iPhone SE dapat menutup tab (out of memory). Disarankan mengaktifkan "Batasi 4K" atau memilih skala 2x.`;
  } else if (
    targetWidth > SAFARI_SAFE_MAX_DIMENSION ||
    targetHeight > SAFARI_SAFE_MAX_DIMENSION
  ) {
    warningMessage = `Catatan: Dimensi (${targetWidth}×${targetHeight}) mendekati batas rendering hardware iPhone SE (4096 px). Pemrosesan petak (tiling) akan mengamankan konsumsi memori.`;
  }

  // Hitung jumlah petak (tiles)
  const step = Math.max(16, tileSize - overlap);
  const tilesX = Math.max(1, Math.ceil((inputWidth - overlap) / step));
  const tilesY = Math.max(1, Math.ceil((inputHeight - overlap) / step));
  const totalTiles = tilesX * tilesY;

  // Estimasi waktu: Mode AI rata-rata ~80-150ms per petak di WebGPU, ~200-350ms di WASM
  // Mode Algoritmik/Lanczos rata-rata ~10-25ms per petak
  const msPerTile = isAIMode ? 220 : 18;
  const estimatedSeconds = Math.max(1, Math.round((totalTiles * msPerTile) / 1000));

  return {
    inputWidth,
    inputHeight,
    requestedScale,
    effectiveScale,
    outputWidth: targetWidth,
    outputHeight: targetHeight,
    totalPixels,
    isCappedBy4K,
    exceedsSafariLimit,
    warningMessage,
    tilesX,
    tilesY,
    totalTiles,
    estimatedSeconds,
  };
}
