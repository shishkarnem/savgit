import React, { useState, useEffect } from 'react';
import { InterlockingGears } from './InterlockingGears';
import { RealisticSmokeBackdrop } from './RealisticSmokeBackdrop';

const PC_BACKGROUND_URL = '/file/9/steamcity.png';
const MOBILE_BACKGROUND_URL = '/file/10/steamcitymobile.png';
const OFFICIAL_LOGO_URL = '/file/16/logo.png';
const PARTNER_GERB_URL = '/file/36/gerb.png';

interface BootLoaderProps {
  bootProgress: number;
  bootStatus?: string;
}

export const BootLoader: React.FC<BootLoaderProps> = ({ bootProgress }) => {
  const [altIndex, setAltIndex] = useState(0);

  const isPartnerRoute = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/partner') ||
    window.location.pathname.startsWith('/greenland')
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setAltIndex((prev) => (prev === 0 ? 1 : 0));
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  const alternatingText = altIndex === 0 ? 'Загрузка приложения...' : 'Загрузка ресурсов...';
  const logoUrl = isPartnerRoute ? PARTNER_GERB_URL : OFFICIAL_LOGO_URL;

  return (
    <div
      id="app-bootloader-overlay"
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4 sm:p-6 select-none bg-black overflow-hidden"
    >
      {/* Background image for PC */}
      <img
        src={PC_BACKGROUND_URL}
        alt=""
        referrerPolicy="no-referrer"
        className="hidden md:block absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
      />

      {/* Background image for Mobile */}
      <img
        src={MOBILE_BACKGROUND_URL}
        alt=""
        referrerPolicy="no-referrer"
        className="block md:hidden absolute inset-0 w-full h-full object-cover object-center pointer-events-none select-none z-0"
      />

      {/* Transparent dark overlay with Apple Liquid Glass aesthetic */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[3px] pointer-events-none z-[1]" />

      {/* Ambient gold glow */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-amber-500/15 blur-[140px] pointer-events-none z-[2]" />

      {/* External transparent container, internal transparent with darkening (Apple Liquid Glass) */}
      <div className="relative z-10 w-full max-w-lg p-6 sm:p-8 rounded-3xl bg-black/65 backdrop-blur-2xl border border-amber-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex flex-col items-center text-center overflow-hidden">
        {/* Animated smoke effect with transparent background behind texts */}
        <RealisticSmokeBackdrop
          speed="normal"
          opacity={0.45}
          variant="amber"
          className="absolute inset-0 pointer-events-none z-0"
        />

        {/* Brand Logo from specified URL */}
        <div className="relative z-10 flex flex-col items-center mb-3">
          <div className="w-24 h-24 relative flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 blur-xl animate-pulse" />
            <img
              src={logoUrl}
              alt={isPartnerRoute ? "Герб ИИ-Гренландии" : "SAV AI"}
              referrerPolicy="no-referrer"
              className={`w-20 h-20 object-contain relative z-10 ${
                isPartnerRoute
                  ? 'partner-gerb-filter drop-shadow-[0_0_20px_rgba(245,158,11,0.55)]'
                  : 'filter drop-shadow-[0_0_18px_rgba(231,199,104,0.7)]'
              }`}
            />
          </div>
        </div>

        {/* Central Interlocking Gears Animation with transparent background */}
        <div className="relative z-10 my-2 flex items-center justify-center">
          <InterlockingGears size={150} className="filter drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]" />
        </div>

        {/* System Title with Gold Gradient (Liquid Glass Apple) */}
        <div className="relative z-10 mt-3 mb-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-400 bg-clip-text text-transparent">
            Инициализация компонентов платформы
          </h2>
        </div>

        {/* Alternating Status text strictly switching between 'Загрузка приложения...' and 'Загрузка ресурсов...' */}
        <div className="relative z-10 my-3 min-h-[44px] flex items-center justify-center w-full">
          <p className="text-stone-200 text-sm sm:text-base leading-relaxed tracking-normal font-medium transition-opacity duration-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
            {alternatingText}
          </p>
        </div>

        {/* Liquid Glass Apple Progress Track */}
        <div className="relative z-10 w-full max-w-md h-3.5 bg-black/60 rounded-full overflow-hidden border border-amber-400/30 p-0.5 backdrop-blur-xl shadow-inner mb-2">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-600 via-amber-400 to-yellow-200 transition-all duration-300 ease-out shadow-[0_0_15px_rgba(212,175,55,0.6)]"
            style={{ width: `${Math.min(100, Math.max(0, bootProgress))}%` }}
          />
        </div>

        {/* Progress percentage label - min text size 14px */}
        <div className="relative z-10 flex justify-end w-full max-w-md text-sm text-stone-300 font-mono px-1">
          <span className="text-amber-300 font-semibold">{bootProgress}%</span>
        </div>
      </div>
    </div>
  );
};

export default BootLoader;
