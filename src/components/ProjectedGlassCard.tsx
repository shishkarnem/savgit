import React, { useRef, useEffect, useState, useId } from 'react';

interface ProjectedGlassCardProps {
  children: React.ReactNode;
  className?: string;
  intensity?: number;
  depth?: number;
  baseTiltX?: number; // Base tilt in perspective (e.g. forward inclined console)
  transformOrigin?: string;
}

const FPS = 30;
const FRAME_MIN_INTERVAL = 1000 / FPS; // ~33.33ms for strictly optimized 30 FPS

export const ProjectedGlassCard: React.FC<ProjectedGlassCardProps> = ({
  children,
  className = '',
  intensity = 1,
  depth = 12,
  baseTiltX = 0,
  transformOrigin = 'center center'
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  
  // Seed per card instance for natural organic variation
  const instanceSeedRef = useRef<number>(
    Math.abs(
      rawId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % 100
    ) / 100
  );

  const [transformStyle, setTransformStyle] = useState<string>(
    `perspective(1400px) rotateX(${baseTiltX}deg) rotateY(0deg) translate3d(0, 0, 0)`
  );

  // Mouse & card tracking state
  const stateRef = useRef({
    targetRotX: 0,
    targetRotY: 0,
    targetTransX: 0,
    targetTransY: 0,
    currentRotX: 0,
    currentRotY: 0,
    currentTransX: 0,
    currentTransY: 0,
    isHovering: false,
    lastScrollY: 0,
    scrollTilt: 0,
    targetScrollTilt: 0,
    randomDir: instanceSeedRef.current > 0.5 ? 1 : -1
  });

  const lastFrameTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    // Direct card mouse move for precise corner tilt parallax
    const handleCardMouseMove = (e: MouseEvent) => {
      const rect = cardEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      // Local normalized coordinates from -1 to 1 across card surface
      const localX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const localY = ((e.clientY - rect.top) / rect.height) * 2 - 1;

      stateRef.current.isHovering = true;
      // Dynamic corner tilt angles
      const maxTilt = 4.8 * intensity;
      stateRef.current.targetRotX = -localY * maxTilt;
      stateRef.current.targetRotY = localX * maxTilt;
      stateRef.current.targetTransX = localX * 4 * intensity;
      stateRef.current.targetTransY = localY * 3 * intensity;
    };

    const handleCardMouseLeave = () => {
      stateRef.current.isHovering = false;
      // Reset smoothly towards subtle ambient viewport tracking
      stateRef.current.targetRotX = 0;
      stateRef.current.targetRotY = 0;
      stateRef.current.targetTransX = 0;
      stateRef.current.targetTransY = 0;
    };

    // Ambient window mouse movement when not hovering this specific card directly
    const handleWindowMouseMove = (e: MouseEvent) => {
      if (stateRef.current.isHovering) return;
      const { innerWidth, innerHeight } = window;
      const normX = (e.clientX / innerWidth) * 2 - 1;
      const normY = (e.clientY / innerHeight) * 2 - 1;

      // Soft ambient tilt across the cockpit view
      const ambientTilt = 2.0 * intensity;
      stateRef.current.targetRotX = -normY * ambientTilt;
      stateRef.current.targetRotY = normX * ambientTilt;
      stateRef.current.targetTransX = normX * 3 * intensity;
      stateRef.current.targetTransY = normY * 2 * intensity;
    };

    // Mobile scroll parallax
    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const deltaY = scrollY - stateRef.current.lastScrollY;
      stateRef.current.lastScrollY = scrollY;

      const rawVel = Math.max(-25, Math.min(25, deltaY));
      const cardVariance = 0.85 + instanceSeedRef.current * 0.3;
      const dir = stateRef.current.randomDir;

      stateRef.current.targetScrollTilt = -rawVel * 0.3 * intensity * cardVariance * dir;
    };

    cardEl.addEventListener('mousemove', handleCardMouseMove, { passive: true });
    cardEl.addEventListener('mouseleave', handleCardMouseLeave, { passive: true });
    window.addEventListener('mousemove', handleWindowMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    let active = true;

    const animate = (timestamp: number) => {
      if (!active) return;

      // Throttle strictly to 30 FPS to maintain optimal CPU/GPU budget and zero jitter
      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed >= FRAME_MIN_INTERVAL) {
        lastFrameTimeRef.current = timestamp - (elapsed % FRAME_MIN_INTERVAL);

        const isDesktop = window.innerWidth >= 768;
        const s = stateRef.current;

        if (isDesktop) {
          // Fast, responsive lerp (0.1) so click targets and visuals move in perfect sync
          const lerp = 0.1;
          s.currentRotX += (s.targetRotX - s.currentRotX) * lerp;
          s.currentRotY += (s.targetRotY - s.currentRotY) * lerp;
          s.currentTransX += (s.targetTransX - s.currentTransX) * lerp;
          s.currentTransY += (s.targetTransY - s.currentTransY) * lerp;

          const totalRotX = baseTiltX + s.currentRotX;
          const totalRotY = s.currentRotY;

          setTransformStyle(
            `perspective(1400px) translate3d(${s.currentTransX.toFixed(2)}px, ${s.currentTransY.toFixed(2)}px, 0px) rotateX(${totalRotX.toFixed(2)}deg) rotateY(${totalRotY.toFixed(2)}deg)`
          );
        } else {
          // Mobile scroll tilt
          s.targetScrollTilt *= 0.88;
          s.scrollTilt += (s.targetScrollTilt - s.scrollTilt) * 0.12;

          const rotX = baseTiltX + s.scrollTilt;
          const rotY = s.scrollTilt * 0.15;

          setTransformStyle(
            `perspective(1400px) translate3d(0px, 0px, 0px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg)`
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      cardEl.removeEventListener('mousemove', handleCardMouseMove);
      cardEl.removeEventListener('mouseleave', handleCardMouseLeave);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [intensity, depth, baseTiltX]);

  return (
    <div
      ref={cardRef}
      className={`relative z-10 will-change-transform ${className}`}
      style={{
        transform: transformStyle,
        transformOrigin,
        WebkitFontSmoothing: 'antialiased',
        MozOsxFontSmoothing: 'grayscale',
        textRendering: 'optimizeLegibility'
      }}
    >
      {children}
    </div>
  );
};

export default ProjectedGlassCard;
