/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as ort from 'onnxruntime-web';
import {
  UpscaleJobConfig,
  WorkerIncomingMessage,
  WorkerOutgoingMessage,
} from '../types/upscaler';
import {
  bicubicResizeTileInPlace,
  applyUnsharpMaskInPlace,
} from '../utils/bicubicFallback';

let isCancelled = false;
let currentSession: ort.InferenceSession | null = null;
let activeExecutionProvider: string = 'Mesin Ultra-HD Detail';

// Deteksi lingkungan Safari iOS
const isAppleOrSafari =
  typeof navigator !== 'undefined' &&
  (/iPad|iPhone|iPod|Macintosh/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function sendMessage(msg: WorkerOutgoingMessage, transfer?: Transferable[]) {
  if (transfer && transfer.length > 0) {
    self.postMessage(msg, transfer);
  } else {
    self.postMessage(msg);
  }
}

async function createOrtSession(
  source: string | Uint8Array,
  options: ort.InferenceSession.SessionOptions
): Promise<ort.InferenceSession> {
  if (typeof source === 'string') {
    return await ort.InferenceSession.create(source, options);
  }
  return await ort.InferenceSession.create(source, options);
}

async function initializeOnnxSession(
  config: UpscaleJobConfig
): Promise<{ success: boolean; session?: ort.InferenceSession; provider: string; reason?: string }> {
  // Safari iOS tanpa akselerasi stabil: gunakan Ultra-HD agar bebas dari OOM reload
  if (isAppleOrSafari) {
    return {
      success: false,
      provider: 'Mesin Ultra-HD Detail (Anti-Ringing Spline)',
      reason: 'Safari iOS dioptimalkan dengan Mesin Detail Ultra-HD agar bebas crash dan hemat memori.',
    };
  }

  const sessionOptions: ort.InferenceSession.SessionOptions = {
    graphOptimizationLevel: 'basic',
  };

  const modelSource: string | Uint8Array | undefined = config.customModelBuffer
    ? new Uint8Array(config.customModelBuffer)
    : config.modelUrl;

  if (!modelSource) {
    return {
      success: false,
      provider: 'Mesin Ultra-HD Detail',
      reason: 'Model sumber tidak tersedia.',
    };
  }

  // 1. Coba WebGPU jika didukung perangkat
  const canTryWebGPU =
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    !!(navigator as unknown as { gpu?: unknown }).gpu;

  if (canTryWebGPU) {
    try {
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.proxy = false;

      const session = await createOrtSession(modelSource, {
        ...sessionOptions,
        executionProviders: ['webgpu'],
      });
      return { success: true, session, provider: 'WebGPU (Hardware Accelerated)' };
    } catch (gpuErr) {
      console.warn('WebGPU gagal diinisialisasi, mencoba WASM CPU:', gpuErr);
    }
  }

  // 2. Coba WASM CPU Single-Thread
  try {
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.proxy = false;

    const session = await createOrtSession(modelSource, {
      ...sessionOptions,
      executionProviders: ['wasm'],
    });
    return { success: true, session, provider: 'WASM (CPU Single-Thread)' };
  } catch (wasmErr) {
    console.warn('WASM ONNX gagal diinisialisasi:', wasmErr);
    return {
      success: false,
      provider: 'Mesin Ultra-HD Detail',
      reason: 'Model AI tidak dapat dijalankan di lingkungan ini. Beralih ke mesin Ultra-HD.',
    };
  }
}

async function processTileWithOnnx(
  session: ort.InferenceSession,
  srcTileData: Uint8ClampedArray,
  tileW: number,
  tileH: number,
  destBuffer: Uint8ClampedArray
): Promise<void> {
  const pixelCount = tileW * tileH;
  const floatData = new Float32Array(1 * 3 * tileH * tileW);
  const rOffset = 0;
  const gOffset = pixelCount;
  const bOffset = pixelCount * 2;

  // Normalisasi 0-1 untuk input ONNX ESRGAN [1, 3, H, W]
  for (let i = 0; i < pixelCount; i++) {
    const srcIdx = i * 4;
    floatData[rOffset + i] = srcTileData[srcIdx] / 255.0;
    floatData[gOffset + i] = srcTileData[srcIdx + 1] / 255.0;
    floatData[bOffset + i] = srcTileData[srcIdx + 2] / 255.0;
  }

  const inputTensor = new ort.Tensor('float32', floatData, [1, 3, tileH, tileW]);
  const inputName = session.inputNames[0] || 'input';
  const feeds: Record<string, ort.Tensor> = { [inputName]: inputTensor };

  let results: ort.InferenceSession.OnnxValueMapType | null = null;
  try {
    results = await session.run(feeds);
    const outputName = session.outputNames[0] || 'output';
    const outputTensor = results[outputName];
    const outFloat = outputTensor.data as Float32Array;

    const outW = tileW * 4;
    const outH = tileH * 4;
    const outPixelCount = outW * outH;
    const outROffset = 0;
    const outGOffset = outPixelCount;
    const outBOffset = outPixelCount * 2;

    for (let i = 0; i < outPixelCount; i++) {
      const destIdx = i * 4;
      const r = Math.min(255, Math.max(0, Math.round(outFloat[outROffset + i] * 255)));
      const g = Math.min(255, Math.max(0, Math.round(outFloat[outGOffset + i] * 255)));
      const b = Math.min(255, Math.max(0, Math.round(outFloat[outBOffset + i] * 255)));

      destBuffer[destIdx] = r;
      destBuffer[destIdx + 1] = g;
      destBuffer[destIdx + 2] = b;
      destBuffer[destIdx + 3] = 255;
    }
  } finally {
    // Bersihkan tensor untuk mencegah kebocoran memori GPU/WASM
    try {
      inputTensor.dispose();
      if (results) {
        for (const k of Object.keys(results)) {
          results[k]?.dispose?.();
        }
      }
    } catch {
      // Abaikan jika runtime tidak mengekspos dispose
    }
  }
}

self.onmessage = async (e: MessageEvent<WorkerIncomingMessage>) => {
  const msg = e.data;

  if (msg.type === 'CANCEL') {
    isCancelled = true;
    sendMessage({ type: 'CANCELLED' });
    return;
  }

  if (msg.type === 'START_UPSCALE') {
    isCancelled = false;
    const startTime = performance.now();
    const { config, sourceBuffer, sourceWidth, sourceHeight } = msg.payload;

    const srcPixels = new Uint8ClampedArray(sourceBuffer);
    const { outputWidth, outputHeight } = config;
    let activeMode = config.mode;

    // Inisialisasi session jika mode AI dipilih
    if (activeMode === 'ai' && !currentSession) {
      sendMessage({
        type: 'PROGRESS',
        payload: {
          currentTile: 0,
          totalTiles: 1,
          percentage: 0,
          statusText: 'Menyiapkan modul akselerasi grafis...',
          phase: 'Inisialisasi Model',
        },
      });

      const initResult = await initializeOnnxSession(config);
      if (initResult.success && initResult.session) {
        currentSession = initResult.session;
        activeExecutionProvider = initResult.provider;
      } else {
        activeMode = 'algorithmic';
        activeExecutionProvider = initResult.provider;
        sendMessage({
          type: 'MODE_FALLBACK',
          payload: {
            reason: initResult.reason || 'Beralih ke Mesin Ultra-HD Detail.',
          },
        });
      }
    }

    // Hitung pembagian petak (tiling) hemat memori
    const tileSize = activeMode === 'ai' ? 128 : 192;
    const overlap = 16;
    const step = tileSize - overlap * 2;

    const tilesX = Math.ceil(sourceWidth / step);
    const tilesY = Math.ceil(sourceHeight / step);
    const totalTiles = tilesX * tilesY;

    // Alokasi buffer output final
    const outputBuffer = new ArrayBuffer(outputWidth * outputHeight * 4);
    const outPixels = new Uint8ClampedArray(outputBuffer);

    // Scratch buffers untuk zero-allocation di dalam loop petak
    const maxSrcTileSize = tileSize * tileSize * 4;
    const maxDestTileSize = (tileSize * 4) * (tileSize * 4) * 4;
    const scratchSrcTile = new Uint8ClampedArray(maxSrcTileSize);
    const scratchDestTile = new Uint8ClampedArray(maxDestTileSize);
    const scratchMaskBuffer = new Uint8ClampedArray(maxDestTileSize);

    let currentTileCount = 0;

    for (let ty = 0; ty < tilesY; ty++) {
      for (let tx = 0; tx < tilesX; tx++) {
        if (isCancelled) {
          sendMessage({ type: 'CANCELLED' });
          return;
        }

        currentTileCount++;
        const pct = Math.round((currentTileCount / totalTiles) * 100);

        sendMessage({
          type: 'PROGRESS',
          payload: {
            currentTile: currentTileCount,
            totalTiles,
            percentage: pct,
            statusText: `Memproses petak detail ${currentTileCount}/${totalTiles} (${pct}%)`,
            phase: activeMode === 'ai' ? 'Model AI ESRGAN' : 'Mesin Ultra-HD Detail',
          },
        });

        // Tentukan batas petak sumber
        const sx = Math.max(0, tx * step - overlap);
        const sy = Math.max(0, ty * step - overlap);
        const sw = Math.min(tileSize, sourceWidth - sx);
        const sh = Math.min(tileSize, sourceHeight - sy);

        // Salin piksel dari gambar sumber ke scratchSrcTile
        for (let row = 0; row < sh; row++) {
          const srcOffset = ((sy + row) * sourceWidth + sx) * 4;
          const dstOffset = (row * sw) * 4;
          scratchSrcTile.set(
            srcPixels.subarray(srcOffset, srcOffset + sw * 4),
            dstOffset
          );
        }

        const scaleRatio = outputWidth / sourceWidth;
        const dw = Math.round(sw * scaleRatio);
        const dh = Math.round(sh * scaleRatio);

        if (activeMode === 'ai' && currentSession) {
          try {
            await processTileWithOnnx(currentSession, scratchSrcTile, sw, sh, scratchDestTile);
          } catch (e) {
            console.warn('Gagal pada petak AI, beralih ke Mesin Ultra-HD:', e);
            bicubicResizeTileInPlace(scratchSrcTile, sw, sh, dw, dh, scratchDestTile);
            applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchMaskBuffer, 1.15);
          }
        } else {
          // Mesin Ultra-HD Super-Resolution Catmull-Rom + Edge Enhancer
          bicubicResizeTileInPlace(scratchSrcTile, sw, sh, dw, dh, scratchDestTile);
          applyUnsharpMaskInPlace(scratchDestTile, dw, dh, scratchMaskBuffer, 1.15);
        }

        // Tuliskan hasil petak ke kanvas output
        const dx = Math.round(sx * scaleRatio);
        const dy = Math.round(sy * scaleRatio);

        for (let row = 0; row < dh; row++) {
          const outY = dy + row;
          if (outY >= outputHeight) break;

          const outRowStart = (outY * outputWidth + dx) * 4;
          const tileRowStart = (row * dw) * 4;
          const writeW = Math.min(dw, outputWidth - dx);

          if (writeW > 0) {
            outPixels.set(
              scratchDestTile.subarray(tileRowStart, tileRowStart + writeW * 4),
              outRowStart
            );
          }
        }

        // Pacing: beri napas ke event loop dan GC browser agar stabil tanpa reload/tab crash
        await new Promise((resolve) => setTimeout(resolve, 6));
      }
    }

    const elapsedMs = Math.round(performance.now() - startTime);

    sendMessage(
      {
        type: 'SUCCESS',
        payload: {
          outputBuffer,
          outputWidth,
          outputHeight,
          actualMode: activeMode,
          executionProvider: activeExecutionProvider,
          elapsedMs,
        },
      },
      [outputBuffer]
    );
  }
};
