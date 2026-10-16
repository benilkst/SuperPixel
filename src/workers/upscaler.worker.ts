/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ort from 'onnxruntime-web';
import {
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
  UpscaleJobConfig,
  UpscaleMode,
} from '../types/upscaler';
import {
  bicubicResizeTileInPlace,
  applyUnsharpMaskInPlace,
} from '../utils/bicubicFallback';

// ============================================================================
// KONFIGURASI ONNX RUNTIME UNTUK GITHUB PAGES & SAFARI (STATIC HOSTING)
// ============================================================================
const ONNX_VERSION = '1.30.0';

try {
  if (typeof ort !== 'undefined' && ort.env && ort.env.wasm) {
    // GitHub Pages tidak dapat mengirim header COOP/COEP, gunakan numThreads = 1
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    // Tentukan path ke file WASM lokal (dari folder public/dist) atau CDN fallback
    // Di Web Worker, self.location.href merujuk ke lokasi worker
    let localWasmPrefix = './';
    if (typeof self !== 'undefined' && self.location && self.location.href) {
      try {
        const workerUrl = new URL(self.location.href);
        // Jika worker berada di subfolder seperti /assets/, arahkan ke root aplikasi
        localWasmPrefix = new URL('../', workerUrl).href;
      } catch {
        localWasmPrefix = './';
      }
    }

    // Gunakan override path lokal dengan fallback CDN resmi
    ort.env.wasm.wasmPaths = {
      wasm: `${localWasmPrefix}ort-wasm-simd-threaded.wasm`,
      mjs: `${localWasmPrefix}ort-wasm-simd-threaded.mjs`,
    };
  }
} catch (e) {
  console.warn('Konfigurasi ort.env gagal:', e);
}

let isCancelled = false;
let currentSession: ort.InferenceSession | null = null;

self.onmessage = async (e: MessageEvent<WorkerIncomingMessage>) => {
  const message = e.data;

  if (message.type === 'CANCEL') {
    isCancelled = true;
    self.postMessage({ type: 'CANCELLED' } as WorkerOutgoingMessage);
    return;
  }

  if (message.type === 'START_UPSCALE') {
    isCancelled = false;
    const { config, sourceBuffer, sourceWidth, sourceHeight } = message.payload;
    const startTime = performance.now();

    try {
      await runUpscalePipeline(
        config,
        sourceBuffer,
        sourceWidth,
        sourceHeight,
        startTime
      );
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      const errorStack = err instanceof Error ? err.stack : undefined;
      self.postMessage({
        type: 'ERROR',
        payload: {
          message: errorMsg,
          stack: errorStack,
        },
      } as WorkerOutgoingMessage);
    }
  }
};

/**
 * Pipeline Utama Pemrosesan Upscale
 * Dirancang khusus ZERO-ALLOCATION di dalam loop petak agar tidak crash di Safari iOS.
 */
