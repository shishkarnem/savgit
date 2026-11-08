import { fetchFileStorage, getStorageFile, getDirectFileUrl } from './fileStorage';

/**
 * Asset Preloader Utility
 * Preloads and caches heavy assets (Logo, Background Video stream, and 3D GLB Models)
 * directly from BD ProTalk `file_storage` database with real byte-level progress tracking.
 */

export function isSearchEngineBot(): boolean {
  if (typeof window === 'undefined' || !navigator.userAgent) return false;
  const ua = navigator.userAgent.toLowerCase();
  return /bot|crawler|spider|google|yandex|bing|slurp|duckduck|baidu|gptbot|perplexity|claudebot|headless|lighthouse|facebookexternalhit|telegrambot|twitterbot|whatsapp|vkshare|applebot/i.test(
    ua
  );
}

export interface PreloadProgress {
  progress: number;
  status: string;
}

// Global cache for pre-fetched 3D model and video blobs to eliminate duplicate network requests
declare global {
  interface Window {
    __SAV_MODEL_BLOBS?: Record<string, string>;
    __SAV_VIDEO_BLOBS?: Record<string, string>;
  }
}

export async function preloadApplicationAssets(
  onProgress: (info: PreloadProgress) => void
): Promise<void> {
  // If search engine crawler, complete immediately to guarantee zero SEO friction
  if (isSearchEngineBot()) {
    onProgress({ progress: 100, status: 'Загрузка приложения...' });
    return;
  }

  let stepCount = 0;
  const nextStatus = () => {
    stepCount++;
    return stepCount % 2 === 1 ? 'Загрузка приложения...' : 'Загрузка ресурсов...';
  };

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  let currentProgress = 5;
  onProgress({ progress: currentProgress, status: nextStatus() });

  // 1. Fetch file links directly from BD ProTalk file_storage table
  let dbFiles: any[] = [];
  try {
    dbFiles = await fetchFileStorage();
  } catch (err) {
    console.warn('[AssetPreloader] Warning fetching files from DB:', err);
  }

  currentProgress = 10;
  onProgress({ progress: currentProgress, status: nextStatus() });

  // Canonical file storage URLs
  const logoUrl = '/file/16/logo.png';
  const videoUrl = isMobile ? '/file/17/steammobile1080mini.mp4' : '/file/18/steamcity1080mini.mp4';
  const modelFile = getStorageFile(12) || getStorageFile('biH5cJqb') || getStorageFile('robot full-optimized.glb');
  const modelUrl = modelFile?.short_url || modelFile?.original_url || '/file/12';

  // 2. Preload Logo (10% -> 15%)
  try {
    await new Promise<void>((resolve) => {
      const img = new Image();
      img.src = logoUrl;
      if (img.complete) return resolve();
      img.onload = () => resolve();
      img.onerror = () => resolve();
    });
  } catch (_) {}

  currentProgress = 15;
  onProgress({
    progress: currentProgress,
    status: nextStatus(),
  });

  // 3. Preload Background Video Stream directly into browser cache (15% -> 50%)
  try {
    const videoController = new AbortController();
    const videoTimer = setTimeout(() => videoController.abort(), 6000);
    const videoResponse = await fetch(videoUrl, {
      signal: videoController.signal,
      headers: { Range: 'bytes=0-262144' } // Pre-warm video buffer (first 256KB)
    }).catch(() => null);
    clearTimeout(videoTimer);

    if (videoResponse && (videoResponse.ok || videoResponse.status === 206)) {
      onProgress({ progress: 35, status: nextStatus() });
      await videoResponse.arrayBuffer().catch(() => null);
    }
  } catch (videoErr) {
    console.warn('[AssetPreloader] Background video preload notice:', videoErr);
  }

  currentProgress = 50;
  onProgress({
    progress: currentProgress,
    status: nextStatus(),
  });

  // 4. Preload 3D Model File & Cache Blob for instant rendering (50% -> 92%)
  try {
    const modelController = new AbortController();
    const modelTimer = setTimeout(() => modelController.abort(), 8000);
    const modelResponse = await fetch(modelUrl, { signal: modelController.signal }).catch(() => null);
    clearTimeout(modelTimer);

    if (modelResponse && modelResponse.ok && modelResponse.body) {
      const totalBytes = parseInt(modelResponse.headers.get('content-length') || (modelFile?.file_size ? String(modelFile.file_size) : '920000'), 10);
      let loadedBytes = 0;
      const reader = modelResponse.body.getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          loadedBytes += value.length;
          const ratio = Math.min(1, loadedBytes / totalBytes);
          const dynamicProgress = Math.round(50 + ratio * 42); // 50% -> 92%

          onProgress({
            progress: dynamicProgress,
            status: nextStatus(),
          });
        }
      }

      // Convert downloaded chunks to Blob URL for instant rendering in <model-viewer>
      try {
        const fullBlob = new Blob(chunks, { type: 'model/gltf-binary' });
        const blobUrl = URL.createObjectURL(fullBlob);
        if (typeof window !== 'undefined') {
          window.__SAV_MODEL_BLOBS = window.__SAV_MODEL_BLOBS || {};
          window.__SAV_MODEL_BLOBS[modelUrl] = blobUrl;
          window.__SAV_MODEL_BLOBS['/file/12/robot-full-optimized.glb'] = blobUrl;
          window.__SAV_MODEL_BLOBS['/file/12'] = blobUrl;
          window.__SAV_MODEL_BLOBS['/file/biH5cJqb'] = blobUrl;
          if (modelFile?.original_url) window.__SAV_MODEL_BLOBS[modelFile.original_url] = blobUrl;
        }
      } catch (_) {}
    }

    // Wait for custom element <model-viewer> definition and pre-warm WebGL compilation
    if (typeof window !== 'undefined' && window.customElements) {
      onProgress({
        progress: 94,
        status: nextStatus(),
      });
      await window.customElements.whenDefined('model-viewer').catch(() => null);

      // Pre-warm the 3D model so WebGL compiles the mesh and textures before loader exits
      await new Promise<void>((resolve) => {
        try {
          const warmViewer = document.createElement('model-viewer') as any;
          warmViewer.style.position = 'fixed';
          warmViewer.style.width = '1px';
          warmViewer.style.height = '1px';
          warmViewer.style.top = '-9999px';
          warmViewer.style.left = '-9999px';
          warmViewer.style.opacity = '0';
          warmViewer.src =
            (window.__SAV_MODEL_BLOBS && window.__SAV_MODEL_BLOBS[modelUrl]) || modelUrl;
          warmViewer.loading = 'eager';

          let finished = false;
          const onDone = () => {
            if (!finished) {
              finished = true;
              try {
                if (warmViewer.parentNode) {
                  warmViewer.parentNode.removeChild(warmViewer);
                }
              } catch (_) {}
              resolve();
            }
          };

          warmViewer.addEventListener('load', onDone);
          warmViewer.addEventListener('error', onDone);
          setTimeout(onDone, 3000); // 3s maximum warmup wait
          document.body.appendChild(warmViewer);
        } catch (_) {
          resolve();
        }
      });
    }
  } catch (modelErr) {
    console.warn('[AssetPreloader] 3D Model preload note:', modelErr);
  }

  currentProgress = 98;
  onProgress({
    progress: currentProgress,
    status: nextStatus(),
  });

  await new Promise((resolve) => setTimeout(resolve, 200));

  onProgress({
    progress: 100,
    status: nextStatus(),
  });

  await new Promise((resolve) => setTimeout(resolve, 200));
}

