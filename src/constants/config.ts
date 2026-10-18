/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Model default: realesr-general-x4v3.onnx (SRVGGNetCompact, 4.6 MB, BSD-3)
export const MODEL_URL: string = "https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/main/realesr-general-x4v3.onnx";
export const FALLBACK_MODEL_URL: string = "./models/realesr-general-x4v3.onnx";

/**
 * Batasan Standar Canvas Safari iOS (iPhone SE / Perangkat RAM 3GB-4GB).
 * Safari iOS membatasi canvas standar ~16.7 juta piksel (misal 4096 x 4096).
 */
export const SAFARI_IOS_MAX_CANVAS_PIXELS = 16_777_216; // ~16.7 Megapiksel
export const SAFARI_SAFE_MAX_DIMENSION = 4096; // Batas dimensi aman rendering standar

/**
 * Batas Mode Resolusi Ekstrem (Bypass Batas Standar)
 * Mengizinkan hingga 8192 px dan ~67 Megapiksel untuk pengguna yang membutuhkan output raksasa.
 */
export const MAX_EXTREME_DIMENSION = 8192;
export const MAX_EXTREME_PIXELS = 67_108_864; // ~67.1 Megapiksel

/**
 * Resolusi Maksimum Standar 4K UHD
 */
export const MAX_4K_WIDTH = 3840;
export const MAX_4K_HEIGHT = 2160;
export const MAX_4K_PIXELS = MAX_4K_WIDTH * MAX_4K_HEIGHT; // 8,294,400 piksel

/**
 * Pengaturan Petak (Tiling) Teroptimasi
 * Ukuran 256 px memotong jumlah iterasi hingga 75% dibandingkan 128 px,
 * mencegah kelelahan CPU watchdog dan timeout tab di iOS.
 */
export const DEFAULT_TILE_SIZE = 256; 
export const DEFAULT_TILE_OVERLAP = 24; 
