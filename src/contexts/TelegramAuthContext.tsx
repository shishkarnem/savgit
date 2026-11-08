import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { UserProfile } from '@/types/user';
import { extractReferralFromUrl, resolveAndStoreReferral, getStoredReferralPromo } from '@/utils/referralHandler';

interface TelegramUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  is_premium?: boolean;
  language_code?: string;
  allows_write_to_pm?: boolean;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: TelegramUser;
          query_id?: string;
          auth_date?: number;
          hash?: string;
          start_param?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        requestContact?: (callback: (status: boolean, response?: any) => void) => void;
        requestLocation?: (callback: (status: boolean, response?: any) => void) => void;
      };
    };
  }
}

interface TelegramAuthContextType {
  telegramUser: TelegramUser | null;
  profile: UserProfile | null;
  isLoading: boolean;
  isNewUser: boolean;
  isTelegramWebApp: boolean;
  error: string | null;
  referralPromo: string | null;
  // Account Linking & Authentication methods
  showLinkEmailModal: boolean;
  setShowLinkEmailModal: (show: boolean) => void;
  linkEmailToAccount: (email: string, password?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  registerWithEmail: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  requestTelegramPhone: () => Promise<void>;
  requestTelegramLocation: () => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const TelegramAuthContext = createContext<TelegramAuthContextType | undefined>(undefined);

const isLovablePreview = typeof window !== 'undefined' && (
  window.location.hostname.includes('lovable.app') ||
  window.location.hostname.includes('lovableproject.com') ||
  window.location.hostname.includes('localhost') ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.includes('run.app') ||
  window.location.hostname.includes('googleusercontent.com')
);

const DEV_USER_PROFILE: UserProfile = {
  id: 'dev-user-001',
  telegram_id: 123456789,
  email: 'rentropexpert@gmail.com',
  first_name: 'Алексей',
  last_name: 'Шишканов',
  full_name: 'Алексей Шишканов (SAV AI Dev)',
  username: 'shishkarnem',
  photo_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=sav-ai-admin&backgroundColor=c4a052',
  profile_link: 'https://t.me/shishkarnem',
  is_premium: 1,
  language_code: 'ru',
  role: 'CITIZEN',
  balance: 150000.0,
  referral_reward_balance: 12500.0,
  referral_code: 'ref_123456789',
  referred_by: null,
  status: 'ACTIVE',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const TelegramAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [referralPromo, setReferralPromo] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('sav_referral_promo') || localStorage.getItem('sav_referral_promo') || null;
    }
    return null;
  });
  const [showLinkEmailModal, setShowLinkEmailModal] = useState(false);

  const isTelegramWebApp = typeof window !== 'undefined' && !!window.Telegram?.WebApp?.initData;
  const isDevMode = isLovablePreview && !isTelegramWebApp;

  // Helper to resolve referral parameter (partner telegram_id, partner_code, or promo)
  const resolveReferralCode = async (rawRef: string) => {
    if (!rawRef || !rawRef.trim()) return;
    const resolved = await resolveAndStoreReferral(rawRef);
    if (resolved) {
      setReferralPromo(resolved);
    }
  };

  // Refresh profile from BD ProTalk backend
  const refreshProfile = async () => {
    try {
      const token = localStorage.getItem('sav_auth_token');
      const tgId = profile?.telegram_id || telegramUser?.id;
      const url = token ? `/api/v1/auth/me?token=${token}` : (tgId ? `/api/v1/auth/me?telegram_id=${tgId}` : null);
      if (!url) return;

      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile) {
          setProfile(data.profile);
        }
      }
    } catch (e) {
      console.error('Error refreshing profile:', e);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      // 0. Check URL query parameters for referral (?ref169262990 or ?ref=169262990 or ?startapp=...)
      if (typeof window !== 'undefined') {
        const detectedRef = extractReferralFromUrl();
        if (detectedRef) {
          await resolveReferralCode(detectedRef);
        }
      }

      // 1. Check if token already exists in localStorage
      const savedToken = localStorage.getItem('sav_auth_token');
      if (savedToken) {
        try {
          const res = await fetch(`/api/v1/auth/me?token=${savedToken}`, {
            headers: { 'Authorization': `Bearer ${savedToken}` }
          });
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.profile) {
              setProfile(data.profile);
              if (data.profile.telegram_id) {
                setTelegramUser({
                  id: Number(data.profile.telegram_id),
                  first_name: data.profile.first_name,
                  last_name: data.profile.last_name,
                  username: data.profile.username,
                  photo_url: data.profile.photo_url
                });
              }
              setIsLoading(false);
              return;
            }
          }
        } catch (e) {
          console.warn('Session token verification failed, falling back to WebApp sync:', e);
        }
      }

      // 2. Running in Dev / Browser Preview without Telegram WebApp (do not auto-mock user)
      if (isDevMode && !isTelegramWebApp) {
        setProfile(null);
        setTelegramUser(null);
        setIsLoading(false);
        return;
      }

      // 3. Telegram WebApp Environment
      if (window.Telegram?.WebApp) {
        const tgWebApp = window.Telegram.WebApp;
        tgWebApp.ready();
        tgWebApp.expand();

        const rawInitData = tgWebApp.initData;
        const user = tgWebApp.initDataUnsafe?.user;
        const startParam = tgWebApp.initDataUnsafe?.start_param;

        if (startParam) {
          await resolveReferralCode(startParam);
        }

        if (user) {
          setTelegramUser(user);

          try {
            // Strict HMAC-SHA256 authentication via BD ProTalk Backend API
            const response = await fetch('/api/v1/auth/telegram-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                initData: rawInitData,
                telegramUser: user,
                referralCode: startParam || null
              })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.profile) {
                setProfile(data.profile);
                setIsNewUser(data.isNewUser || false);
                if (data.token) {
                  localStorage.setItem('sav_auth_token', data.token);
                }

                // If user is brand new and has NO email linked yet, prompt to link email
                const emailPromptDismissed = localStorage.getItem(`sav_email_prompt_dismissed_${user.id}`);
                if (!data.profile.email && !emailPromptDismissed) {
                  setShowLinkEmailModal(true);
                }

                setIsLoading(false);
                return;
              }
            }
          } catch (err: any) {
            console.error('Error during Telegram auth:', err);
            setError('Ошибка синхронизации с базой данных');
          }
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, [isDevMode, isTelegramWebApp]);

  // Request Telegram Contact Phone Number
  const requestTelegramPhone = async () => {
    if (window.Telegram?.WebApp?.requestContact) {
      window.Telegram.WebApp.requestContact(async (status: boolean, response: any) => {
        if (status && response?.response?.phone_number) {
          const phoneNumber = response.response.phone_number;
          if (profile?.id) {
            await fetch(`/api/v1/users/${profile.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone: phoneNumber })
            });
            await refreshProfile();
          }
        }
      });
    }
  };

  // Request Telegram Geolocation
  const requestTelegramLocation = async () => {
    if (window.Telegram?.WebApp?.requestLocation) {
      window.Telegram.WebApp.requestLocation(async (status: boolean, response: any) => {
        if (status && response?.location) {
          const { latitude, longitude } = response.location;
          if (profile?.id) {
            await fetch(`/api/v1/users/${profile.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude })
            });
            await refreshProfile();
          }
        }
      });
    }
  };

  // Link Email to Current Account
  const linkEmailToAccount = async (email: string, password?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/link-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          telegramId: profile?.telegram_id || telegramUser?.id,
          email,
          password
        })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        setShowLinkEmailModal(false);
        if (profile?.telegram_id) {
          localStorage.setItem(`sav_email_prompt_dismissed_${profile.telegram_id}`, 'true');
        }
        return { success: true };
      }
      return { success: false, error: data.error || 'Не удалось привязать email' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Email Login
  const loginWithEmail = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/email-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          action: 'login',
          telegram_id: telegramUser?.id || null
        })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        if (data.token) localStorage.setItem('sav_auth_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка входа по Email' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  // Email Register
  const registerWithEmail = async (email: string, password: string, name?: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/v1/auth/email-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          first_name: name,
          action: 'register',
          telegram_id: telegramUser?.id || null
        })
      });
      const data = await res.json();
      if (data.success && data.profile) {
        setProfile(data.profile);
        if (data.token) localStorage.setItem('sav_auth_token', data.token);
        return { success: true };
      }
      return { success: false, error: data.error || 'Ошибка регистрации' };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('sav_auth_token');
    setProfile(null);
    setTelegramUser(null);
  };

  const value: TelegramAuthContextType = {
    telegramUser,
    profile,
    isLoading,
    isNewUser,
    isTelegramWebApp: isTelegramWebApp || isDevMode,
    error,
    referralPromo,
    showLinkEmailModal,
    setShowLinkEmailModal,
    linkEmailToAccount,
    loginWithEmail,
    registerWithEmail,
    requestTelegramPhone,
    requestTelegramLocation,
    logout,
    refreshProfile
  };

  return (
    <TelegramAuthContext.Provider value={value}>
      {children}
    </TelegramAuthContext.Provider>
  );
};

export const useTelegramAuth = (): TelegramAuthContextType => {
  const context = useContext(TelegramAuthContext);
  if (context === undefined) {
    throw new Error('useTelegramAuth must be used within a TelegramAuthProvider');
  }
  return context;
};
