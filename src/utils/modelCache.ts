/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const CACHE_NAME = 'superpixel-onnx-v1';

export interface DownloadProgress {
  loaded: number;
  total: number;
  percentage: number;
  fromCache: boolean;
}

/**
 * Memeriksa apakah model sudah tersimpan di Cache API browser.
 */
export async function isModelCached(url: string): Promise<boolean> {
  if (!url || typeof caches === 'undefined') return false;
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch {
    return false;
  }
}

/**
 * Menghapus cache model ONNX dari browser.
 */
export async function clearModelCache(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    await caches.delete(CACHE_NAME);
  } catch (err) {
    console.warn('Gagal menghapus cache model:', err);
  }
}

/**
 * Mengunduh model ONNX dengan indikator kemajuan (progress) dan
 * menyimpannya ke Cache API browser agar tidak diunduh berulang kali.
 */
export async function fetchModelWithCache(
  url: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<ArrayBuffer> {
  if (!url || !url.trim()) {
    throw new Error('URL model ONNX belum diisi');
  }

  // 1. Cek dari Cache API
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(url);
      if (cachedResponse) {
        onProgress?.({
          loaded: 100,
          total: 100,
          percentage: 100,
          fromCache: true,
        });
        return await cachedResponse.arrayBuffer();
      }
    } catch (e) {
      console.warn('Cache API lookup gagal, melanjutkan unduhan via fetch:', e);
    }
  }

  // 2. Unduh dengan progress tracking
  const response = await fetch(url, {
    mode: 'cors',
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Gagal mengunduh model dari ${url}: HTTP ${response.status} ${response.statusText}`
    );
  }

  const contentLengthHeader = response.headers.get('content-length');
  const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;
  let loaded = 0;

  // Baca streaming body untuk laporan progress unduhan yang akurat
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress?.({ loaded: 100, total: 100, percentage: 100, fromCache: false });
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      if (onProgress) {
        const percentage = total > 0 ? Math.min(100, Math.round((loaded / total) * 100)) : 0;
        onProgress({ loaded, total, percentage, fromCache: false });
      }
    }
  }

  // Gabungkan chunks menjadi satu Uint8Array
  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  // Simpan ke Cache API jika didukung
  if (typeof caches !== 'undefined') {
    try {
      const cache = await caches.open(CACHE_NAME);
      // Buat Response baru untuk disimpan di cache
      const cacheResponse = new Response(combined.buffer.slice(0), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': loaded.toString(),
        },
      });
      await cache.put(url, cacheResponse);
    } catch (cacheErr) {
      console.warn('Gagal menyimpan model ke Cache API:', cacheErr);
    }
  }

  return combined.buffer;
}
