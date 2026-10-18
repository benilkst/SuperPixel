/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SoftHeader } from './components/SoftHeader';
import { SoftStepper, StepNumber } from './components/SoftStepper';
import { StateSelect } from './components/StateSelect';
import { StateProcess } from './components/StateProcess';
import { StateResult } from './components/StateResult';
import { SoftActionBar } from './components/SoftActionBar';
import { SoftBanner } from './components/SoftBanner';
import { SoftModal } from './components/SoftModal';
import { SoftToast, ToastItem } from './components/SoftToast';
import { LoadedImageInfo } from './components/ImageUploader';
import { MODEL_URL, DEFAULT_TILE_SIZE, DEFAULT_TILE_OVERLAP } from './constants/config';
import { calculateOutputDimensions, ScaleCalculation } from './utils/canvasLimit';
import { loadImageWithExifOrientation } from './utils/exif';
import { UpscaleMode, WorkerOutgoingMessage } from './types/upscaler';
import { registerSW } from 'virtual:pwa-register';
import { usePWA, IOSInstallBanner } from './components/PWAInstallBanner';
import { checkModelStorageStatus, clearModelCache, isModelCached } from './utils/modelCache';

interface ProcessingResult {
  outputCanvas: HTMLCanvasElement;
  enhancedUrl: string;
  actualMode: UpscaleMode;
  executionProvider: string;
  elapsedMs: number;
  width: number;
  height: number;
}

