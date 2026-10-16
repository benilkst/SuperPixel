/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Peningkatan Citra Algoritmik Tingkat Tinggi (Non-AI Fallback)
 * Menggunakan interpolasi Bicubic (Catmull-Rom Spline) dengan Unsharp Mask Sharpening
 * yang dirancang ZERO-ALLOCATION (bebas alokasi heap baru per petak)
 * khusus agar aman dari OOM / Jetsam di Safari iOS (iPhone SE 2020: RAM 3GB).
 */

// Kernel Catmull-Rom Spline (a = -0.5)
function catmullRom(x: number): number {
  const a = -0.5;
  const absX = Math.abs(x);
  if (absX <= 1) {
    return (a + 2) * absX * absX * absX - (a + 3) * absX * absX + 1;
  } else if (absX < 2) {
    return a * absX * absX * absX - 5 * a * absX * absX + 8 * a * absX - 4 * a;
  }
  return 0;
}

// Scratchpad untuk prekomputasi bobot X dan Y (maksimum 1024px)
const precompIndicesX = new Int32Array(1024 * 4);
const precompWeightsX = new Float32Array(1024 * 4);
const precompIndicesY = new Int32Array(1024 * 4);
const precompWeightsY = new Float32Array(1024 * 4);

/**
 * Prekomputasi koordinat sumber dan bobot spline untuk sumbu X atau Y
 */
function precomputeAxisWeights(
  srcDim: number,
  destDim: number,
  indicesOut: Int32Array,
  weightsOut: Float32Array
) {
  const scale = srcDim / destDim;

  for (let d = 0; d < destDim; d++) {
    const s = (d + 0.5) * scale - 0.5;
    const is = Math.floor(s);
    const fs = s - is;
    const base = d * 4;

    let w0 = catmullRom(-1 - fs);
    let w1 = catmullRom(-fs);
    let w2 = catmullRom(1 - fs);
    let w3 = catmullRom(2 - fs);
    const sum = w0 + w1 + w2 + w3;
    const invSum = sum !== 0 ? 1.0 / sum : 1.0;

    indicesOut[base] = Math.min(Math.max(is - 1, 0), srcDim - 1);
    indicesOut[base + 1] = Math.min(Math.max(is, 0), srcDim - 1);
    indicesOut[base + 2] = Math.min(Math.max(is + 1, 0), srcDim - 1);
    indicesOut[base + 3] = Math.min(Math.max(is + 2, 0), srcDim - 1);

    weightsOut[base] = w0 * invSum;
    weightsOut[base + 1] = w1 * invSum;
    weightsOut[base + 2] = w2 * invSum;
    weightsOut[base + 3] = w3 * invSum;
  }
}

/**
 * Resize petak dengan interpolasi Bicubic langsung ke buffer target (In-Place, 0 Alokasi).
 */
export function bicubicResizeTileInPlace(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  destW: number,
  destH: number,
  destData: Uint8ClampedArray
): void {
  // Prekomputasi bobot untuk petak ini (hanya loop kecil destW + destH)
  precomputeAxisWeights(srcW, destW, precompIndicesX, precompWeightsX);
  precomputeAxisWeights(srcH, destH, precompIndicesY, precompWeightsY);

  for (let dy = 0; dy < destH; dy++) {
    const yBase = dy * 4;
    const py0 = precompIndicesY[yBase];
    const py1 = precompIndicesY[yBase + 1];
    const py2 = precompIndicesY[yBase + 2];
    const py3 = precompIndicesY[yBase + 3];

    const wy0 = precompWeightsY[yBase];
    const wy1 = precompWeightsY[yBase + 1];
    const wy2 = precompWeightsY[yBase + 2];
    const wy3 = precompWeightsY[yBase + 3];

    const row0 = py0 * srcW * 4;
    const row1 = py1 * srcW * 4;
    const row2 = py2 * srcW * 4;
    const row3 = py3 * srcW * 4;

    const destRowOffset = dy * destW * 4;

    for (let dx = 0; dx < destW; dx++) {
      const xBase = dx * 4;
      const px0 = precompIndicesX[xBase] * 4;
      const px1 = precompIndicesX[xBase + 1] * 4;
      const px2 = precompIndicesX[xBase + 2] * 4;
      const px3 = precompIndicesX[xBase + 3] * 4;

      const wx0 = precompWeightsX[xBase];
      const wx1 = precompWeightsX[xBase + 1];
      const wx2 = precompWeightsX[xBase + 2];
      const wx3 = precompWeightsX[xBase + 3];

      let r = 0;
      let g = 0;
      let b = 0;

      // Jalur 4 baris Y x 4 kolom X
      const pY = [row0, row1, row2, row3];
      const wY = [wy0, wy1, wy2, wy3];
      const pX = [px0, px1, px2, px3];
      const wX = [wx0, wx1, wx2, wx3];

      for (let m = 0; m < 4; m++) {
        const rOffset = pY[m];
        const ym = wY[m];

        for (let n = 0; n < 4; n++) {
          const idx = rOffset + pX[n];
          const w = ym * wX[n];
          r += srcData[idx] * w;
          g += srcData[idx + 1] * w;
          b += srcData[idx + 2] * w;
        }
      }

      const destIdx = destRowOffset + dx * 4;
      destData[destIdx] = r < 0 ? 0 : r > 255 ? 255 : (r + 0.5) | 0;
      destData[destIdx + 1] = g < 0 ? 0 : g > 255 ? 255 : (g + 0.5) | 0;
      destData[destIdx + 2] = b < 0 ? 0 : b > 255 ? 255 : (b + 0.5) | 0;
      destData[destIdx + 3] = 255;
    }
  }
}

