/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Membaca orientasi EXIF dari file JPEG untuk memastikan foto dari kamera
 * iPhone tidak terbalik atau miring saat digambar ke canvas.
 */
export async function loadImageWithExifOrientation(
  file: File | Blob
): Promise<{ canvas: HTMLCanvasElement; width: number; height: number }> {
  // Metode 1: Coba createImageBitmap dengan imageOrientation: 'from-image' (didukung di Safari modern)
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const canvas = document.createElement('canvas');
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(bitmap, 0, 0);
        bitmap.close();
        return { canvas, width: canvas.width, height: canvas.height };
      }
    } catch {
      // Fallback ke Image tag jika createImageBitmap gagal
    }
  }

  // Metode 2: HTMLImageElement standar dengan pembacaan tag EXIF manual jika JPEG
  const orientation = await getExifOrientation(file);
  const dataUrl = await fileToDataURL(file);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Gagal menginisialisasi context 2D canvas'));
        return;
      }

      const width = img.naturalWidth;
      const height = img.naturalHeight;

      // Tangani rotasi berdasarkan orientasi EXIF (1-8)
      if (orientation > 4 && orientation <= 8) {
        canvas.width = height;
        canvas.height = width;
      } else {
        canvas.width = width;
        canvas.height = height;
      }

      switch (orientation) {
        case 2:
          ctx.transform(-1, 0, 0, 1, width, 0);
          break;
        case 3:
          ctx.transform(-1, 0, 0, -1, width, height);
          break;
        case 4:
          ctx.transform(1, 0, 0, -1, 0, height);
          break;
        case 5:
          ctx.transform(0, 1, 1, 0, 0, 0);
          break;
        case 6:
          ctx.transform(0, 1, -1, 0, height, 0);
          break;
        case 7:
          ctx.transform(0, -1, -1, 0, height, width);
          break;
        case 8:
          ctx.transform(0, -1, 1, 0, 0, width);
          break;
        default:
          break;
      }

      ctx.drawImage(img, 0, 0);
      resolve({ canvas, width: canvas.width, height: canvas.height });
    };
    img.onerror = () => reject(new Error('Gagal memuat gambar'));
    img.src = dataUrl;
  });
}

function fileToDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Parser biner ringan untuk membaca Exif Orientation tag (0x0112)
 * dari header JPEG tanpa dependensi library eksternal.
 */
async function getExifOrientation(file: File | Blob): Promise<number> {
  if (file.type !== 'image/jpeg' && !file.type.endsWith('jpg')) {
    return 1;
  }

  try {
    const slice = file.slice(0, 65536);
    const buffer = await slice.arrayBuffer();
    const view = new DataView(buffer);

    if (view.getUint16(0, false) !== 0xffd8) {
      return 1; // Bukan JPEG valid
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      if (view.getUint16(offset + 2, false) <= 8) return 1;
      const marker = view.getUint16(offset, false);
      offset += 2;

      if (marker === 0xffe1) {
        // APP1 Marker (Exif)
        if (view.getUint32((offset += 2), false) !== 0x45786966) {
          return 1;
        }

        const little = view.getUint16((offset += 6), false) === 0x4949;
        offset += view.getUint32(offset + 4, little);

        const tags = view.getUint16(offset, little);
        offset += 2;

        for (let i = 0; i < tags; i++) {
          if (view.getUint16(offset + i * 12, little) === 0x0112) {
            return view.getUint16(offset + i * 12 + 8, little);
          }
        }
      } else if ((marker & 0xff00) !== 0xff00) {
        break;
      } else {
        offset += view.getUint16(offset, false);
      }
    }
  } catch {
    // Abaikan jika header gagal dibaca
  }

  return 1;
}
