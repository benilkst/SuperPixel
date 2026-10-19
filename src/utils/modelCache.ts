/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { MODEL_CACHE_NAME, MODEL_CACHE_KEY, DEFAULT_MODEL_URL } from '../constants/config';

export interface ModelDownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  percentage: number;
  fromCache: boolean;
}

export async function getCachedModelBuffer(): Promise<ArrayBuffer | null> {
  if (typeof caches === 'undefined') return null;

  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const response = await cache.match(MODEL_CACHE_KEY);
    if (response && response.ok) {
      return await response.arrayBuffer();
    }
  } catch (err) {
    console.warn('Gagal membaca cache model:', err);
  }
  return null;
}

export async function saveToCache(buffer: ArrayBuffer): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    // Clone buffer agar tidak terpengaruh transfer ke Web Worker
    const cloned = buffer.slice(0);
    const response = new Response(cloned, {
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': cloned.byteLength.toString(),
      },
    });
    await cache.put(MODEL_CACHE_KEY, response);
  } catch (err) {
    console.warn('Gagal menyimpan model ke Cache API:', err);
  }
}

export async function fetchAndCacheModel(
  modelUrl: string = DEFAULT_MODEL_URL,
  onProgress?: (progress: ModelDownloadProgress) => void
): Promise<ArrayBuffer | null> {
  // 1. Cek apakah sudah ada di Cache API
  const cached = await getCachedModelBuffer();
  if (cached && cached.byteLength > 1000000) {
    onProgress?.({
      loadedBytes: cached.byteLength,
      totalBytes: cached.byteLength,
      percentage: 100,
      fromCache: true,
    });
    return cached;
  }

  // 2. Unduh model dari same-origin endpoint lokal (/models/realesr-general-x4v3.onnx)
  let response: Response | null = null;
  try {
    response = await fetch(modelUrl, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (fetchErr) {
    console.warn(`Gagal mengambil model dari ${modelUrl}:`, fetchErr);
    return null;
  }

  const contentLength = response.headers.get('content-length');
  const totalBytes = contentLength ? parseInt(contentLength, 10) : 4871181; // ~4.87MB

  let arrayBuffer: ArrayBuffer | null = null;

  if (response.body && response.body.getReader) {
    try {
      const reader = response.body.getReader();
      const chunks: Uint8Array[] = [];
      let loadedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const percentage = Math.min(100, Math.round((loadedBytes / totalBytes) * 100));
          onProgress?.({
            loadedBytes,
            totalBytes,
            percentage,
            fromCache: false,
          });
        }
      }

      // Gabungkan semua chunk ke Uint8Array
      const fullBuffer = new Uint8Array(loadedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        fullBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      arrayBuffer = fullBuffer.buffer;
    } catch (streamErr) {
      console.warn('Streaming chunk gagal, mencoba arrayBuffer langsung:', streamErr);
      try {
        const fallbackResp = await fetch(modelUrl);
        if (fallbackResp.ok) {
          arrayBuffer = await fallbackResp.arrayBuffer();
        }
      } catch (e) {
        console.warn('Fallback arrayBuffer gagal:', e);
      }
    }
  } else {
    arrayBuffer = await response.arrayBuffer();
  }

  if (arrayBuffer && arrayBuffer.byteLength > 1000000) {
    // Simpan ke Cache API SEBELUM mengembalikan ke caller
    await saveToCache(arrayBuffer);
    onProgress?.({
      loadedBytes: arrayBuffer.byteLength,
      totalBytes: arrayBuffer.byteLength,
      percentage: 100,
      fromCache: false,
    });
    return arrayBuffer;
  }

  return null;
}
