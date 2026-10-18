/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState } from 'react';

export interface LoadedImageInfo {
  file: File;
  fileName: string;
  fileSizeBytes: number;
  width: number;
  height: number;
  canvas: HTMLCanvasElement;
  previewUrl: string;
}

interface ImageUploaderProps {
  currentImage: LoadedImageInfo | null;
  onImageSelected: (file: File) => void;
  onClearImage: () => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  currentImage,
  onImageSelected,
  onClearImage,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      onImageSelected(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClickUpload = () => {
    inputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onImageSelected(file);
          }
        }}
      />

      {!currentImage ? (
        <div
          onClick={handleClickUpload}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`w-full p-6 rounded-3xl neu-raised hover:neu-pressed active:neu-pressed transition-all flex flex-col items-center justify-center gap-3 cursor-pointer border ${
            isDragOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent'
          }`}
        >
          <div className="w-12 h-12 rounded-2xl neu-inset flex items-center justify-center text-[var(--accent)]">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
            </svg>
          </div>
          <div className="flex flex-col items-center text-center">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Pilih foto dari galeri
            </span>
            <span className="text-[11px] text-[var(--text-secondary)] mt-0.5">
              Gambar diproses secara lokal di perangkat dan tidak pernah diunggah.
            </span>
          </div>
        </div>
      ) : (
        <div className="w-full p-3.5 rounded-3xl neu-raised flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl neu-inset overflow-hidden shrink-0 flex items-center justify-center bg-black/5">
              <img
                src={currentImage.previewUrl}
                alt={currentImage.fileName}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold truncate text-[var(--text-primary)]">
                {currentImage.fileName}
              </span>
              <span className="text-[10px] text-[var(--text-secondary)] font-tabular">
                {currentImage.width} × {currentImage.height} px · {formatFileSize(currentImage.fileSizeBytes)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleClickUpload}
              className="px-2.5 py-1 rounded-full neu-raised hover:neu-pressed active:neu-pressed text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-wider cursor-pointer"
            >
              Ganti
            </button>
            <button
              type="button"
              onClick={onClearImage}
              aria-label="Hapus foto"
              className="w-7 h-7 rounded-full neu-raised hover:neu-pressed active:neu-pressed flex items-center justify-center text-[var(--error)] text-xs cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
