export interface UseModelCacheReturn {
  isModelCached: boolean;
  isModelLoaded: boolean;
  bootProgress: number;
  bootStatus: string;
  markModelLoaded: () => void;
  startBooting: () => void;
  resetCache: () => void;
}

export const useModelCache = (): UseModelCacheReturn => {
  return {
    isModelCached: true,
    isModelLoaded: true,
    bootProgress: 100,
    bootStatus: 'Готово',
    markModelLoaded: () => {},
    startBooting: () => {},
    resetCache: () => {},
  };
};

export default useModelCache;
