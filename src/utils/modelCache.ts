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
