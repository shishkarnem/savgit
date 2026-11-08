import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Language, Theme } from '@/types';
import { Plane, BookOpen, UserCircle, Home, Sun, Moon, ArrowLeft, LogIn, LogOut, Shield } from 'lucide-react';
import { IMAGES } from '@/greenlandConstants';
import { TelegramProfile } from '@/hooks/useTelegramUser';
import { protalkDb } from '@/integrations/protalk/client';

interface NavigationProps {
  lang: Language;
  toggleLang: () => void;
  theme: Theme;
  toggleTheme: () => void;
  t: (key: string) => string;
  tgProfile?: TelegramProfile | null;
}

const AVATAR_CACHE_KEY = 'gl_avatar_cache';

function useCachedAvatar(photoUrl: string | null | undefined) {
  const [cachedSrc, setCachedSrc] = useState<string | null>(() => {
    return localStorage.getItem(AVATAR_CACHE_KEY) || null;
  });

  useEffect(() => {
    if (!photoUrl) return;
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (cached) {
      setCachedSrc(cached);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 64, 64);
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        localStorage.setItem(AVATAR_CACHE_KEY, dataUrl);
        setCachedSrc(dataUrl);
      } catch {}
    };
    img.src = photoUrl;
  }, [photoUrl]);

  useEffect(() => {
    if (!photoUrl) return;
    const cached = localStorage.getItem(AVATAR_CACHE_KEY);
    if (!cached) setCachedSrc(null);
  }, [photoUrl]);

  return cachedSrc || photoUrl;
}

