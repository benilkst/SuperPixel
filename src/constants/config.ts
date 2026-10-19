/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export const DEFAULT_SCALE: 2 | 4 = 4;
export const DEFAULT_TILE_SIZE = 128;
export const DEFAULT_OVERLAP = 16;

// Model default Real-ESRGAN x4 ONNX (Local same-origin zero-CORS)
export const DEFAULT_MODEL_URL = '/models/realesr-general-x4v3.onnx';

// Mirror fallback jika diperlukan
export const FALLBACK_MODEL_URL =
  'https://huggingface.co/Heliosoph/realesrgan-onnx/resolve/main/realesr-general-x4v3.onnx';

export const MODEL_CACHE_NAME = 'superpixel-model-cache-v1';
export const MODEL_CACHE_KEY = 'realesr-general-x4v3.onnx';

// Batas aman kanvas iOS Safari & Mobile Jetsam Memory Limit
export const SAFARI_SAFE_MAX_DIMENSION = 4096;
export const SAFARI_IOS_MAX_CANVAS_PIXELS = 16777216; // 16.7 MP

// Default 4K clamp (3840 x 2160 approx 8.3 MP)
export const MAX_4K_PIXELS = 3840 * 2160;
