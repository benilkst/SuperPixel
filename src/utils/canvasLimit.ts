/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  MAX_4K_WIDTH,
  MAX_4K_HEIGHT,
  SAFARI_IOS_MAX_CANVAS_PIXELS,
  SAFARI_SAFE_MAX_DIMENSION,
  MAX_EXTREME_DIMENSION,
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
  isExtremeResolution: boolean;
  warningMessage?: string;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
  estimatedSeconds: number;
}

/**
 * Menghitung resolusi output yang aman, batasan 4K, batasan Safari iOS,
 * serta mode resolusi ekstrem (bypass batas).
 */
export function calculateOutputDimensions(
  inputWidth: number,
  inputHeight: number,
  requestedScale: 2 | 4,
  limit4K: boolean,
  allowExtremeResolution: boolean = false,
  tileSize: number = 256,
  overlap: number = 24,
  isAIMode: boolean = true
): ScaleCalculation {
  let targetWidth = inputWidth * requestedScale;
  let targetHeight = inputHeight * requestedScale;
  let effectiveScale: number = requestedScale;
  let isCappedBy4K = false;

  // Batasi maksimal 4K jika diaktifkan DAN bukan mode resolusi ekstrem
  if (limit4K && !allowExtremeResolution) {
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
  } else if (allowExtremeResolution) {
    // Di Mode Ekstrem, batasi hanya pada batas mutlak WebKit 8192 px agar GPU tidak crash
    if (targetWidth > MAX_EXTREME_DIMENSION || targetHeight > MAX_EXTREME_DIMENSION) {
      const scaleW = MAX_EXTREME_DIMENSION / inputWidth;
      const scaleH = MAX_EXTREME_DIMENSION / inputHeight;
      effectiveScale = Math.min(requestedScale, Math.min(scaleW, scaleH));
      targetWidth = Math.round(inputWidth * effectiveScale);
      targetHeight = Math.round(inputHeight * effectiveScale);
    }
  }

  const totalPixels = targetWidth * targetHeight;
  const isExtremeResolution = allowExtremeResolution || totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS;
  const exceedsSafariLimit = !allowExtremeResolution && (
    totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS ||
    targetWidth > SAFARI_SAFE_MAX_DIMENSION ||
    targetHeight > SAFARI_SAFE_MAX_DIMENSION
  );

  let warningMessage: string | undefined;

  if (allowExtremeResolution && totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS) {
    warningMessage = `Mode Resolusi Ekstrem Aktif (${(totalPixels / 1_000_000).toFixed(1)} MP): Melampaui batas standar Safari. Mesin Ultra-HD Super-Res akan memproses petak dalam isolasi RAM hemat daya. Disarankan menutup aplikasi lain di iPhone.`;
  } else if (exceedsSafariLimit) {
    warningMessage = `Resolusi output (${targetWidth}×${targetHeight} = ${(
      totalPixels / 1_000_000
    ).toFixed(1)} MP) melampaui batas standar Safari iOS (~16.7 MP). Anda dapat mengaktifkan "Mode Resolusi Ekstrem" untuk tetap memprosesnya.`;
  } else if (
    targetWidth > SAFARI_SAFE_MAX_DIMENSION ||
    targetHeight > SAFARI_SAFE_MAX_DIMENSION
  ) {
    warningMessage = `Catatan: Dimensi (${targetWidth}×${targetHeight}) mendekati batas rendering hardware iPhone. Pemrosesan petak terisolasi akan mengamankan konsumsi memori.`;
  }

  // Hitung jumlah petak (tiles)
  const step = Math.max(16, tileSize - overlap);
  const tilesX = Math.max(1, Math.ceil((inputWidth - overlap) / step));
  const tilesY = Math.max(1, Math.ceil((inputHeight - overlap) / step));
  const totalTiles = tilesX * tilesY;

  // Estimasi waktu
  const msPerTile = isAIMode ? 180 : 15;
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
    isExtremeResolution,
    warningMessage,
    tilesX,
    tilesY,
    totalTiles,
    estimatedSeconds,
  };
}
