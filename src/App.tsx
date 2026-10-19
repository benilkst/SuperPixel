/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { SoftHeader } from './components/SoftHeader';
import { SoftStepper, StepNumber } from './components/SoftStepper';
import { ImageUploader, LoadedImageInfo } from './components/ImageUploader';
import { StateSelect } from './components/StateSelect';
import { StateProcessing } from './components/StateProcessing';
import { StateResult } from './components/StateResult';
import { UpscaleMode, WorkerOutgoingMessage } from './types/upscaler';
import { loadImageWithExifOrientation } from './utils/exif';
import { computeOutputDimensions } from './utils/canvasLimit';
import { getCachedModelBuffer, fetchAndCacheModel } from './utils/modelCache';
import { DEFAULT_MODEL_URL } from './constants/config';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('superpixel_theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  const [step, setStep] = useState<StepNumber>(1);
  const [loadedImage, setLoadedImage] = useState<LoadedImageInfo | null>(null);
  const [scale, setScale] = useState<2 | 4>(4);
  const [mode, setMode] = useState<UpscaleMode>('ai');
  const [limit4K, setLimit4K] = useState<boolean>(true);
  const [isModelCached, setIsModelCached] = useState<boolean>(false);
  const [errorNotification, setErrorNotification] = useState<string | null>(null);

  // Processing state
  const [progressPct, setProgressPct] = useState(0);
  const [currentTile, setCurrentTile] = useState(0);
  const [totalTiles, setTotalTiles] = useState(1);
  const [statusText, setStatusText] = useState('');
  const [phase, setPhase] = useState('');
  const [isDownloadingModel, setIsDownloadingModel] = useState(false);
  const [downloadLoadedMb, setDownloadLoadedMb] = useState(0);
  const [downloadTotalMb, setDownloadTotalMb] = useState(0);

  // Result state
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [outputWidth, setOutputWidth] = useState(0);
  const [outputHeight, setOutputHeight] = useState(0);
  const [effectiveScale, setEffectiveScale] = useState(4);
  const [executionProvider, setExecutionProvider] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);

  // PWA install prompt
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const workerRef = useRef<Worker | null>(null);

  // Sync theme
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('superpixel_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('superpixel_theme', 'light');
    }
  }, [isDarkMode]);

  // Check model cache on mount
  useEffect(() => {
    getCachedModelBuffer().then((buf) => {
      setIsModelCached(buf !== null && buf.byteLength > 1000000);
    });
  }, []);

  // Listen for PWA beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
  };

  const handleImageSelected = async (file: File) => {
    setErrorNotification(null);
    try {
      const { canvas, width, height } = await loadImageWithExifOrientation(file);
      const previewUrl = canvas.toDataURL('image/jpeg', 0.85);

      setLoadedImage({
        file,
        fileName: file.name,
        fileSizeBytes: file.size,
        width,
        height,
        canvas,
        previewUrl,
      });
      setStep(2);
    } catch (err) {
      setErrorNotification((err as Error).message || 'Gagal memuat gambar');
    }
  };

  const handleClearImage = () => {
    if (loadedImage?.previewUrl) {
      URL.revokeObjectURL(loadedImage.previewUrl);
    }
    if (resultUrl) {
      URL.revokeObjectURL(resultUrl);
    }
    setLoadedImage(null);
    setResultUrl(null);
    setResultBlob(null);
    setErrorNotification(null);
    setStep(1);
  };

  const handleCancelProcess = () => {
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'CANCEL' });
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsDownloadingModel(false);
    setStep(2);
  };

  const handleStartProcess = async () => {
    if (!loadedImage) return;

    setErrorNotification(null);
    setStep(3);
    setProgressPct(0);
    setCurrentTile(0);
    setTotalTiles(1);
    setStatusText('Menyiapkan petak kanvas hemat memori...');
    setPhase('Persiapan');

    const dim = computeOutputDimensions(loadedImage.width, loadedImage.height, scale, limit4K);
    setEffectiveScale(dim.effectiveScale);
    setOutputWidth(dim.outputWidth);
    setOutputHeight(dim.outputHeight);

    let customModelBuffer: ArrayBuffer | undefined = undefined;

    // Jika mode AI dipilih, coba muat model lokal atau cache
    if (mode === 'ai') {
      try {
        setIsDownloadingModel(true);
        setPhase('Pemeriksaan Model');
        setStatusText('Memeriksa kesiapan model AI...');

        const fetched = await fetchAndCacheModel(DEFAULT_MODEL_URL, (p) => {
          if (!p.fromCache) {
            setIsDownloadingModel(true);
            setDownloadLoadedMb(p.loadedBytes / (1024 * 1024));
            setDownloadTotalMb(p.totalBytes / (1024 * 1024));
            setProgressPct(p.percentage);
            setStatusText(
              `Mengunduh model Real-ESRGAN (${(p.loadedBytes / (1024 * 1024)).toFixed(1)} / ${(
                p.totalBytes /
                (1024 * 1024)
              ).toFixed(1)} MB)`
            );
          }
        });

        if (fetched && fetched.byteLength > 1000000) {
          customModelBuffer = fetched;
          setIsModelCached(true);
        } else {
          setPhase('Mesin Ultra-HD Detail');
          setStatusText('Beralih ke Mesin Ultra-HD Detail (bebas reload)...');
        }
      } catch (dlErr) {
        console.info('Informasi model AI:', dlErr);
        setPhase('Mesin Ultra-HD Detail');
        setStatusText('Menggunakan Mesin Ultra-HD Detail (bebas reload)...');
      } finally {
        setIsDownloadingModel(false);
      }
    }

    // Ambil pixel sumber dari canvas
    const srcCtx = loadedImage.canvas.getContext('2d', { willReadFrequently: true });
    if (!srcCtx) {
      setErrorNotification('Konteks kanvas 2D tidak tersedia.');
      setStep(2);
      return;
    }

    const sourceImageData = srcCtx.getImageData(0, 0, loadedImage.width, loadedImage.height);
    const sourceBuffer = sourceImageData.data.buffer.slice(0);

    // Inisialisasi Web Worker
    const worker = new Worker(new URL('./workers/upscaler.worker.ts', import.meta.url), {
      type: 'module',
    });
    workerRef.current = worker;

    worker.onmessage = (e: MessageEvent<WorkerOutgoingMessage>) => {
      const msg = e.data;

      if (msg.type === 'PROGRESS') {
        setProgressPct(msg.payload.percentage);
        setCurrentTile(msg.payload.currentTile);
        setTotalTiles(msg.payload.totalTiles);
        setStatusText(msg.payload.statusText);
        setPhase(msg.payload.phase);
      } else if (msg.type === 'MODE_FALLBACK') {
        console.info('Pemberitahuan mode fallback:', msg.payload.reason);
      } else if (msg.type === 'SUCCESS') {
        const { outputBuffer, outputWidth: outW, outputHeight: outH, executionProvider: prov, elapsedMs: elapsed } =
          msg.payload;

        // Buat kanvas keluaran dan konversi ke Blob
        const outCanvas = document.createElement('canvas');
        outCanvas.width = outW;
        outCanvas.height = outH;
        const outCtx = outCanvas.getContext('2d');

        if (outCtx) {
          const outPixels = new Uint8ClampedArray(outputBuffer);
          const imgData = new ImageData(outPixels, outW, outH);
          outCtx.putImageData(imgData, 0, 0);
        }

        // Hentikan worker segera untuk membebaskan heap memory
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }

        // Konversi ke Blob dengan fallback aman jika PNG gagal karena batas memori
        const saveBlob = (blob: Blob | null) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setResultUrl(url);
            setResultBlob(blob);
            setOutputWidth(outW);
            setOutputHeight(outH);
            setExecutionProvider(prov);
            setElapsedMs(elapsed);
            setStep(4);
            // Bebaskan memori GPU kanvas
            outCanvas.width = 0;
            outCanvas.height = 0;
          } else {
            // Coba fallback ke JPEG jika PNG toBlob menghasilkan null
            outCanvas.toBlob((jpgBlob) => {
              if (jpgBlob) {
                const url = URL.createObjectURL(jpgBlob);
                setResultUrl(url);
                setResultBlob(jpgBlob);
                setOutputWidth(outW);
                setOutputHeight(outH);
                setExecutionProvider(prov);
                setElapsedMs(elapsed);
                setStep(4);
              } else {
                setErrorNotification('Gagal membuat file citra keluaran karena batasan memori peramban.');
                setStep(2);
              }
              outCanvas.width = 0;
              outCanvas.height = 0;
            }, 'image/jpeg', 0.95);
          }
        };

        outCanvas.toBlob(saveBlob, 'image/png');
      } else if (msg.type === 'ERROR') {
        setErrorNotification(`Kesalahan pemrosesan: ${msg.payload.message}`);
        if (workerRef.current) {
          workerRef.current.terminate();
          workerRef.current = null;
        }
        setStep(2);
      } else if (msg.type === 'CANCELLED') {
        setStep(2);
      }
    };

    worker.onerror = (err) => {
      console.error('Worker error:', err);
      setErrorNotification('Terjadi kendala pada pemrosesan latar belakang. Silakan coba kembali.');
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
      setStep(2);
    };

    // Kirim pekerjaan ke worker
    worker.postMessage(
      {
        type: 'START_UPSCALE',
        payload: {
          config: {
            inputWidth: loadedImage.width,
            inputHeight: loadedImage.height,
            requestedScale: scale,
            effectiveScale: dim.effectiveScale,
            outputWidth: dim.outputWidth,
            outputHeight: dim.outputHeight,
            limit4K,
            tileSize: 128,
            overlap: 16,
            mode,
            modelUrl: DEFAULT_MODEL_URL,
            customModelBuffer,
          },
          sourceBuffer,
          sourceWidth: loadedImage.width,
          sourceHeight: loadedImage.height,
        },
      },
      customModelBuffer ? [sourceBuffer, customModelBuffer] : [sourceBuffer]
    );
  };

  return (
    <div className="min-h-screen flex flex-col justify-between max-w-xl mx-auto pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex flex-col gap-3">
        {/* Header */}
        <SoftHeader
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((d) => !d)}
          canInstall={!!deferredPrompt}
          onInstall={handleInstallApp}
        />

        {/* Stepper */}
        <div className="px-4">
          <SoftStepper currentStep={step} />
        </div>

        {/* Error Notification Banner */}
        {errorNotification && (
          <div className="mx-4 p-3.5 rounded-2xl neu-inset bg-red-500/10 border border-red-500/20 flex items-center justify-between text-xs text-[var(--error)]">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{errorNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorNotification(null)}
              className="text-xs font-bold hover:underline cursor-pointer ml-2"
            >
              Tutup
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="px-4 pt-2">
          {step === 1 && (
            <div className="flex flex-col gap-4">
              <ImageUploader
                currentImage={loadedImage}
                onImageSelected={handleImageSelected}
                onClearImage={handleClearImage}
              />
              <div className="p-4 rounded-3xl neu-raised flex flex-col gap-2">
                <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider">
                  Keunggulan SuperPixel
                </span>
                <ul className="text-[11px] text-[var(--text-secondary)] space-y-1.5 list-disc list-inside">
                  <li><strong>Aman untuk iPhone & iPad</strong>: Pemrosesan petak bebas dari tab crash atau reload mendadak.</li>
                  <li><strong>WebGPU & WASM</strong>: Akselerasi kartu grafis perangkat bila didukung.</li>
                  <li><strong>100% Privat</strong>: Citra Anda tidak pernah meninggalkan perangkat.</li>
                </ul>
              </div>
            </div>
          )}

          {step === 2 && loadedImage && (
            <StateSelect
              imageInfo={loadedImage}
              scale={scale}
              mode={mode}
              limit4K={limit4K}
              isModelCached={isModelCached}
              onScaleChange={setScale}
              onModeChange={setMode}
              onLimit4KChange={setLimit4K}
              onStart={handleStartProcess}
              onReset={handleClearImage}
            />
          )}

          {step === 3 && (
            <StateProcessing
              percentage={progressPct}
              currentTile={currentTile}
              totalTiles={totalTiles}
              statusText={statusText}
              phase={phase}
              isDownloadingModel={isDownloadingModel}
              downloadLoadedMb={downloadLoadedMb}
              downloadTotalMb={downloadTotalMb}
              onCancel={handleCancelProcess}
            />
          )}

          {step === 4 && loadedImage && resultUrl && resultBlob && (
            <StateResult
              originalImage={loadedImage}
              resultUrl={resultUrl}
              resultBlob={resultBlob}
              outputWidth={outputWidth}
              outputHeight={outputHeight}
              effectiveScale={effectiveScale}
              executionProvider={executionProvider}
              elapsedMs={elapsedMs}
              onReset={handleClearImage}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-8 px-4 text-center">
        <span className="text-[10px] text-[var(--text-secondary)] font-medium">
          SuperPixel · Dijalankan sepenuhnya pada perangkat Anda tanpa server.
        </span>
      </footer>
    </div>
  );
}
export default App;
