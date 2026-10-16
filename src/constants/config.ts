/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Model default: realesr-general-x4v3.onnx (SRVGGNetCompact, 4.6 MB, BSD-3)
// Kontrak: input float32 [1,3,h,w] RGB [0..1] NCHW -> output float32 [1,3,4h,4w] [0..1]
export const MODEL_URL: string = "https://huggingface.co/jonathanst29/tinier-upscale-models/resolve/main/realesr-general-x4v3.onnx";
export const FALLBACK_MODEL_URL: string = "./models/realesr-general-x4v3.onnx";

/**
 * Batasan Memori dan Ukuran Canvas Safari iOS (iPhone SE 2020: RAM 3GB).
 * Safari iOS membatasi canvas maksimal ~16.7 juta piksel (misal 4096 x 4096).
 */
export const SAFARI_IOS_MAX_CANVAS_PIXELS = 16_777_216; // ~16.7 Megapiksel
export const SAFARI_SAFE_MAX_DIMENSION = 4096; // Batas dimensi aman pada iPhone SE

/**
 * Resolusi Maksimum Standar 4K UHD
 */
export const MAX_4K_WIDTH = 3840;
export const MAX_4K_HEIGHT = 2160;
export const MAX_4K_PIXELS = MAX_4K_WIDTH * MAX_4K_HEIGHT; // 8,294,400 piksel

/**
 * Pengaturan Petak (Tiling) Default untuk Menghemat RAM
 * Diproses satu per satu secara berurutan untuk mencegah kehabisan memori.
 */
export const DEFAULT_TILE_SIZE = 128; // 128x128 px sangat aman untuk RAM 3 GB
export const DEFAULT_TILE_OVERLAP = 16; // 16 px overlap untuk blending mulus
