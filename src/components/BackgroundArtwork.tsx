import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getStorageFile } from '../utils/fileStorage';

const FPS = 30;
const FRAME_MIN_INTERVAL = 1000 / FPS; // ~33.33ms

interface BackgroundArtworkProps {
  onReady?: () => void;
}

export const BackgroundArtwork: React.FC<BackgroundArtworkProps> = ({ onReady }) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const [videoLoaded, setVideoLoaded] = useState<boolean>(false);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const readyNotifiedRef = useRef<boolean>(false);

  const mouseRef = useRef({
    targetY: 0,
    currentY: 0,
    targetX: 0,
    currentX: 0,
    scrollProgress: 0,
    curScrollProgress: 0
  });

  // Minimal base scale to maximize visible area and prevent aggressive cropping
  const [bgTransform, setBgTransform] = useState<string>('scale(1.03) translate3d(0, 0, 0)');
  const lastFrameTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // When video data is ready, notify parent
  const notifyReady = useCallback(() => {
    if (!readyNotifiedRef.current) {
      readyNotifiedRef.current = true;
      setVideoLoaded(true);
      if (onReady) {
        onReady();
      }
    }
  }, [onReady]);

  // Device resize detection
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Direct canonical video stream URLs from file_storage
  const desktopVideoSrc = '/file/18/steamcity1080mini.mp4';
  const mobileVideoSrc = '/file/17/steammobile1080mini.mp4';
  const desktopPoster = '/file/9/steamcity.png';
  const mobilePoster = '/file/10/steamcitymobile.png';

  // Autostart video playback reliably with user gesture and event fallbacks
  useEffect(() => {
    const activeVideo = isMobile ? mobileVideoRef.current : desktopVideoRef.current;
    if (!activeVideo) return;

    activeVideo.muted = true;
    activeVideo.defaultMuted = true;
    activeVideo.playsInline = true;
    activeVideo.setAttribute('playsinline', 'true');
    activeVideo.setAttribute('webkit-playsinline', 'true');

    const tryPlay = () => {
      if (!activeVideo) return;
      activeVideo.muted = true;
      const playPromise = activeVideo.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            notifyReady();
          })
          .catch(() => {
            // Wait for user gesture or next frame
          });
      }
    };

    tryPlay();

    const onPlayEvent = () => notifyReady();
    activeVideo.addEventListener('playing', onPlayEvent);
    activeVideo.addEventListener('canplay', onPlayEvent);
    activeVideo.addEventListener('loadeddata', onPlayEvent);

    // Fast readiness fallback to avoid holding preloader if browser throttles video events
    const readyTimer = setTimeout(() => {
      notifyReady();
    }, 1000);

    const onUserInteraction = () => {
      tryPlay();
    };

    window.addEventListener('touchstart', onUserInteraction, { passive: true });
    window.addEventListener('click', onUserInteraction, { passive: true });
    window.addEventListener('scroll', onUserInteraction, { passive: true });

    return () => {
      clearTimeout(readyTimer);
      activeVideo.removeEventListener('playing', onPlayEvent);
      activeVideo.removeEventListener('canplay', onPlayEvent);
      activeVideo.removeEventListener('loadeddata', onPlayEvent);
      window.removeEventListener('touchstart', onUserInteraction);
      window.removeEventListener('click', onUserInteraction);
      window.removeEventListener('scroll', onUserInteraction);
    };
  }, [isMobile, notifyReady]);

  // Parallax animation loop
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isMobile) return;
      const normY = (e.clientY / window.innerHeight) * 2 - 1; // -1 to 1
      const normX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.targetY = normY;
      mouseRef.current.targetX = normX;
    };

    const handleScroll = () => {
      const scrollY = window.scrollY || document.documentElement.scrollTop;
      const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
      mouseRef.current.scrollProgress = progress;

      if (!isMobile) {
        const scrollNorm = progress * 2 - 1;
        mouseRef.current.targetY = (mouseRef.current.targetY + scrollNorm) * 0.5;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchmove', handleScroll, { passive: true });

    let active = true;

    const animate = (timestamp: number) => {
      if (!active) return;

      const elapsed = timestamp - lastFrameTimeRef.current;
      if (elapsed >= FRAME_MIN_INTERVAL) {
        lastFrameTimeRef.current = timestamp - (elapsed % FRAME_MIN_INTERVAL);

        if (isMobile) {
          // Minimal mobile parallax on scroll to preserve full frame
          mouseRef.current.curScrollProgress +=
            (mouseRef.current.scrollProgress - mouseRef.current.curScrollProgress) * 0.08;
          const p = mouseRef.current.curScrollProgress;

          const archScale = Math.sin(p * Math.PI) * 0.015;
          const scale = 1.02 + archScale;
          const transY = -p * 10;

          setBgTransform(`scale(${scale.toFixed(4)}) translate3d(0, ${transY.toFixed(2)}px, 0)`);
        } else {
          // Subtle desktop mouse and scroll parallax with minimal zoom
          mouseRef.current.currentY +=
            (mouseRef.current.targetY - mouseRef.current.currentY) * 0.05;
          mouseRef.current.currentX +=
            (mouseRef.current.targetX - mouseRef.current.currentX) * 0.05;

          const curY = mouseRef.current.currentY;
          const curX = mouseRef.current.currentX;

          const transY = curY * -8;
          const transX = curX * -8;
          const scale = 1.02 + Math.abs(curY) * 0.015 + Math.abs(curX) * 0.01;

          setBgTransform(
            `scale(${scale.toFixed(4)}) translate3d(${transX.toFixed(2)}px, ${transY.toFixed(2)}px, 0)`
          );
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleScroll);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isMobile]);

  return (
    <div
      className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden select-none z-0 bg-black"
      aria-hidden="true"
    >
      {/* Optimized viewport container minimizing cropping while keeping parallax smooth */}
      <div
        className="absolute -top-[12px] -left-[12px] w-[calc(100%+24px)] h-[calc(100%+24px)] will-change-transform transition-transform duration-100 ease-out"
        style={{
          transform: bgTransform,
          transformOrigin: 'center center'
        }}
      >
        {/* PC Desktop Background Video */}
        {!isMobile && (
          <video
            ref={desktopVideoRef}
            src={desktopVideoSrc}
            poster={desktopPoster}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={notifyReady}
            onPlaying={notifyReady}
            onLoadedData={notifyReady}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 opacity-100"
          >
            <source src={desktopVideoSrc} type="video/mp4" />
          </video>
        )}

        {/* Mobile Background Video */}
        {isMobile && (
          <video
            ref={mobileVideoRef}
            src={mobileVideoSrc}
            poster={mobilePoster}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onCanPlay={notifyReady}
            onPlaying={notifyReady}
            onLoadedData={notifyReady}
            className="absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 opacity-100"
          >
            <source src={mobileVideoSrc} type="video/mp4" />
          </video>
        )}

        {/* Liquid Glass Apple Ambient Darkening Layer for enhanced contrast and legibility */}
        <div className="absolute inset-0 bg-black/40 pointer-events-none" />
      </div>
    </div>
  );
};

export default BackgroundArtwork;