async function runUpscalePipeline(
  config: UpscaleJobConfig,
  sourceBuffer: ArrayBuffer,
  sourceWidth: number,
  sourceHeight: number,
  startTime: number
) {
  const {
    inputWidth,
    inputHeight,
    outputWidth,
    outputHeight,
    effectiveScale,
    tileSize,
    overlap,
  } = config;

  const srcPixels = new Uint8ClampedArray(sourceBuffer);

  let activeMode: UpscaleMode = config.mode;
  let activeExecutionProvider = 'Algoritmik (Bicubic Catmull-Rom + Unsharp Mask)';

  // 1. Coba inisialisasi ONNX jika mode AI dipilih
  if (activeMode === 'ai') {
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        currentTile: 0,
        totalTiles: 1,
        percentage: 0,
        phase: 'loading_model',
        statusText: 'Menyiapkan mesin AI...',
      },
    } as WorkerOutgoingMessage);

    const sessionInit = await initializeOnnxSession(config);
    if (sessionInit.success && sessionInit.session) {
      currentSession = sessionInit.session;
      activeExecutionProvider = sessionInit.provider;
    } else {
      activeMode = 'algorithmic';
      self.postMessage({
        type: 'MODE_FALLBACK',
        payload: {
          reason:
            sessionInit.errorReason ||
            'Model AI dialihkan ke mode Algoritmik Hemat Memori (Bicubic + Unsharp Mask).',
          isCorsError: sessionInit.isCorsError,
          modelName: 'realesr-general-x4v3.onnx',
        },
      } as WorkerOutgoingMessage);
    }
  }

  // 2. Hitung grid petak (tiling)
  const step = Math.max(16, tileSize - overlap);
  const tilesX = Math.max(1, Math.ceil((inputWidth - overlap) / step));
  const tilesY = Math.max(1, Math.ceil((inputHeight - overlap) / step));
  const totalTiles = tilesX * tilesY;

  // 3. Alokasikan HANYA SATU buffer piksel output akhir (RGBA)
  const totalOutputPixels = outputWidth * outputHeight;
  const finalPixels = new Uint8ClampedArray(totalOutputPixels * 4);

  // 4. Pre-alokasi buffer scratchpad petak (HANYA SEKALI, 0 alokasi baru di loop!)
  // Memori tetap FLAT ~35 MB, mencegah crash Jetsam di iPhone SE 2020.
  const maxSrcW = tileSize;
  const maxSrcH = tileSize;
  const maxDestW = Math.ceil(tileSize * effectiveScale) + 8;
  const maxDestH = Math.ceil(tileSize * effectiveScale) + 8;

  const scratchSrcTile = new Uint8ClampedArray(maxSrcW * maxSrcH * 4);
  const scratchDestTile = new Uint8ClampedArray(maxDestW * maxDestH * 4);
  const scratchBlurTile = new Uint8ClampedArray(maxDestW * maxDestH * 4);

  let currentTileIndex = 0;
  const blendRamp = overlap * effectiveScale;

  // 5. Proses petak secara BERURUTAN (satu per satu)
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      if (isCancelled) {
        return;
      }

      currentTileIndex++;

      // Koordinat sumber petak (source rect)
      const sx = tx * step;
      const sy = ty * step;
      const sw = Math.min(tileSize, inputWidth - sx);
      const sh = Math.min(tileSize, inputHeight - sy);

      if (sw <= 0 || sh <= 0) continue;

      // Ekstrak petak langsung ke scratchpad sumber
      extractTileFromBuffer(
        srcPixels,
        sourceWidth,
        sx,
        sy,
        sw,
        sh,
        scratchSrcTile
      );

      // Koordinat target petak (destination rect)
      const dx = Math.round(sx * effectiveScale);
      const dy = Math.round(sy * effectiveScale);
      const dw = Math.min(outputWidth - dx, Math.round(sw * effectiveScale));
      const dh = Math.min(outputHeight - dy, Math.round(sh * effectiveScale));

      let usedTileBuffer: Uint8ClampedArray = scratchDestTile;

      // Jalankan proses petak
      if (activeMode === 'ai' && currentSession) {
        try {
          const onnxTilePixels = await processTileWithOnnx(
            currentSession,
            scratchSrcTile,
            sw,
            sh,
            dw,
            dh
          );
          usedTileBuffer = onnxTilePixels;
        } catch {
          // Fallback petak ini ke Bicubic in-place
          bicubicResizeTileInPlace(
            scratchSrcTile,
            sw,
            sh,
            dw,
            dh,
            scratchDestTile
          );
          applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchBlurTile, 0.4);
          usedTileBuffer = scratchDestTile;
        }
      } else {
        bicubicResizeTileInPlace(
          scratchSrcTile,
          sw,
          sh,
          dw,
          dh,
          scratchDestTile
        );
        applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchBlurTile, 0.42);
        usedTileBuffer = scratchDestTile;
      }

      // Blending mulus di area overlap langsung ke finalPixels
      blendTileDirectly(
        usedTileBuffer,
        dx,
        dy,
        dw,
        dh,
        outputWidth,
        outputHeight,
        blendRamp,
        tx > 0,
        ty > 0,
        finalPixels
      );

      // Laporkan kemajuan
      const percentage = Math.round((currentTileIndex / totalTiles) * 100);
      self.postMessage({
        type: 'PROGRESS',
        payload: {
          currentTile: currentTileIndex,
          totalTiles,
          percentage,
          phase: 'processing_tiles',
          statusText: `Memproses petak ${currentTileIndex} dari ${totalTiles} (${percentage}%)...`,
        },
      } as WorkerOutgoingMessage);

      // Beri waktu napas mikro agar UI browser responsif
      if (currentTileIndex % 2 === 0) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  // 6. Selesai - Kembalikan ArrayBuffer via Transferable Objects
  self.postMessage({
    type: 'PROGRESS',
    payload: {
      currentTile: totalTiles,
      totalTiles,
      percentage: 100,
      phase: 'blending',
      statusText: 'Menyusun hasil akhir...',
    },
  } as WorkerOutgoingMessage);

  const elapsedMs = performance.now() - startTime;

  (self as unknown as Worker).postMessage(
    {
      type: 'SUCCESS',
      payload: {
        outputBuffer: finalPixels.buffer,
        outputWidth,
        outputHeight,
        actualMode: activeMode,
        executionProvider: activeExecutionProvider,
        elapsedMs,
      },
    } as WorkerOutgoingMessage,
    [finalPixels.buffer]
  );
}

