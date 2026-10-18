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
  inputMegapixels: number;
  requestedScale: number;
  effectiveScale: number;
  outputWidth: number;
  outputHeight: number;
  totalPixels: number;
  outputMegapixels: number;
  estimatedRamMB: number;
  estimatedJpgSizeMB: number;
  estimatedPngSizeMB: number;
  isCappedBy4K: boolean;
  exceedsSafariLimit: boolean;
  isExtremeResolution: boolean;
  isInputHuge: boolean;
  inputWarning?: string;
  warningMessage?: string;
  tilesX: number;
  tilesY: number;
  totalTiles: number;
  estimatedSeconds: number;
}

/**
 * Menghitung resolusi output yang aman, batasan 4K, batasan Safari iOS,
 * estimasi ukuran memori canvas, serta mode resolusi ekstrem (bypass batas).
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

  const inputPixels = inputWidth * inputHeight;
  const inputMegapixels = Number((inputPixels / 1_000_000).toFixed(1));
  const isInputHuge = inputPixels > SAFARI_IOS_MAX_CANVAS_PIXELS || inputWidth > 4096 || inputHeight > 4096;
  let inputWarning: string | undefined;

  if (isInputHuge) {
    inputWarning = `Foto input beresolusi sangat besar (${inputWidth}×${inputHeight} = ${inputMegapixels} MP). Direkomendasikan membiarkan opsi "Batasi 4K" aktif agar memori canvas tetap stabil di Safari iOS.`;
  }

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
  const outputMegapixels = Number((totalPixels / 1_000_000).toFixed(1));
  const estimatedRamMB = Number(((totalPixels * 4) / (1024 * 1024)).toFixed(1));
  const estimatedJpgSizeMB = Number(((totalPixels * 4 * 0.18 * 0.92) / (1024 * 1024)).toFixed(1));
  const estimatedPngSizeMB = Number(((totalPixels * 4 * 0.45) / (1024 * 1024)).toFixed(1));

  const isExtremeResolution = allowExtremeResolution || totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS;
  const exceedsSafariLimit = !allowExtremeResolution && (
    totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS ||
    targetWidth > SAFARI_SAFE_MAX_DIMENSION ||
    targetHeight > SAFARI_SAFE_MAX_DIMENSION
  );

  let warningMessage: string | undefined;

  if (allowExtremeResolution && totalPixels > SAFARI_IOS_MAX_CANVAS_PIXELS) {
    warningMessage = `Mode Resolusi Ekstrem Aktif (${outputMegapixels} MP): Melampaui batas standar Safari. Mesin Ultra-HD Super-Res akan memproses petak dalam isolasi RAM hemat daya (~${estimatedRamMB} MB buffer). Disarankan menutup aplikasi lain di iPhone.`;
  } else if (exceedsSafariLimit) {
    warningMessage = `Resolusi output (${targetWidth}×${targetHeight} = ${outputMegapixels} MP) melampaui batas standar Safari iOS (~16.7 MP). Anda dapat mengaktifkan "Mode Resolusi Ekstrem" untuk tetap memprosesnya.`;
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
    inputMegapixels,
    requestedScale,
    effectiveScale,
    outputWidth: targetWidth,
    outputHeight: targetHeight,
    totalPixels,
    outputMegapixels,
    estimatedRamMB,
    estimatedJpgSizeMB,
    estimatedPngSizeMB,
    isCappedBy4K,
    exceedsSafariLimit,
    isExtremeResolution,
    isInputHuge,
    inputWarning,
    warningMessage,
    tilesX,
    tilesY,
    totalTiles,
    estimatedSeconds,
  };
}
