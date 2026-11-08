import React, { useState, useEffect } from 'react';

// Check if running in Lovable preview/editor
const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname === '127.0.0.1'
);

// Get dev mode from localStorage
const getDevMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  const stored = localStorage.getItem('sav-dev-mode');
  if (stored !== null) return stored === 'true';
  return isLovablePreview;
};

export const DevModeToggle: React.FC = () => {
  const [isDevMode, setIsDevMode] = useState<boolean>(getDevMode);

  // Initialize localStorage if not set
  useEffect(() => {
    if (isLovablePreview && localStorage.getItem('sav-dev-mode') === null) {
      localStorage.setItem('sav-dev-mode', 'true');
      setIsDevMode(true);
    }
  }, []);

  const handleToggle = () => {
    const newValue = !isDevMode;
    localStorage.setItem('sav-dev-mode', String(newValue));
    setIsDevMode(newValue);
    // Reload to apply changes
    window.location.reload();
  };

  if (!isLovablePreview) return null;

  return (
    <button
      onClick={handleToggle}
      className={`fixed bottom-4 right-4 z-[100] px-3 py-2 rounded-lg text-xs font-mono transition-all duration-300 border shadow-lg ${
        isDevMode
          ? 'bg-green-500/20 border-green-500/50 text-green-400 hover:bg-green-500/30'
          : 'bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30'
      }`}
      title={isDevMode ? 'DEV Mode - кликните для PROD режима' : 'PROD Mode - кликните для DEV режима'}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${isDevMode ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
        <span>{isDevMode ? 'DEV' : 'PROD'}</span>
      </div>
    </button>
  );
};

export default DevModeToggle;