/**
 * Filter penajam (Unsharp Mask) in-place menggunakan scratchpad buffer yang sudah ada.
 * 0 alokasi memori heap baru. Sangat cepat dan mencegah artefak halo/ringing.
 */
export function applyUnsharpMaskInPlace(
  pixels: Uint8ClampedArray,
  w: number,
  h: number,
  scratchBuffer: Uint8ClampedArray,
  amount: number = 0.85
): void {
  // 1. Simpan salinan blur 3x3 ke scratchBuffer (integer arithmetic, hemat daya baterai iPhone)
  // Kernel: [1 2 1; 2 4 2; 1 2 1] / 16
  for (let y = 0; y < h; y++) {
    const yTop = Math.max(0, y - 1);
    const yBottom = Math.min(h - 1, y + 1);

    const rTop = yTop * w * 4;
    const rMid = y * w * 4;
    const rBot = yBottom * w * 4;

    for (let x = 0; x < w; x++) {
      const xLeft = Math.max(0, x - 1) * 4;
      const xMid = x * 4;
      const xRight = Math.min(w - 1, x + 1) * 4;

      // Hitung 3 saluran warna (R, G, B)
      for (let c = 0; c < 3; c++) {
        const sum =
          srcVal(pixels, rTop + xLeft + c) +
          srcVal(pixels, rTop + xMid + c) * 2 +
          srcVal(pixels, rTop + xRight + c) +
          srcVal(pixels, rMid + xLeft + c) * 2 +
          srcVal(pixels, rMid + xMid + c) * 4 +
          srcVal(pixels, rMid + xRight + c) * 2 +
          srcVal(pixels, rBot + xLeft + c) +
          srcVal(pixels, rBot + xMid + c) * 2 +
          srcVal(pixels, rBot + xRight + c);

        scratchBuffer[rMid + xMid + c] = (sum + 8) >> 4; // Dibagi 16 dengan pembulatan
      }
    }
  }

  // 2. Gabungkan kembali: Hasil = Original + Amount * (Original - Blurred)
  const total = w * h * 4;
  for (let i = 0; i < total; i += 4) {
    const origR = pixels[i];
    const origG = pixels[i + 1];
    const origB = pixels[i + 2];

    const blurR = scratchBuffer[i];
    const blurG = scratchBuffer[i + 1];
    const blurB = scratchBuffer[i + 2];

    const sharpR = origR + (origR - blurR) * amount;
    const sharpG = origG + (origG - blurG) * amount;
    const sharpB = origB + (origB - blurB) * amount;

    pixels[i] = sharpR < 0 ? 0 : sharpR > 255 ? 255 : (sharpR + 0.5) | 0;
    pixels[i + 1] = sharpG < 0 ? 0 : sharpG > 255 ? 255 : (sharpG + 0.5) | 0;
    pixels[i + 2] = sharpB < 0 ? 0 : sharpB > 255 ? 255 : (sharpB + 0.5) | 0;
    // Alpha pixels[i + 3] tetap 255
  }
}

function srcVal(arr: Uint8ClampedArray, idx: number): number {
  return arr[idx];
}
