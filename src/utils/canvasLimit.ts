/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SAFARI_SAFE_MAX_DIMENSION,
  SAFARI_IOS_MAX_CANVAS_PIXELS,
  MAX_4K_PIXELS,
} from '../constants/config';

export function isAppleOrSafariDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isApple =
    /iPad|iPhone|iPod|Macintosh/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari =
    /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Android/i.test(ua);
  return isApple || isSafari;
}

export interface DimensionCalculation {
  outputWidth: number;
  outputHeight: number;
  effectiveScale: number;
  isClamped: boolean;
  clampReason?: string;
  estimatedMemoryMb: number;
  totalPixels: number;
}

export function computeOutputDimensions(
  inputWidth: number,
  inputHeight: number,
  requestedScale: 2 | 4,
  limit4K: boolean
): DimensionCalculation {
  let targetW = Math.round(inputWidth * requestedScale);
  let targetH = Math.round(inputHeight * requestedScale);
  let isClamped = false;
  let clampReason: string | undefined;

  const isApple = isAppleOrSafariDevice();
  const maxDim = isApple ? SAFARI_SAFE_MAX_DIMENSION : 8192;
  const maxPixels = isApple ? SAFARI_IOS_MAX_CANVAS_PIXELS : 33554432; // 33.5 MP

  // 1. Batas 4K jika diaktifkan
  if (limit4K && targetW * targetH > MAX_4K_PIXELS) {
    const scaleFactor = Math.sqrt(MAX_4K_PIXELS / (targetW * targetH));
    targetW = Math.round(targetW * scaleFactor);
    targetH = Math.round(targetH * scaleFactor);
    isClamped = true;
    clampReason = 'Dibatasi resolusi 4K untuk efisiensi ekspor';
  }

  // 2. Batas dimensi tunggal
  if (targetW > maxDim || targetH > maxDim) {
    const dimRatio = Math.min(maxDim / targetW, maxDim / targetH);
    targetW = Math.round(targetW * dimRatio);
    targetH = Math.round(targetH * dimRatio);
    isClamped = true;
    clampReason = `Disesuaikan agar tidak melebihi ${maxDim}px (batas aman memori browser)`;
  }

  // 3. Batas total pixel
  if (targetW * targetH > maxPixels) {
    const pixelRatio = Math.sqrt(maxPixels / (targetW * targetH));
    targetW = Math.round(targetW * pixelRatio);
    targetH = Math.round(targetH * pixelRatio);
    isClamped = true;
    clampReason = 'Disesuaikan dengan batas alokasi memori kanvas perangkat';
  }

  // Pastikan genap untuk encoding gambar bersih
  targetW = targetW % 2 !== 0 ? targetW - 1 : targetW;
  targetH = targetH % 2 !== 0 ? targetH - 1 : targetH;

  const totalPixels = targetW * targetH;
  // Perkiraan memori: RGBA buffer 4 bytes + canvas context internal 4-8 bytes
  const estimatedMemoryMb = Math.round((totalPixels * 8) / (1024 * 1024));
  const effectiveScale = Number((targetW / inputWidth).toFixed(2));

  return {
    outputWidth: targetW,
    outputHeight: targetH,
    effectiveScale,
    isClamped,
    clampReason,
    estimatedMemoryMb,
    totalPixels,
  };
}
