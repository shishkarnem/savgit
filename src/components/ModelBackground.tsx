import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouteModel } from '../hooks/useRouteModel';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          'auto-rotate'?: boolean;
          'auto-rotate-delay'?: string | number;
          'rotation-per-second'?: string;
          'camera-controls'?: boolean;
          'camera-orbit'?: string;
          'camera-target'?: string;
          'field-of-view'?: string;
          'shadow-intensity'?: string | number;
          'shadow-softness'?: string | number;
          exposure?: string | number;
          'interaction-prompt'?: string;
          'disable-zoom'?: boolean;
          'disable-pan'?: boolean;
          'disable-tap'?: boolean;
          'touch-action'?: string;
          loading?: 'auto' | 'lazy' | 'eager';
          reveal?: 'auto' | 'interaction' | 'manual';
          ar?: boolean;
        },
        HTMLElement
      >;
    }
  }
}

export interface ModelBackgroundProps {
  onModelLoaded?: () => void;
}

export const ModelBackground: React.FC<ModelBackgroundProps> = ({ onModelLoaded }) => {
  const modelConfig = useRouteModel();
  const mouseRef = useRef({ targetX: 0, targetY: 0, currentX: 0, currentY: 0 });
  const {
    modelKey,
    modelUrl,
    baseAzimuth,
    basePolar,
    baseRadius,
    baseFov,
    baseTarget
  } = modelConfig;

  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const modelViewerRef = useRef<HTMLElement | null>(null);
  const userOffsetAzimuth = useRef<number>(0);
  const [cameraOrbitStr, setCameraOrbitStr] = useState<string>(
    `${baseAzimuth}deg ${basePolar}deg ${baseRadius}`
  );
  const [containerTransform, setContainerTransform] = useState<string>('translate3d(0, 0, 0)');
  const isInteractingRef = useRef(false);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Inverted mouse parallax tracking with screen-wide range (desktop only to save mobile cpu)
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isInteractingRef.current || isMobile) return;
    const normX = (e.clientX / window.innerWidth) * 2 - 1; // -1 to 1
    const normY = (e.clientY / window.innerHeight) * 2 - 1;

    // Inverted tracking for natural head/torso turn towards user cursor
    mouseRef.current.targetX = -normX;
    mouseRef.current.targetY = -normY;
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      return () => window.removeEventListener('mousemove', handleMouseMove);
    }
  }, [handleMouseMove, isMobile]);

  useEffect(() => {
    let active = true;

    const loop = (timestamp: number) => {
      if (!active) return;

      // Mobile FPS throttling (30fps) for smooth buttery performance without overheating
      if (isMobile) {
        if (timestamp - lastTimeRef.current < 33.33) {
          animFrameRef.current = requestAnimationFrame(loop);
          return;
        }
        lastTimeRef.current = timestamp;
      }

      if (!isInteractingRef.current) {
        // Snappy lerp damping for agile, immediate response
        mouseRef.current.currentX += (mouseRef.current.targetX - mouseRef.current.currentX) * 0.075;
        mouseRef.current.currentY += (mouseRef.current.targetY - mouseRef.current.currentY) * 0.075;

        const curX = mouseRef.current.currentX;
        const curY = mouseRef.current.currentY;

        // Angular reaction
        const computedAzimuth = baseAzimuth + userOffsetAzimuth.current + curX * 48;
        const computedPolar = Math.min(94, Math.max(52, basePolar + curY * 24));

        setCameraOrbitStr(`${computedAzimuth.toFixed(2)}deg ${computedPolar.toFixed(2)}deg ${baseRadius}`);

        // Parallax translation
        const transX = curX * (isMobile ? -15 : -35);
        const transY = curY * (isMobile ? -10 : -25);
        const scale = 1 + (Math.abs(curX) + Math.abs(curY)) * (isMobile ? 0.01 : 0.025);

        setContainerTransform(`translate3d(${transX.toFixed(2)}px, ${transY.toFixed(2)}px, 0) scale(${scale.toFixed(3)})`);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      active = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [baseAzimuth, basePolar, baseRadius, isMobile]);

  const effectiveModelUrl =
    (typeof window !== 'undefined' && (
      window.__SAV_MODEL_BLOBS?.[modelUrl] ||
      (modelUrl === '/file/12/robot-full-optimized.glb' ? window.__SAV_MODEL_BLOBS?.['/file/12/robot-full-optimized.glb'] : undefined) ||
      (modelUrl === '/file/biH5cJqb' ? window.__SAV_MODEL_BLOBS?.['/file/12/robot-full-optimized.glb'] : undefined)
    )) || modelUrl;

  const handleViewerLoad = useCallback(() => {
    setIsLoaded(true);
    if (onModelLoaded) {
      onModelLoaded();
    }
  }, [onModelLoaded]);

  // If no 3D model is configured for the current route (e.g. partner / greenland pages)
  useEffect(() => {
    if (!effectiveModelUrl || modelKey === 'none') {
      if (onModelLoaded) {
        onModelLoaded();
      }
    }
  }, [effectiveModelUrl, modelKey, onModelLoaded]);

  // Ensure onModelLoaded triggers reliably when WebGL mesh is ready or within safe timing window
  useEffect(() => {
    if (!effectiveModelUrl || modelKey === 'none') return;
    userOffsetAzimuth.current = 0;
    const el = modelViewerRef.current as any;

    if (el) {
      if (el.loaded || el.modelIsVisible) {
        handleViewerLoad();
      }
      el.addEventListener('load', handleViewerLoad);
      el.addEventListener('error', handleViewerLoad);
    }

    const checkInterval = setInterval(() => {
      const viewer = modelViewerRef.current as any;
      if (viewer && (viewer.loaded || viewer.modelIsVisible)) {
        handleViewerLoad();
        clearInterval(checkInterval);
      }
    }, 150);

    // Guaranteed visibility timer (1200ms) ensures model is never left invisible
    const safetyTimer = setTimeout(() => {
      clearInterval(checkInterval);
      handleViewerLoad();
    }, 1200);

    return () => {
      clearInterval(checkInterval);
      clearTimeout(safetyTimer);
      if (el) {
        el.removeEventListener('load', handleViewerLoad);
        el.removeEventListener('error', handleViewerLoad);
      }
    };
  }, [handleViewerLoad, modelKey]);

  if (!effectiveModelUrl || modelKey === 'none') {
    return null;
  }

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none z-[1] overflow-hidden select-none transition-opacity duration-700"
      style={{ opacity: isLoaded ? 1 : 0 }}
      aria-hidden="true"
    >
      {/* 3D Model Holographic Stage with dynamic parallax spatial translation */}
      <div 
        className="absolute right-0 top-0 bottom-0 w-full sm:w-[50vw] md:w-[44vw] lg:w-[40vw] xl:w-[36vw] h-full flex items-center justify-center pointer-events-auto will-change-transform"
        style={{
          transform: containerTransform,
          // Strong Radial Gradient transparency towards model edges to blend seamlessly into background
          maskImage: 'radial-gradient(ellipse 70% 75% at 52% 48%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 88%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 75% at 52% 48%, rgba(0,0,0,1) 25%, rgba(0,0,0,0.65) 55%, rgba(0,0,0,0) 88%)'
        }}
      >
        <model-viewer
          ref={modelViewerRef as any}
          key={modelKey}
          src={effectiveModelUrl}
          auto-rotate
          rotation-per-second="16deg"
          auto-rotate-delay="1000"
          camera-controls
          interaction-prompt="none"
          shadow-intensity="1.5"
          shadow-softness="0.8"
          camera-orbit={cameraOrbitStr}
          camera-target={baseTarget}
          field-of-view={baseFov}
          disable-zoom
          disable-pan
          reveal="auto"
          exposure="1.2"
          loading="eager"
          touch-action="pan-y"
          onMouseDown={() => { isInteractingRef.current = true; }}
          onMouseUp={() => { setTimeout(() => { isInteractingRef.current = false; }, 1200); }}
          onTouchStart={() => { isInteractingRef.current = true; }}
          onTouchEnd={() => { setTimeout(() => { isInteractingRef.current = false; }, 1200); }}
          className="w-full h-full transition-all duration-200"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: 'transparent',
            opacity: 0.65,
            filter: 'sepia(45%) saturate(145%) hue-rotate(-15deg) contrast(110%) brightness(108%) drop-shadow(0 0 35px rgba(245, 158, 11, 0.5)) drop-shadow(0 20px 45px rgba(0, 0, 0, 0.9))'
          }}
        />
        
        {/* Subtle Golden Ambient Aura Behind Model */}
        <div className="absolute inset-0 bg-gradient-to-t from-amber-500/15 via-amber-400/5 to-transparent pointer-events-none rounded-full blur-3xl opacity-50" />
      </div>
    </div>
  );
};

export default ModelBackground;
