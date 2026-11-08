import { useLocation } from 'react-router-dom';

export interface RouteModelConfig {
  modelKey: string;
  modelUrl: string;
  modelName: string;
  baseAzimuth: number;
  basePolar: number;
  baseRadius: string;
  baseFov: string;
  baseTarget: string;
}

export const useRouteModel = (): RouteModelConfig => {
  const location = useLocation();
  const path = location.pathname.toLowerCase();

  // 1. Главная страница: /file/12/robot-full-optimized.glb (robot full-optimized - facing front)
  if (path === '/') {
    return {
      modelKey: 'biH5cJqb',
      modelUrl: '/file/12/robot-full-optimized.glb',
      modelName: 'Робот SAV AI',
      baseAzimuth: 18,
      basePolar: 76,
      baseRadius: '105%',
      baseFov: '32deg',
      baseTarget: '-0.15m 0m 0m'
    };
  }

  // 2. Страница маркетплейса: /file/13/robot-armor-optimized.glb (robot armor-optimized)
  if (path.startsWith('/marketplace') || path.startsWith('/tproduct')) {
    return {
      modelKey: 'nqMEmOXd',
      modelUrl: '/file/13/robot-armor-optimized.glb',
      modelName: 'Робот в броне',
      baseAzimuth: 20,
      basePolar: 75,
      baseRadius: '105%',
      baseFov: '32deg',
      baseTarget: '-0.15m 0m 0m'
    };
  }

  // 2. Страница расчетов стоимости и калькулятор: nqMEmOXd (robot armor-optimized - facing front)
  if (path.startsWith('/calculator')) {
    return {
      modelKey: 'nqMEmOXd',
      modelUrl: '/file/nqMEmOXd',
      modelName: 'Робот в броне',
      baseAzimuth: 20,
      basePolar: 75,
      baseRadius: '105%',
      baseFov: '32deg',
      baseTarget: '-0.15m 0m 0m'
    };
  }

  // 3. Страница админки /system-admin: rMpyhQ37 (Mini robot-optimized)
  if (path.startsWith('/system-admin') || path.startsWith('/admin')) {
    return {
      modelKey: 'rMpyhQ37',
      modelUrl: '/file/rMpyhQ37',
      modelName: 'Мини-робот',
      baseAzimuth: 15,
      basePolar: 76,
      baseRadius: '105%',
      baseFov: '32deg',
      baseTarget: '-0.15m 0m 0m'
    };
  }

  // 4. Партнерская программа и ИИ-Гренландия (/partner и подстраницы)
  if (
    path.startsWith('/partner') ||
    path.startsWith('/greenland') ||
    path.startsWith('/immigration') ||
    path.startsWith('/constitution')
  ) {
    return {
      modelKey: 'nqMEmOXd-partner',
      modelUrl: '/file/13/robot-armor-optimized.glb',
      modelName: 'Робот в броне',
      baseAzimuth: 20,
      basePolar: 75,
      baseRadius: '105%',
      baseFov: '32deg',
      baseTarget: '-0.15m 0m 0m'
    };
  }

  // 5. Страница /ai-seller и последующие: IgenMnhJ (steampunk head-optimized)
  return {
    modelKey: 'IgenMnhJ',
    modelUrl: '/file/IgenMnhJ',
    modelName: 'Ядро ИИ',
    baseAzimuth: 10,
    basePolar: 78,
    baseRadius: '105%',
    baseFov: '28deg',
    baseTarget: '-0.1m 0m 0m'
  };
};

export default useRouteModel;
