/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ExifOrientedImage {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export async function loadImageWithExifOrientation(
  file: File
): Promise<ExifOrientedImage> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Gagal mendapatkan konteks kanvas 2D'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve({
        canvas,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Format berkas gambar tidak dapat dibaca'));
    };

    img.src = url;
  });
}
