import { useCallback } from 'react';

type SwipeDirection = 'left' | 'right' | 'down';

const VIBRATION_PATTERNS = {
  right: [50, 30, 100],
  left: [30, 20, 30],
  down: [20, 10, 20, 10, 20],
};

export const useSwipeFeedback = () => {
  const triggerVibration = useCallback((direction: SwipeDirection) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(VIBRATION_PATTERNS[direction]); } catch {}
    }
  }, []);

  const playSound = useCallback((_direction: SwipeDirection) => {
    // Sound disabled by user preference
  }, []);

  const triggerFeedback = useCallback((direction: SwipeDirection) => {
    triggerVibration(direction);
  }, [triggerVibration]);

  return { triggerFeedback, triggerVibration, playSound, isInitialized: true };
};

