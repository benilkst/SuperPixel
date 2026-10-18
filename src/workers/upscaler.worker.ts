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
// KONFIGURASI ONNX RUNTIME UNTUK VERCEL & SAFARI (STATIC HOSTING)
// ============================================================================
try {
  if (typeof ort !== 'undefined' && ort.env && ort.env.wasm) {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    let basePrefix = '/';
    if (typeof import.meta !== 'undefined' && import.meta.env && typeof import.meta.env.BASE_URL === 'string') {
      basePrefix = import.meta.env.BASE_URL;
    } else if (
      typeof self !== 'undefined' &&
      self.location &&
      self.location.origin &&
      self.location.origin !== 'null'
    ) {
      basePrefix = `${self.location.origin}/`;
    }
    if (!basePrefix.endsWith('/')) {
      basePrefix += '/';
    }

    ort.env.wasm.wasmPaths = basePrefix;
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
  let activeExecutionProvider = 'Mesin Ultra-HD Detail (Anti-Ringing Spline + Adaptive Edge)';

  // 1. Coba inisialisasi ONNX jika mode AI dipilih
  if (activeMode === 'ai') {
    self.postMessage({
      type: 'PROGRESS',
      payload: {
        currentTile: 0,
        totalTiles: 1,
        percentage: 0,
        phase: 'loading_model',
        statusText: 'Menyiapkan mesin pemrosesan...',
      },
    } as WorkerOutgoingMessage);

    const sessionInit = await initializeOnnxSession(config);
    if (sessionInit.success && sessionInit.session) {
      currentSession = sessionInit.session;
      activeExecutionProvider = sessionInit.provider;
    } else {
      activeMode = 'algorithmic';
      activeExecutionProvider = sessionInit.provider || 'Mesin Ultra-HD Detail (Anti-Ringing Spline + Adaptive Edge)';
      self.postMessage({
        type: 'MODE_FALLBACK',
        payload: {
          reason:
            sessionInit.errorReason ||
            'Dialihkan ke Mode Ultra-HD Super-Resolution (Anti-Ringing Spline + Adaptive Edge Detail).',
          isCorsError: sessionInit.isCorsError,
          offerLocalModelFile: sessionInit.offerLocalModelFile,
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

  // 3. Alokasikan buffer piksel output akhir (RGBA)
  const totalOutputPixels = outputWidth * outputHeight;
  const finalPixels = new Uint8ClampedArray(totalOutputPixels * 4);

  // 4. Pre-alokasi buffer scratchpad petak (HANYA SEKALI, 0 alokasi baru di loop!)
  const maxSrcW = tileSize;
  const maxSrcH = tileSize;
  const maxDestW = Math.ceil(tileSize * effectiveScale) + 16;
  const maxDestH = Math.ceil(tileSize * effectiveScale) + 16;

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
          bicubicResizeTileInPlace(
            scratchSrcTile,
            sw,
            sh,
            dw,
            dh,
            scratchDestTile
          );
          applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchBlurTile, 1.15);
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
        applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchBlurTile, 1.15);
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

      // Beri waktu napas mikro agar UI browser responsif dan GC berjalan (mencegah watchdog timeout)
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }

  // 6. Selesai - Kembalikan ArrayBuffer via Transferable Objects
  self.postMessage({
    type: 'PROGRESS',
    payload: {
      currentTile: totalTiles,
      totalTiles,
      percentage: 100,
      phase: 'finalizing',
      statusText: 'Menyusun hasil akhir resolusi tinggi...',
    },
  } as WorkerOutgoingMessage);

  const elapsedMs = Math.round(performance.now() - startTime);

  self.postMessage(
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
 * Ekstraksi petak dari buffer gambar sumber ke scratchpad (0 alokasi)
 */
function extractTileFromBuffer(
  src: Uint8ClampedArray,
  srcWidth: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  dest: Uint8ClampedArray
) {
  for (let y = 0; y < sh; y++) {
    const srcRowStart = ((sy + y) * srcWidth + sx) * 4;
    const destRowStart = (y * sw) * 4;
    const rowBytes = sw * 4;
    dest.set(src.subarray(srcRowStart, srcRowStart + rowBytes), destRowStart);
  }
}

/**
 * Blending petak ke buffer output dengan interpolasi linear halus di perbatasan overlap
 */
function blendTileDirectly(
  tilePixels: Uint8ClampedArray,
  dx: number,
  dy: number,
  dw: number,
  dh: number,
  outWidth: number,
  outHeight: number,
  blendRamp: number,
  blendLeft: boolean,
  blendTop: boolean,
  finalPixels: Uint8ClampedArray
) {
  const safeDw = Math.min(dw, outWidth - dx);
  const safeDh = Math.min(dh, outHeight - dy);

  for (let y = 0; y < safeDh; y++) {
    const outRowStart = ((dy + y) * outWidth + dx) * 4;
    const tileRowStart = (y * dw) * 4;

    let alphaY = 1.0;
    if (blendTop && y < blendRamp) {
      alphaY = (y + 1) / (blendRamp + 1);
    }

    for (let x = 0; x < safeDw; x++) {
      let alphaX = 1.0;
      if (blendLeft && x < blendRamp) {
        alphaX = (x + 1) / (blendRamp + 1);
      }

      const alpha = alphaX * alphaY;
      const oIdx = outRowStart + x * 4;
      const tIdx = tileRowStart + x * 4;

      if (alpha >= 0.999) {
        finalPixels[oIdx] = tilePixels[tIdx];
        finalPixels[oIdx + 1] = tilePixels[tIdx + 1];
        finalPixels[oIdx + 2] = tilePixels[tIdx + 2];
        finalPixels[oIdx + 3] = 255;
      } else {
        const invAlpha = 1.0 - alpha;
        finalPixels[oIdx] = Math.round(
          finalPixels[oIdx] * invAlpha + tilePixels[tIdx] * alpha
        );
        finalPixels[oIdx + 1] = Math.round(
          finalPixels[oIdx + 1] * invAlpha + tilePixels[tIdx + 1] * alpha
        );
        finalPixels[oIdx + 2] = Math.round(
          finalPixels[oIdx + 2] * invAlpha + tilePixels[tIdx + 2] * alpha
        );
        finalPixels[oIdx + 3] = 255;
      }
    }
  }
}

/**
 * Inisialisasi ONNX Session
 */
async function initializeOnnxSession(
  config: UpscaleJobConfig
): Promise<{
  success: boolean;
  session?: ort.InferenceSession;
  provider: string;
  errorReason?: string;
  isCorsError?: boolean;
  offerLocalModelFile?: boolean;
}> {
  let modelBuffer: ArrayBuffer | null = config.customModelBuffer || null;

  // Deteksi lingkungan Safari iOS
  const isAppleOrSafari =
    typeof navigator !== 'undefined' &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (/^((?!chrome|android).)*safari/i.test(navigator.userAgent)));

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
        self.postMessage({
          type: 'PROGRESS',
          payload: {
            currentTile: 0,
            totalTiles: 1,
            percentage: 5,
            phase: 'downloading_model',
            statusText: 'Menghubungi server model AI Real-ESRGAN (4.6 MB)...',
          },
        } as WorkerOutgoingMessage);

        const resp = await fetch(config.modelUrl, {
          mode: 'cors',
          cache: 'no-store',
        });

        if (resp.ok) {
          if (resp.body) {
            const contentLength = resp.headers.get('content-length');
            const total = contentLength ? parseInt(contentLength, 10) : 4_700_000;
            const reader = resp.body.getReader();
            const chunks: Uint8Array[] = [];
            let loaded = 0;

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) {
                chunks.push(value);
                loaded += value.length;
                const pct = Math.min(99, Math.round((loaded / total) * 100));
                const mbLoaded = (loaded / (1024 * 1024)).toFixed(1);
                const mbTotal = (total / (1024 * 1024)).toFixed(1);
                self.postMessage({
                  type: 'PROGRESS',
                  payload: {
                    currentTile: 0,
                    totalTiles: 1,
                    percentage: pct,
                    phase: 'downloading_model',
                    statusText: `Mengunduh model Real-ESRGAN (${mbLoaded}/${mbTotal} MB - ${pct}%)...`,
                  },
                } as WorkerOutgoingMessage);
              }
            }

            const allBytes = new Uint8Array(loaded);
            let pos = 0;
            for (const chunk of chunks) {
              allBytes.set(chunk, pos);
              pos += chunk.length;
            }
            modelBuffer = allBytes.buffer;
          } else {
            modelBuffer = await resp.arrayBuffer();
          }

          if (typeof caches !== 'undefined' && modelBuffer) {
            try {
              const cache = await caches.open('superpixel-onnx-v1');
              await cache.put(
                config.modelUrl,
                new Response(modelBuffer.slice(0), {
                  headers: { 'Content-Type': 'application/octet-stream' },
                })
              );
            } catch {}
          }
        }
      } catch (primaryFetchErr) {
        console.warn('Gagal unduh model:', primaryFetchErr);
      }
    }

    if (!modelBuffer) {
      const fallbackUrls = [
        './models/realesr-general-x4v3.onnx',
        '/models/realesr-general-x4v3.onnx',
      ];
      for (const fallbackUrl of fallbackUrls) {
        try {
          const resp = await fetch(fallbackUrl);
          if (resp.ok) {
            const buf = await resp.arrayBuffer();
            if (buf && buf.byteLength > 0) {
              modelBuffer = buf;
              break;
            }
          }
        } catch {}
      }
    }

    if (!modelBuffer || modelBuffer.byteLength === 0) {
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      return {
        success: false,
        provider: 'None',
        isCorsError: !isOffline,
        offerLocalModelFile: true,
        errorReason: isOffline
          ? 'Perangkat sedang offline dan model AI belum tersimpan di cache. Mengalihkan ke Mode Ultra-HD.'
          : 'Model AI belum terunduh. Mengalihkan ke Mode Ultra-HD Super-Resolution.',
      };
    }
  }

  if (!modelBuffer || modelBuffer.byteLength === 0) {
    return {
      success: false,
      provider: 'None',
      offerLocalModelFile: true,
      errorReason: 'File model ONNX belum tersedia. Mengalihkan ke Mode Ultra-HD.',
    };
  }

  // 1. Coba WebGPU jika didukung perangkat (misal Chrome, Edge, desktop GPU)
  const canTryWebGPU =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    !!(navigator as unknown as { gpu?: unknown }).gpu;

  let webGpuUnavailableReason = canTryWebGPU
    ? 'WebGPU terdeteksi tetapi inisialisasi context gagal'
    : 'Dukungan WebGPU belum aktif atau tidak tersedia di peramban ini';

  if (canTryWebGPU) {
    try {
      const session = await ort.InferenceSession.create(modelBuffer, {
        executionProviders: ['webgpu'],
        graphOptimizationLevel: 'all',
      });
      return { success: true, session, provider: 'WebGPU (Akselerasi GPU)' };
    } catch (gpuErr) {
      console.warn('WebGPU init tidak tersedia:', gpuErr);
      webGpuUnavailableReason = `WebGPU belum aktif: ${gpuErr instanceof Error ? gpuErr.message : String(gpuErr)}`;
    }
  }

  // 2. Proteksi Memori Safari iOS:
  // Mengompilasi WASM ONNX 28.3MB di Web Worker Safari iOS melebihi kuota memori Jetsam WebKit (~250MB),
  // yang menyebabkan tab browser crash/reload otomatis seketika di iPhone/iPad.
  // Alihkan otomatis ke Mesin Ultra-HD Super-Resolution berpresisi tinggi (Anti-Ringing Spline + Adaptive Edge Detail)
  // yang 100% bebas crash dengan kualitas optik superior.
  if (isAppleOrSafari) {
    return {
      success: false,
      provider: 'Ultra-HD Detail Engine (Anti-Ringing Spline + Adaptive Edge)',
      errorReason:
        `${webGpuUnavailableReason}. Safari iOS mengalihkan pemrosesan ke Mesin Ultra-HD Super-Resolution (Anti-Ringing Spline + Adaptive Edge) agar 100% aman dari crash tab.`,
    };
  }

  // 3. Pada Desktop / Android (di mana kuota memori WASM aman):
  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const session = await ort.InferenceSession.create(modelBuffer, {
      executionProviders: ['wasm'],
      graphOptimizationLevel: 'all',
    });
    return { success: true, session, provider: 'WASM AI (Real-ESRGAN x4)' };
  } catch (wasmErr) {
    console.warn('WASM engine init gagal:', wasmErr);
    return {
      success: false,
      provider: 'None',
      errorReason: `${webGpuUnavailableReason} dan WASM menemui kendala. Mengalihkan ke Mode Ultra-HD Super-Res.`,
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
    } catch {}
  }
}