/**
 * Ekstraksi piksel petak langsung ke buffer scratchpad tanpa alokasi baru
 */
function extractTileFromBuffer(
  srcPixels: Uint8ClampedArray,
  srcW: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  destBuffer: Uint8ClampedArray
): void {
  for (let row = 0; row < sh; row++) {
    const srcRowStart = ((sy + row) * srcW + sx) * 4;
    const tileRowStart = row * sw * 4;
    for (let col = 0; col < sw * 4; col++) {
      destBuffer[tileRowStart + col] = srcPixels[srcRowStart + col];
    }
  }
}

/**
 * Blending petak langsung ke buffer finalPixels (In-Place, 0 Alokasi).
 */
function blendTileDirectly(
  tilePixels: Uint8ClampedArray,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  outW: number,
  outH: number,
  blendRamp: number,
  hasLeftOverlap: boolean,
  hasTopOverlap: boolean,
  destPixels: Uint8ClampedArray
): void {
  const ramp = Math.max(2, Math.round(blendRamp));

  for (let ly = 0; ly < dh; ly++) {
    const gy = dy + ly;
    if (gy < 0 || gy >= outH) continue;

    let wy = 1.0;
    if (hasTopOverlap && ly < ramp) {
      wy = 0.5 - 0.5 * Math.cos((Math.PI * ly) / ramp);
    }

    const rowDestOffset = gy * outW * 4;
    const rowTileOffset = ly * dw * 4;

    for (let lx = 0; lx < dw; lx++) {
      const gx = dx + lx;
      if (gx < 0 || gx >= outW) continue;

      let wx = 1.0;
      if (hasLeftOverlap && lx < ramp) {
        wx = 0.5 - 0.5 * Math.cos((Math.PI * lx) / ramp);
      }

      const alpha = wx * wy;
      const gIdx = rowDestOffset + gx * 4;
      const tIdx = rowTileOffset + lx * 4;

      const tR = tilePixels[tIdx];
      const tG = tilePixels[tIdx + 1];
      const tB = tilePixels[tIdx + 2];

      if (alpha >= 0.999) {
        destPixels[gIdx] = tR;
        destPixels[gIdx + 1] = tG;
        destPixels[gIdx + 2] = tB;
        destPixels[gIdx + 3] = 255;
      } else {
        const prevR = destPixels[gIdx];
        const prevG = destPixels[gIdx + 1];
        const prevB = destPixels[gIdx + 2];

        destPixels[gIdx] = Math.round(prevR * (1.0 - alpha) + tR * alpha);
        destPixels[gIdx + 1] = Math.round(prevG * (1.0 - alpha) + tG * alpha);
        destPixels[gIdx + 2] = Math.round(prevB * (1.0 - alpha) + tB * alpha);
        destPixels[gIdx + 3] = 255;
      }
    }
  }
}

/**
 * Inisialisasi ONNX InferenceSession dengan pemeriksaan keamanan ketat
 */
async function initializeOnnxSession(
  config: UpscaleJobConfig
): Promise<{
  success: boolean;
  session?: ort.InferenceSession;
  provider: string;
  errorReason?: string;
  isCorsError?: boolean;
}> {
  let modelBuffer: ArrayBuffer | null = config.customModelBuffer || null;

  // Deteksi lingkungan Safari iOS
  const isAppleOrSafari =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)));

  // Periksa apakah SharedArrayBuffer tersedia
  const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';

  if (!modelBuffer && config.modelUrl && config.modelUrl.trim().length > 0) {
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open('superpixel-onnx-v1');
        const match = await cache.match(config.modelUrl);
        if (match) {
          modelBuffer = await match.arrayBuffer();
        }
      } catch (cacheErr) {
        console.warn('Cache API lookup:', cacheErr);
      }
    }

    if (!modelBuffer) {
      try {
        const resp = await fetch(config.modelUrl, {
          mode: 'cors',
          cache: 'no-store',
        });
        if (!resp.ok) {
          return {
            success: false,
            provider: 'None',
            isCorsError: true,
            errorReason: `Gagal mengunduh model dari URL (HTTP ${resp.status}). Kemungkinan dibatasi oleh CORS. Anda dapat mengunggah file .onnx langsung dari galeri/file lokal.`,
          };
        }
        modelBuffer = await resp.arrayBuffer();

        if (typeof caches !== 'undefined') {
          try {
            const cache = await caches.open('superpixel-onnx-v1');
            const cacheResp = new Response(modelBuffer.slice(0), {
              headers: { 'Content-Type': 'application/octet-stream' },
            });
            await cache.put(config.modelUrl, cacheResp);
          } catch {
            // Abaikan kegagalan cache
          }
        }
      } catch (fetchErr) {
        return {
          success: false,
          provider: 'None',
          isCorsError: true,
          errorReason: `Koneksi ke URL model terhambat kebijakan CORS browser: ${String(
            fetchErr
          )}. Silakan gunakan mode Algoritmik atau unggah file .onnx dari perangkat.`,
        };
      }
    }
  }

  if (!modelBuffer || modelBuffer.byteLength === 0) {
    return {
      success: false,
      provider: 'None',
      errorReason: 'File model ONNX belum tersedia.',
    };
  }

  // Coba WebGPU hanya jika didukung dan bukan Safari iOS
  const canTryWebGPU =
    !isAppleOrSafari &&
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    !!(navigator as unknown as { gpu?: unknown }).gpu;

  if (canTryWebGPU) {
    try {
      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
      });
      return { success: true, session, provider: 'WebGPU (Akselerasi GPU)' };
    } catch {
      // Lanjut ke WASM
    }
  }

  // Jika di Safari iOS tanpa SharedArrayBuffer, onnxruntime WASM threading tidak stabil
  if (isAppleOrSafari && !hasSharedArrayBuffer) {
    return {
      success: false,
      provider: 'None',
      errorReason:
        'Safari iOS membatasi thread WASM (tanpa SharedArrayBuffer). Beralih ke Mode Algoritmik Hemat Memori (Bicubic + Unsharp Mask) yang mulus dan cepat.',
    };
  }

  // Coba WASM
  try {
    const session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'basic',
    });
    return { success: true, session, provider: 'WASM (CPU)' };
  } catch (wasmErr) {
    return {
      success: false,
      provider: 'None',
      errorReason: `Inisialisasi engine ONNX: ${String(
        wasmErr
      )}. Mode Algoritmik Aktif.`,
    };
  }
}