export const Navigation: React.FC<NavigationProps> = ({ lang, toggleLang, theme, toggleTheme, t, tgProfile }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname;
  const avatarSrc = useCachedAvatar(tgProfile?.photo_url);

  const isPartner = location.pathname.startsWith('/partner');
  const isGreenland = location.pathname.startsWith('/greenland');
  const basePath = isPartner ? '/partner' : isGreenland ? '/greenland' : '/greenland';

  const [isRegistered, setIsRegistered] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sav_user_logged_out') === 'true') {
      return false;
    }
    return localStorage.getItem('sav_partner_registered') === 'true' ||
      Boolean(localStorage.getItem('sav_user_profile')) ||
      Boolean(localStorage.getItem('sav_auth_token'));
  });

  useEffect(() => {
    const checkPartnerStatus = async () => {
      // If user explicitly logged out, never auto-restore session
      if (localStorage.getItem('sav_user_logged_out') === 'true') {
        setIsRegistered(false);
        return;
      }

      // Check stored token or user profile first
      const storedToken = localStorage.getItem('sav_auth_token');
      const storedProfile = localStorage.getItem('sav_user_profile');
      if (storedToken || storedProfile) {
        setIsRegistered(true);
        return;
      }

      if (localStorage.getItem('sav_partner_registered') === 'true') {
        setIsRegistered(true);
        return;
      }

      const tgId = tgProfile?.telegram_id || localStorage.getItem('gl_tg_id');
      const tgUser = tgProfile?.username ? `@${tgProfile.username.replace('@', '')}` : null;

      if (tgId || tgUser) {
        try {
          if (tgId) {
            const { data } = await protalkDb
              .from('partners')
              .select('id')
              .eq('partner_code', String(tgId))
              .limit(1);
            if (data && data.length > 0) {
              setIsRegistered(true);
              localStorage.setItem('sav_partner_registered', 'true');
              return;
            }
          }
          if (tgUser) {
            const { data } = await protalkDb
              .from('partners')
              .select('id')
              .eq('telegram', tgUser)
              .limit(1);
            if (data && data.length > 0) {
              setIsRegistered(true);
              localStorage.setItem('sav_partner_registered', 'true');
              return;
            }
          }
        } catch (err) {
          console.warn('Check partner registration status error:', err);
        }
      }
    };

    checkPartnerStatus();

    const onRegistered = () => {
      localStorage.removeItem('sav_user_logged_out');
      setIsRegistered(true);
    };
    const onLoggedOut = () => {
      setIsRegistered(false);
    };

    window.addEventListener('partner-registered', onRegistered);
    window.addEventListener('partner-login', onRegistered);
    window.addEventListener('partner-logout', onLoggedOut);
    window.addEventListener('storage', checkPartnerStatus);
    return () => {
      window.removeEventListener('partner-registered', onRegistered);
      window.removeEventListener('partner-login', onRegistered);
      window.removeEventListener('partner-logout', onLoggedOut);
      window.removeEventListener('storage', checkPartnerStatus);
    };
  }, [tgProfile]);

  const navItems = [
    { path: `${basePath}`, label: lang === 'ru' ? 'Страна' : 'УПЧК', icon: Home },
    { path: `${basePath}/immigration`, label: lang === 'ru' ? 'Иммиграция' : 'Въезд', icon: Plane },
    { path: `${basePath}/constitution`, label: lang === 'ru' ? 'Законы' : 'Законы', icon: BookOpen },
  ];

  const canGoBack = currentPath !== basePath && currentPath !== '/partner' && currentPath !== '/';

  return (
    <div className="w-full liquid-bubble-plate border border-amber-400/35 rounded-2xl p-2.5 sm:p-3.5 shadow-xl flex flex-wrap items-center justify-between gap-3 relative overflow-hidden backdrop-blur-xl">
      <span className="liquid-bubble-glare" />

      {/* Left: Back Button, Emblem, Cabinet Button, Language Toggle & Logout */}
      <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap relative z-10">
        {canGoBack && (
          <button
            onClick={() => navigate(-1)}
            className="liquid-bubble-secondary p-2.5 rounded-xl text-amber-300 hover:text-amber-200 border border-amber-400/30 hover:border-amber-300 relative overflow-hidden transition-all text-sm hover:scale-105 active:scale-95 cursor-pointer"
            title="Назад"
          >
            <span className="liquid-bubble-glare" />
            <ArrowLeft size={18} className="relative z-10" />
          </button>
        )}

        <div
          className="relative w-8 h-8 md:w-9 md:h-9 flex-shrink-0 cursor-pointer group"
          onClick={() => navigate(basePath)}
          title="На главную"
        >
          <img
            src={IMAGES.LOGO || IMAGES.GERB || '/file/36/gerb.png'}
            alt="Герб"
            className="w-full h-full object-contain partner-gold-sepia-filter transition-transform group-hover:scale-105 duration-300"
            onError={(e) => {
              const target = e.currentTarget as HTMLImageElement;
              if (!target.src.includes('/file/31/gerb.png')) {
                target.src = '/file/31/gerb.png';
              }
            }}
          />
        </div>

        {/* Cabinet / Login Button */}
        {isRegistered ? (
          <button
            onClick={() => navigate(`${basePath}/profile`)}
            className="liquid-bubble-gold text-amber-950 px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border border-amber-300 shadow-md hover:scale-[1.02] active:scale-95 cursor-pointer"
            title="Личный кабинет"
          >
            <span className="liquid-bubble-glare" />
            {avatarSrc ? (
              <img src={avatarSrc} alt="Профиль" className="w-5 h-5 rounded-full object-cover relative z-10 border border-amber-950/20 partner-gold-sepia-filter" />
            ) : (
              <UserCircle size={17} className="relative z-10 text-amber-950" />
            )}
            <span className="relative z-10 font-bold">Кабинет</span>
          </button>
        ) : (
          <button
            onClick={() => navigate(`${basePath}/immigration?tab=login`)}
            className="liquid-bubble-gold text-amber-950 px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 relative overflow-hidden transition-all duration-300 shadow-md border border-amber-300 hover:scale-[1.02] active:scale-95 cursor-pointer"
            title="Вход в партнёрский кабинет"
          >
            <span className="liquid-bubble-glare" />
            <LogIn size={16} className="relative z-10 text-amber-950" />
            <span className="relative z-10 font-bold">Вход</span>
          </button>
        )}

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="liquid-bubble-secondary border border-amber-400/40 text-amber-300 hover:text-amber-200 px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 relative overflow-hidden transition-all duration-300 shadow-md hover:border-amber-300 hover:scale-[1.02] active:scale-95 cursor-pointer"
          title="Переключить язык"
        >
          <span className="liquid-bubble-glare" />
          <span className="relative z-10">{lang === 'ru' ? 'RU 🇷🇺' : '☢️ УПЧК'}</span>
        </button>

        {/* Logout (if logged in) */}
        {isRegistered && (
          <button
            onClick={() => {
              localStorage.setItem('sav_user_logged_out', 'true');
              localStorage.removeItem('sav_auth_token');
              localStorage.removeItem('sav_user_profile');
              localStorage.removeItem('sav_partner_registered');
              localStorage.removeItem('gl_tg_id');
              localStorage.removeItem('sav_partner_code');
              localStorage.removeItem('sav_user_role');
              localStorage.removeItem(AVATAR_CACHE_KEY);
              setIsRegistered(false);
              window.dispatchEvent(new Event('partner-logout'));
              navigate(`${basePath}/immigration?tab=login`);
            }}
            className="liquid-bubble-secondary p-2 rounded-xl text-zinc-400 hover:text-amber-300 border border-white/10 hover:border-amber-400/30 text-sm cursor-pointer transition-all"
            title="Выйти из кабинета"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>

      {/* Right / Navigation Tabs: 3D Glass Gradient Buttons */}
      <div className="flex items-center gap-2 flex-wrap relative z-10">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.path === basePath && (currentPath === basePath || currentPath === '/partner'));
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`px-3.5 py-2 rounded-xl flex items-center gap-2 relative overflow-hidden transition-all duration-300 text-sm cursor-pointer hover:scale-[1.02] active:scale-95 ${
                isActive
                  ? 'liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.45)]'
                  : 'liquid-bubble-secondary text-zinc-200 hover:text-white border border-white/10 hover:border-amber-400/40 font-medium'
              }`}
            >
              <span className="liquid-bubble-glare" />
              <Icon size={16} className={`relative z-10 ${isActive ? 'text-amber-950' : 'text-amber-400'}`} />
              <span className="relative z-10 font-semibold">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
