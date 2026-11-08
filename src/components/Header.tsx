import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { BrandLogo } from '@/components/BrandLogo';
import { LogIn, Store, Handshake, Activity, Calculator, Layers } from 'lucide-react';

interface HeaderProps {
  onLogoClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onLogoClick }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMarketplace = location.pathname.startsWith('/marketplace');
  const isPartner = location.pathname.startsWith('/partner') || location.pathname.startsWith('/greenland');
  const isPlans = location.pathname.startsWith('/ai-seller/plans');
  const isCalculator = location.pathname.startsWith('/calculator');
  const { profile, isTelegramWebApp, authToken } = useTelegramAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Check if user has begun configuring an AI application in the calculator
  const [activeCalculatorRoute, setActiveCalculatorRoute] = useState<string | null>(() => {
    try {
      const raw = sessionStorage.getItem('sav-calculator-data') || localStorage.getItem('sav_calculator_data');
      const tz = sessionStorage.getItem('sav-calculator-tz') || sessionStorage.getItem('sav-calculator-dictation');
      const comp = sessionStorage.getItem('sav-company-name') || sessionStorage.getItem('sav-project-name');

      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && (parsed.company || parsed.product || parsed.functionality || parsed.contactValue || parsed.step)) {
          if (parsed.step === 'step3' || parsed.step === '3') return '/calculator/step3';
          if (parsed.step === 'step2' || parsed.step === '2') return '/calculator/step2';
          return '/calculator/step1';
        }
      }
      if (tz || comp) return '/calculator/step1';
    } catch {}
    return null;
  });

  const [hasCalculatedTariffs, setHasCalculatedTariffs] = useState<boolean>(() => {
    try {
      const plansStr = sessionStorage.getItem('sav-enhanced-plans') || sessionStorage.getItem('sav-plans');
      if (plansStr) {
        const parsed = JSON.parse(plansStr);
        return Array.isArray(parsed) && parsed.length > 0;
      }
    } catch {}
    return false;
  });

  useEffect(() => {
    const check = () => {
      try {
        const plansStr = sessionStorage.getItem('sav-enhanced-plans') || sessionStorage.getItem('sav-plans');
        if (plansStr) {
          const parsed = JSON.parse(plansStr);
          setHasCalculatedTariffs(Array.isArray(parsed) && parsed.length > 0);
        } else {
          setHasCalculatedTariffs(false);
        }

        const raw = sessionStorage.getItem('sav-calculator-data') || localStorage.getItem('sav_calculator_data');
        const tz = sessionStorage.getItem('sav-calculator-tz') || sessionStorage.getItem('sav-calculator-dictation');
        const comp = sessionStorage.getItem('sav-company-name') || sessionStorage.getItem('sav-project-name');

        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && (parsed.company || parsed.product || parsed.functionality || parsed.contactValue || parsed.step)) {
            if (parsed.step === 'step3' || parsed.step === '3') {
              setActiveCalculatorRoute('/calculator/step3');
            } else if (parsed.step === 'step2' || parsed.step === '2') {
              setActiveCalculatorRoute('/calculator/step2');
            } else {
              setActiveCalculatorRoute('/calculator/step1');
            }
            return;
          }
        }
        if (tz || comp) {
          setActiveCalculatorRoute('/calculator/step1');
          return;
        }
        setActiveCalculatorRoute(null);
      } catch {}
    };

    check();
    window.addEventListener('storage', check);
    return () => window.removeEventListener('storage', check);
  }, [location.pathname]);
  
  const isAuthenticated = !!profile || !!authToken || isTelegramWebApp;

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      navigate('/');
    }
  };

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <header className="w-full max-w-7xl mb-6 flex justify-between items-center bg-transparent px-1 sm:px-2 py-2 border-0 ring-0 shadow-none relative z-30">
        {/* Logo - Left with pulsing glowing shadow */}
        <BrandLogo
          onClick={handleLogoClick}
          showText
          title={isPartner ? 'ИИ-Гренландия' : 'SAV AI'}
          subtext={isPartner ? 'Цифровое государство партнёров' : 'Платформа ИИ-агентов и автоматизации бизнеса'}
          logoSrc={isPartner ? '/file/36/gerb.png' : '/file/16/logo.png'}
          imageClassName={isPartner ? 'partner-logo-filter' : ''}
        />

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {activeCalculatorRoute && (
            <button
              onClick={() => navigate(activeCalculatorRoute)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                isCalculator
                  ? 'liquid-bubble-gold text-stone-950 font-bold'
                  : 'liquid-bubble-secondary text-amber-100 hover:text-white border border-amber-400/35 shadow-[0_0_12px_rgba(231,199,104,0.25)]'
              }`}
              title="Перейти к расчету ИИ-приложения (текущий шаг)"
            >
              <span className="liquid-bubble-glare" />
              <Layers className={`w-4 h-4 relative z-10 ${isCalculator ? 'text-stone-950' : 'text-amber-300'}`} />
              <span className="relative z-10">Приложение</span>
            </button>
          )}

          {hasCalculatedTariffs && (
            <button
              onClick={() => navigate('/ai-seller/plans')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
                isPlans
                  ? 'liquid-bubble-gold text-stone-950 font-bold'
                  : 'liquid-bubble-secondary text-amber-100 hover:text-white'
              }`}
              title="Готовый расчет тарифов и архитектуры"
            >
              <span className="liquid-bubble-glare" />
              <Calculator className={`w-4 h-4 relative z-10 ${isPlans ? 'text-stone-950' : 'text-amber-300'}`} />
              <span className="hidden sm:inline relative z-10">Расчет</span>
            </button>
          )}

          <button
            onClick={() => navigate('/marketplace')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
              isMarketplace
                ? 'liquid-bubble-gold text-stone-950 font-bold'
                : 'liquid-bubble-secondary text-amber-100 hover:text-white'
            }`}
            title="Каталог готовых ИИ-решений и агентов"
          >
            <span className="liquid-bubble-glare" />
            <Store className={`w-4 h-4 relative z-10 ${isMarketplace ? 'text-stone-950' : 'text-amber-300'}`} />
            <span className="hidden sm:inline relative z-10">ИИ-Маркетплейс</span>
          </button>

          <button
            onClick={() => navigate('/partner')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden ${
              isPartner
                ? 'liquid-bubble-gold text-stone-950 font-bold'
                : 'liquid-bubble-secondary text-amber-100 hover:text-white'
            }`}
            title="Партнёрская экосистема Greenland AI"
          >
            <span className="liquid-bubble-glare" />
            <Handshake className={`w-4 h-4 relative z-10 ${isPartner ? 'text-stone-950' : 'text-amber-300'}`} />
            <span className="hidden sm:inline relative z-10">Партнёрам</span>
          </button>
        </div>
      </header>
    </>
  );
};

export default Header;