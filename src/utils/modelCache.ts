/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const MODEL_CACHE_NAME = 'superpixel-onnx-v1';

export async function isModelCached(modelUrl: string): Promise<boolean> {
  if (typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const match = await cache.match(modelUrl);
    return !!match;
  } catch {
    return false;
  }
}

export async function getCachedModelBuffer(modelUrl: string): Promise<ArrayBuffer | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const match = await cache.match(modelUrl);
    if (match) {
      return await match.arrayBuffer();
    }
  } catch (e) {
    console.warn('Gagal membaca cache model:', e);
  }
  return null;
}

export async function clearModelCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(MODEL_CACHE_NAME);
  } catch (e) {
    console.warn('Gagal menghapus cache model:', e);
  }
}

export async function checkModelStorageStatus(modelUrl: string): Promise<{
  isCached: boolean;
  persisted: boolean;
}> {
  let isCached = false;
  let persisted = false;

  try {
    isCached = await isModelCached(modelUrl);
  } catch {}

  try {
    if (typeof navigator !== 'undefined' && navigator.storage?.persisted) {
      persisted = await navigator.storage.persisted();
    }
  } catch {}

  return { isCached, persisted };
}

/**
 * Mengunduh model ONNX dengan pelacakan progres langsung (streaming)
 * dan menyimpannya secara otomatis ke Cache API untuk penggunaan offline.
 */
export async function downloadAndCacheModel(
  modelUrl: string,
  onProgress?: (percentage: number, loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const resp = await fetch(modelUrl, {
    mode: 'cors',
    cache: 'no-store',
  });

  if (!resp.ok) {
    throw new Error(`Gagal mengunduh model: HTTP ${resp.status} ${resp.statusText}`);
  }

  const contentLengthHeader = resp.headers.get('content-length');
  const expectedTotalBytes = contentLengthHeader
    ? parseInt(contentLengthHeader, 10)
    : 4_700_000; // Standar ~4.6 MB jika header tidak tersedia

  if (!resp.body) {
    const buf = await resp.arrayBuffer();
    if (typeof caches !== 'undefined') {
      try {
        const cache = await caches.open(MODEL_CACHE_NAME);
        await cache.put(
          modelUrl,
          new Response(buf.slice(0), {
            headers: { 'Content-Type': 'application/octet-stream' },
          })
        );
      } catch {}
    }
    onProgress?.(100, buf.byteLength, buf.byteLength);
    return buf;
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    if (value) {
      chunks.push(value);
      receivedBytes += value.length;

      const totalForPct = Math.max(expectedTotalBytes, receivedBytes);
      const pct = Math.min(100, Math.round((receivedBytes / totalForPct) * 100));
      onProgress?.(pct, receivedBytes, totalForPct);
    }
  }

  // Gabungkan seluruh chunks ke dalam satu ArrayBuffer
  const allBytes = new Uint8Array(receivedBytes);
  let position = 0;
  for (const chunk of chunks) {
    allBytes.set(chunk, position);
    position += chunk.length;
  }

  const resultBuffer = allBytes.buffer;

  // Simpan ke Cache API agar tidak diunduh ulang
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(MODEL_CACHE_NAME);
      await cache.put(
        modelUrl,
        new Response(resultBuffer.slice(0), {
          headers: { 'Content-Type': 'application/octet-stream' },
        })
      );
    } catch (cacheErr) {
      console.warn('Gagal menyimpan model ke Cache API:', cacheErr);
    }
  }

  return resultBuffer;
}
