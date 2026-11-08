import { useEffect, useRef, useState } from 'react';

interface PreloadedImage {
  url: string;
  loaded: boolean;
  error: boolean;
}

export const useImagePreloader = (imageUrls: (string | null | undefined)[]) => {
  const [preloadedImages, setPreloadedImages] = useState<Map<string, PreloadedImage>>(new Map());
  const loadingRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const validUrls = imageUrls.filter((url): url is string => !!url);

    validUrls.forEach(url => {
      if (preloadedImages.has(url) || loadingRef.current.has(url)) {
        return;
      }

      loadingRef.current.add(url);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        loadingRef.current.delete(url);
        setPreloadedImages(prev => new Map(prev).set(url, { url, loaded: true, error: false }));
      };

      img.onerror = () => {
        loadingRef.current.delete(url);
        setPreloadedImages(prev => new Map(prev).set(url, { url, loaded: false, error: true }));
      };

      img.src = url;
    });
  }, [imageUrls, preloadedImages]);

  const isLoaded = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return preloadedImages.get(url)?.loaded ?? false;
  };

  const isLoading = (url: string | null | undefined): boolean => {
    if (!url) return false;
    return loadingRef.current.has(url) || !preloadedImages.has(url);
  };

  return { preloadedImages, isLoaded, isLoading };
};