export default function App() {
  // Mode Gelap / Terang (Mengikuti prefers-color-scheme secara default)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Keadaan Aplikasi
  const [loadedImage, setLoadedImage] = useState<LoadedImageInfo | null>(null);
  const [scale, setScale] = useState<2 | 4>(2);
  const [limit4K, setLimit4K] = useState<boolean>(true);
  const [allowExtremeResolution, setAllowExtremeResolution] = useState<boolean>(false);
  const [downloadFormat, setDownloadFormat] = useState<'jpeg' | 'png'>('jpeg');
  const [jpegQuality, setJpegQuality] = useState<number>(92);
  const [mode, setMode] = useState<UpscaleMode>('ai');

  const [modelUrl, setModelUrl] = useState<string>(MODEL_URL);
  const [customModelFile, setCustomModelFile] = useState<File | null>(null);

  // Status Pemrosesan
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState({
    currentTile: 0,
    totalTiles: 0,
    percentage: 0,
    statusText: 'Inisialisasi sistem...',
    phase: '',
  });
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Hasil
  const [result, setResult] = useState<ProcessingResult | null>(null);
  const [estimatedSizeStr, setEstimatedSizeStr] = useState<string>('');

  // Umpan Balik: Banner, Modal, dan Toast
  const [bannerNotice, setBannerNotice] = useState<{
    type?: 'teal' | 'error';
    title?: string;
    message: string;
    actionButton?: React.ReactNode;
  } | null>(null);

  const [isCancelModalOpen, setIsCancelModalOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Ref Worker, Timer, & URL Pelacak Memori
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastBlobUrlRef = useRef<string | null>(null);

  // PWA Hook: Deteksi iOS Safari & Prompt Install Chromium/Android
  const { isStandalone, isIOS, canInstall, promptInstall } = usePWA();
  const [isModelStored, setIsModelStored] = useState<boolean>(false);

  const showToast = (
    message: string,
    type: 'success' | 'info' | 'error' = 'info',
    action?: { label: string; onAction: () => void; duration?: number }
  ) => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [
      ...prev,
      {
        id,
        message,
        type,
        actionLabel: action?.label,
        onAction: action?.onAction,
      },
    ]);
    const duration = action?.duration ?? (action ? 12000 : 3500);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  // Status penyimpanan model offline
  const refreshModelStorageStatus = async () => {
    const status = await checkModelStorageStatus(modelUrl);
    setIsModelStored(status.isCached);
  };

  useEffect(() => {
    refreshModelStorageStatus();
  }, [modelUrl]);

  const handleClearModelStorage = async () => {
    await clearModelCache();
    setIsModelStored(false);
    showToast('Data model tersimpan telah dihapus.', 'info');
  };

  const isProcessingRef = useRef(isProcessing);
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    // Upaya terbaik persistensi penyimpanan agar tidak dihapus otomatis oleh iOS
    if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
      navigator.storage.persist().catch(() => {});
    }

    // Registrasi PWA Service Worker (Workbox prompt mode)
    try {
      const updateSW = registerSW({
        onNeedRefresh() {
          showToast('Versi baru tersedia', 'info', {
            label: 'Muat ulang',
            onAction: () => {
              updateSW(true);
            },
            duration: 15000,
          });
        },
        onOfflineReady() {
          console.log('SuperPixel siap dijalankan secara offline.');
        },
        onRegisterError(error: unknown) {
          console.warn('Pendaftaran service worker PWA:', error);
        },
      });
    } catch (err) {
      console.warn('Gagal memuat registerSW:', err);
    }
  }, []);

  // Kalkulasi Dimensi Output dan Batas Memori
  const calculation: ScaleCalculation | null = useMemo(() => {
    if (!loadedImage) return null;
    return calculateOutputDimensions(
      loadedImage.width,
      loadedImage.height,
      scale,
      limit4K,
      allowExtremeResolution,
      DEFAULT_TILE_SIZE,
      DEFAULT_TILE_OVERLAP,
      mode === 'ai'
    );
  }, [loadedImage, scale, limit4K, allowExtremeResolution, mode]);

  // Perbarui estimasi ukuran berkas output
  useEffect(() => {
    if (!result?.outputCanvas) {
      setEstimatedSizeStr('');
      return;
    }
    const totalPx = result.width * result.height;
    if (downloadFormat === 'png') {
      const mb = (totalPx * 4 * 0.45) / (1024 * 1024);
      setEstimatedSizeStr(`${mb.toFixed(1)} MB`);
    } else {
      const factor = (jpegQuality / 100) * 0.18;
      const mb = (totalPx * 4 * factor) / (1024 * 1024);
      setEstimatedSizeStr(`${mb.toFixed(1)} MB`);
    }
  }, [result, downloadFormat, jpegQuality]);

  // Muat dan periksa berkas gambar
  const handleImageSelected = async (file: File) => {
    try {
      setBannerNotice(null);
      if (lastBlobUrlRef.current) {
        try {
          URL.revokeObjectURL(lastBlobUrlRef.current);
        } catch {}
        lastBlobUrlRef.current = null;
      }
      setResult(null);

      const fileName = file.name;
      const { canvas, width, height } = await loadImageWithExifOrientation(file);

      // Buat URL pratinjau yang ringan
      const previewUrl = URL.createObjectURL(file);
      lastBlobUrlRef.current = previewUrl;

      setLoadedImage({
        file,
        fileName,
        fileSizeBytes: file.size,
        width,
        height,
        canvas,
        previewUrl,
      });

      showToast(`Foto "${fileName}" berhasil dimuat.`, 'success');
    } catch (err) {
      setBannerNotice({
        type: 'error',
        title: 'Gagal Memuat Gambar',
        message:
          err instanceof Error
            ? err.message
            : 'Format berkas tidak terbaca. Harap pilih gambar JPEG, PNG, atau WebP.',
      });
    }
  };

  // Mulai Proses Upscaling
  const handleStartProcess = async () => {
    if (!loadedImage || !calculation) return;

    if (calculation.exceedsSafariLimit && !allowExtremeResolution) {
      setBannerNotice({
        type: 'teal',
        title: 'Resolusi Melebihi Batas Standar Safari',
        message: `Output ${calculation.outputWidth}×${calculation.outputHeight} px (${(calculation.totalPixels / 1_000_000).toFixed(1)} MP) melampaui batas standar Safari iOS (~16.7 MP). Aktifkan Mode Resolusi Ekstrem untuk tetap memprosesnya.`,
        actionButton: (
          <button
            type="button"
            onClick={() => {
              setAllowExtremeResolution(true);
              setBannerNotice(null);
              showToast('Mode Resolusi Ekstrem diaktifkan. Silakan tekan Mulai Perbesar.', 'info');
            }}
            className="h-8 px-3.5 rounded-full neu-btn-primary text-[11px] font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md"
          >
            <span>Aktifkan Mode Ekstrem</span>
          </button>
        ),
      });
      return;
    }

    // Periksa status offline & ketersediaan model sebelum memulai
    if (mode === 'ai' && !customModelFile) {
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
      const cached = await isModelCached(modelUrl);
      if (!cached && !isOnline) {
        setBannerNotice({
          type: 'error',
          title: 'Perangkat Sedang Offline',
          message:
            'Cache model AI belum tersimpan di perangkat dan koneksi internet tidak tersedia. Sambungkan ke internet untuk mengunduh model, gunakan mode Ultra-HD Super-Res, atau pilih file model .onnx lokal.',
        });
        return;
      }
    }

    setIsProcessing(true);
    setResult(null);
    setBannerNotice(null);
    setElapsedSeconds(0);
    setProgress({
      currentTile: 0,
      totalTiles: calculation.totalTiles,
      percentage: 0,
      statusText: 'Menyiapkan pemrosesan petak...',
      phase: 'starting',
    });

    const startTime = performance.now();
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds((performance.now() - startTime) / 1000);
    }, 100);

    try {
      const srcCtx = loadedImage.canvas.getContext('2d', { willReadFrequently: true });
      if (!srcCtx) throw new Error('Gagal membaca konteks 2D kanvas sumber');

      let sourceImageData: ImageData | null = srcCtx.getImageData(
        0,
        0,
        loadedImage.width,
        loadedImage.height
      );

      // Ambil ArrayBuffer untuk transfer hemat memori
      const sourceBuffer = sourceImageData.data.buffer.slice(0);
      sourceImageData = null; // Segera bebaskan memori di thread utama

      let customModelBuffer: ArrayBuffer | undefined;
      if (customModelFile) {
        customModelBuffer = await customModelFile.arrayBuffer();
      }

      const worker = new Worker(
        new URL('./workers/upscaler.worker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerOutgoingMessage>) => {
        const msg = e.data;

        if (msg.type === 'PROGRESS') {
          setProgress({
            currentTile: msg.payload.currentTile,
            totalTiles: msg.payload.totalTiles,
            percentage: msg.payload.percentage,
            statusText: msg.payload.statusText,
            phase: msg.payload.phase,
          });
        } else if (msg.type === 'MODE_FALLBACK') {
          const isCors = msg.payload.isCorsError || msg.payload.reason.includes('CORS');
          const shouldOfferLocal =
            msg.payload.offerLocalModelFile ||
            isCors ||
            msg.payload.reason.includes('.onnx');
          setBannerNotice({
            type: 'teal',
            title: isCors ? 'Pemuatan Model Gagal (Mode Ultra-HD Aktif)' : 'Mode Ultra-HD Super-Resolution Aktif',
            message: msg.payload.reason,
            actionButton: shouldOfferLocal ? (
              <label className="h-8 px-3 rounded-full neu-btn-primary text-[11px] font-bold cursor-pointer inline-flex items-center justify-center">
                <span>Pilih File .onnx dari Perangkat</span>
                <input
                  type="file"
                  accept=".onnx"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0];
                    if (f) {
                      setCustomModelFile(f);
                      showToast(`Model lokal "${f.name}" terpasang.`, 'success');
                    }
                  }}
                  className="hidden"
                />
              </label>
            ) : undefined,
          });
        } else if (msg.type === 'SUCCESS') {
          if (timerRef.current) clearInterval(timerRef.current);

          const {
            outputBuffer,
            outputWidth,
            outputHeight,
            actualMode,
            executionProvider,
            elapsedMs,
          } = msg.payload;

          const outCanvas = document.createElement('canvas');
          outCanvas.width = outputWidth;
          outCanvas.height = outputHeight;
          const outCtx = outCanvas.getContext('2d');
          if (outCtx) {
            const outPixels = new Uint8ClampedArray(outputBuffer);
            const imgData = new ImageData(outPixels, outputWidth, outputHeight);
            outCtx.putImageData(imgData, 0, 0);
          }

          // Segera tutup worker agar memori heap-nya dibebaskan sebelum membuat blob
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }

          outCanvas.toBlob(
            (blob) => {
              if (!blob) return;

              if (lastBlobUrlRef.current) {
                try {
                  URL.revokeObjectURL(lastBlobUrlRef.current);
                } catch {}
              }

              const enhancedUrl = URL.createObjectURL(blob);
              lastBlobUrlRef.current = enhancedUrl;

              setResult({
                outputCanvas: outCanvas,
                enhancedUrl,
                actualMode,
                executionProvider,
                elapsedMs,
                width: outputWidth,
                height: outputHeight,
              });

              setIsProcessing(false);
              showToast('Gambar berhasil diperbesar!', 'success');
              refreshModelStorageStatus();
            },
            'image/jpeg',
            0.92
          );
        } else if (msg.type === 'ERROR') {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsProcessing(false);
          setBannerNotice({
            type: 'error',
            title: 'Kesalahan Pemrosesan',
            message: msg.payload.message || 'Pemrosesan petak gagal diselesaikan.',
          });
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        } else if (msg.type === 'CANCELLED') {
          if (timerRef.current) clearInterval(timerRef.current);
          setIsProcessing(false);
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
          showToast('Pemrosesan dibatalkan.', 'info');
        }
      };

      // Fungsi pemrosesan standar in-thread jika worker mengalami kendala
      const executeMainThreadFallback = (reason?: string) => {
        try {
          if (timerRef.current) clearInterval(timerRef.current);
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }

          setProgress({
            currentTile: 1,
            totalTiles: 1,
            percentage: 60,
            statusText: 'Beralih ke pemrosesan standar...',
            phase: 'processing',
          });

          const outCanvas = document.createElement('canvas');
          outCanvas.width = calculation.outputWidth;
          outCanvas.height = calculation.outputHeight;
          const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
          if (!outCtx) throw new Error('Konteks kanvas fallback tidak tersedia');

          outCtx.imageSmoothingEnabled = true;
          outCtx.imageSmoothingQuality = 'high';
          outCtx.drawImage(
            loadedImage.canvas,
            0,
            0,
            calculation.outputWidth,
            calculation.outputHeight
          );

          outCanvas.toBlob(
            (blob) => {
              if (!blob) {
                setIsProcessing(false);
                setBannerNotice({
                  type: 'error',
                  title: 'Gagal Memproses Gambar',
                  message: 'Tidak dapat menghasilkan output kanvas.',
                });
                return;
              }

              const enhancedUrl = URL.createObjectURL(blob);
              lastBlobUrlRef.current = enhancedUrl;
              const elapsedMs = Math.round(performance.now() - startTime);

              setResult({
                outputCanvas: outCanvas,
                enhancedUrl,
                actualMode: 'algorithmic',
                executionProvider: 'Mesin Ultra-HD Detail (Anti-Ringing Spline)',
                elapsedMs,
                width: calculation.outputWidth,
                height: calculation.outputHeight,
              });

              setIsProcessing(false);
              showToast(
                'Thread latar belakang dialihkan ke pemrosesan standar kanvas.',
                'info'
              );
            },
            'image/jpeg',
            0.92
          );
        } catch (fallbackErr) {
          setIsProcessing(false);
          setBannerNotice({
            type: 'error',
            title: 'Kendala Pemrosesan',
            message:
              reason ||
              (fallbackErr instanceof Error
                ? fallbackErr.message
                : 'Pemrosesan cadangan menemui kendala.'),
          });
        }
      };

      worker.onerror = (err) => {
        console.warn('Worker onerror event:', err);
        executeMainThreadFallback();
      };

      // Kirim ArrayBuffer dengan transfer list untuk ZERO COPY
      worker.postMessage(
        {
          type: 'START_UPSCALE',
          payload: {
            config: {
              inputWidth: loadedImage.width,
              inputHeight: loadedImage.height,
              requestedScale: scale,
              effectiveScale: calculation.effectiveScale,
              outputWidth: calculation.outputWidth,
              outputHeight: calculation.outputHeight,
              limit4K,
              tileSize: DEFAULT_TILE_SIZE,
              overlap: DEFAULT_TILE_OVERLAP,
              mode,
              modelUrl: modelUrl.trim() || undefined,
              customModelBuffer,
            },
            sourceBuffer,
            sourceWidth: loadedImage.width,
            sourceHeight: loadedImage.height,
          },
        },
        [sourceBuffer]
      );
    } catch (err) {
      if (timerRef.current) clearInterval(timerRef.current);
      console.warn('Gagal menginisialisasi worker, beralih ke kanvas standar:', err);
      try {
        const outCanvas = document.createElement('canvas');
        outCanvas.width = calculation.outputWidth;
        outCanvas.height = calculation.outputHeight;
        const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
        if (outCtx) {
          outCtx.imageSmoothingEnabled = true;
          outCtx.imageSmoothingQuality = 'high';
          outCtx.drawImage(
            loadedImage.canvas,
            0,
            0,
            calculation.outputWidth,
            calculation.outputHeight
          );
          outCanvas.toBlob(
            (blob) => {
              if (blob) {
                const enhancedUrl = URL.createObjectURL(blob);
                lastBlobUrlRef.current = enhancedUrl;
                setResult({
                  outputCanvas: outCanvas,
                  enhancedUrl,
                  actualMode: 'algorithmic',
                  executionProvider: 'Mesin Ultra-HD Detail (Anti-Ringing Spline)',
                  elapsedMs: Math.round(performance.now() - startTime),
                  width: calculation.outputWidth,
                  height: calculation.outputHeight,
                });
                setIsProcessing(false);
                showToast('Pemrosesan selesai dengan kanvas standar.', 'info');
              } else {
                setIsProcessing(false);
              }
            },
            'image/jpeg',
            0.92
          );
          return;
        }
      } catch {}
      setIsProcessing(false);
      setBannerNotice({
        type: 'error',
        title: 'Gagal Memulai',
        message: err instanceof Error ? err.message : 'Terjadi kendala saat memulai.',
      });
    }
  };

  // Konfirmasi Batal
  const handleConfirmCancel = () => {
    setIsCancelModalOpen(false);
    if (timerRef.current) clearInterval(timerRef.current);
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsProcessing(false);
    showToast('Pemrosesan dibatalkan dan memori dibersihkan.', 'info');
  };

  // Unduh Berkas
  const handleDownload = () => {
    if (!result?.outputCanvas || !loadedImage) return;

    const mime = downloadFormat === 'png' ? 'image/png' : 'image/jpeg';
    const ext = downloadFormat === 'png' ? 'png' : 'jpg';
    const q = downloadFormat === 'png' ? undefined : jpegQuality / 100;

    result.outputCanvas.toBlob(
      (blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const baseName = loadedImage.fileName.replace(/\.[^/.]+$/, '');
        link.download = `${baseName}_x${scale}.${ext}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        showToast(`Berkas ${link.download} berhasil diunduh!`, 'success');
      },
      mime,
      q
    );
  };

  const handleReset = () => {
    if (lastBlobUrlRef.current) {
      try {
        URL.revokeObjectURL(lastBlobUrlRef.current);
      } catch {}
      lastBlobUrlRef.current = null;
    }
    setResult(null);
    setLoadedImage(null);
    setBannerNotice(null);
  };

  // Tentukan state aplikasi dan stepper aktif
  const appState: 'select' | 'process' | 'result' = isProcessing
    ? 'process'
    : result
    ? 'result'
    : 'select';

  const currentStep: StepNumber =
    appState === 'result'
      ? 4
      : appState === 'process'
      ? 3
      : loadedImage
      ? 2
      : 1;

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between neu-base transition-colors duration-200">
      {/* Toast Notification Stack */}
      <SoftToast
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />

      {/* Confirmation Modal */}
      <SoftModal
        isOpen={isCancelModalOpen}
        title="Batalkan Pemrosesan?"
        message="Pemrosesan petak yang sedang berjalan akan dihentikan dan seluruh alokasi memori kerja akan segera dibebaskan."
        confirmLabel="Ya, Batalkan"
        cancelLabel="Lanjutkan"
        isDestructive={true}
        onConfirm={handleConfirmCancel}
        onCancel={() => setIsCancelModalOpen(false)}
      />

      {/* Header Soft UI */}
      <SoftHeader
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
        canInstall={canInstall}
        onInstall={promptInstall}
      />

      {/* Konten Utama */}
      <main className="flex-1 max-w-md mx-auto w-full px-4 py-2 flex flex-col gap-4">
        {/* Banner Petunjuk Pemasangan Safari iOS */}
        <IOSInstallBanner isStandalone={isStandalone} isIOS={isIOS} />

        {/* Stepper 4 Langkah */}
        <SoftStepper currentStep={currentStep} />

        {/* Banner Peringatan Teal / Error */}
        {bannerNotice && (
          <SoftBanner
            type={bannerNotice.type}
            title={bannerNotice.title}
            message={bannerNotice.message}
            actionButton={bannerNotice.actionButton}
            onClose={() => setBannerNotice(null)}
          />
        )}

        {/* 1) KEADAAN PILIH & ATUR */}
        {appState === 'select' && (
          <StateSelect
            currentImage={loadedImage}
            onImageSelected={handleImageSelected}
            onClearImage={() => {
              if (lastBlobUrlRef.current) {
                try {
                  URL.revokeObjectURL(lastBlobUrlRef.current);
                } catch {}
                lastBlobUrlRef.current = null;
              }
              setLoadedImage(null);
              setResult(null);
            }}
            scale={scale}
            onScaleChange={setScale}
            limit4K={limit4K}
            onLimit4KChange={setLimit4K}
            allowExtremeResolution={allowExtremeResolution}
            onAllowExtremeResolutionChange={setAllowExtremeResolution}
            downloadFormat={downloadFormat}
            onDownloadFormatChange={setDownloadFormat}
            jpegQuality={jpegQuality}
            onJpegQualityChange={setJpegQuality}
            mode={mode}
            onModeChange={setMode}
            calculation={calculation}
            customModelFile={customModelFile}
            onCustomModelFileChange={setCustomModelFile}
            isModelStored={isModelStored}
            onClearModelStorage={handleClearModelStorage}
          />
        )}

        {/* 2) KEADAAN PROSES */}
        {appState === 'process' && loadedImage && calculation && (
          <StateProcess
            previewUrl={loadedImage.previewUrl}
            currentTile={progress.currentTile}
            totalTiles={calculation.totalTiles}
            tilesX={calculation.tilesX}
            tilesY={calculation.tilesY}
            percentage={progress.percentage}
            statusText={progress.statusText}
            elapsedSeconds={elapsedSeconds}
            onCancel={() => setIsCancelModalOpen(true)}
          />
        )}

        {/* 3) KEADAAN HASIL */}
        {appState === 'result' && result && loadedImage && calculation && (
          <StateResult
            originalUrl={loadedImage.previewUrl}
            enhancedUrl={result.enhancedUrl}
            originalWidth={loadedImage.width}
            originalHeight={loadedImage.height}
            enhancedWidth={result.width}
            enhancedHeight={result.height}
            effectiveScale={calculation.effectiveScale}
            elapsedMs={result.elapsedMs}
            mode={result.actualMode}
            executionProvider={result.executionProvider}
            format={downloadFormat}
            estimatedSizeStr={estimatedSizeStr}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Floating Soft Action Bar (Bottom Safe Area) */}
      <SoftActionBar
        currentStep={currentStep}
        isProcessing={isProcessing}
        scale={scale}
        downloadFormat={downloadFormat}
        hasImage={!!loadedImage}
        onStartProcess={handleStartProcess}
        onDownload={handleDownload}
      />
    </div>
  );
}