/**
 * Pemrosesan petak tunggal dengan model ONNX
 */
async function processTileWithOnnx(
  session: ort.InferenceSession,
  tilePixels: Uint8ClampedArray,
  sw: number,
  sh: number,
  targetW: number,
  targetH: number
): Promise<Uint8ClampedArray> {
  const inputName = session.inputNames[0] || 'input';
  const planeSize = sh * sw;
  const floatData = new Float32Array(1 * 3 * sh * sw);

  for (let i = 0; i < planeSize; i++) {
    const pIdx = i * 4;
    floatData[i] = tilePixels[pIdx] / 255.0;
    floatData[planeSize + i] = tilePixels[pIdx + 1] / 255.0;
    floatData[planeSize * 2 + i] = tilePixels[pIdx + 2] / 255.0;
  }

  const inputTensor = new ort.Tensor('float32', floatData, [1, 3, sh, sw]);
  let outputTensor: ort.Tensor | null = null;

  try {
    const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };
    const results = await session.run(feeds);
    const outputName = session.outputNames[0] || Object.keys(results)[0];
    outputTensor = results[outputName];

    if (!outputTensor) {
      throw new Error('Tensor output kosong');
    }

    const outDims = outputTensor.dims;
    const modelOutH = outDims[2] || sh * 4;
    const modelOutW = outDims[3] || sw * 4;
    const outData = outputTensor.data as Float32Array;

    const outPixelData = new Uint8ClampedArray(modelOutW * modelOutH * 4);
    const outPlaneSize = modelOutH * modelOutW;

    for (let i = 0; i < outPlaneSize; i++) {
      const oIdx = i * 4;
      const rawR = outData[i];
      const rawG = outData[outPlaneSize + i];
      const rawB = outData[outPlaneSize * 2 + i];

      outPixelData[oIdx] = Math.round(
        Math.min(1.0, Math.max(0.0, rawR)) * 255.0
      );
      outPixelData[oIdx + 1] = Math.round(
        Math.min(1.0, Math.max(0.0, rawG)) * 255.0
      );
      outPixelData[oIdx + 2] = Math.round(
        Math.min(1.0, Math.max(0.0, rawB)) * 255.0
      );
      outPixelData[oIdx + 3] = 255;
    }

    // Jika model native x4 tapi target bukan 4x (misal 2x atau dibatasi 4K)
    if (modelOutW !== targetW || modelOutH !== targetH) {
      const downscaled = new Uint8ClampedArray(targetW * targetH * 4);
      bicubicResizeTileInPlace(
        outPixelData,
        modelOutW,
        modelOutH,
        targetW,
        targetH,
        downscaled
      );
      return downscaled;
    }

    return outPixelData;
  } finally {
    try {
      if (inputTensor && typeof inputTensor.dispose === 'function') {
        inputTensor.dispose();
      }
      if (outputTensor && typeof outputTensor.dispose === 'function') {
        outputTensor.dispose();
      }
    } catch {
      // Abaikan
    }
  }
}
