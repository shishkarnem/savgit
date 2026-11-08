import { useState, useEffect } from 'react';
import { protalkDb } from '@/integrations/protalk/client';

export type AccessContext = 'telegram' | 'browser' | 'bot_owner' | 'direct_admin';

export function useAccessControl(telegramId: number | string | null) {
  const [hasAccessState, setHasAccessState] = useState<Record<string, boolean>>({
    home: true,
    immigration: true,
    constitution: true,
    profile: true,
    admin: false,
  });
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<AccessContext>('browser');

  useEffect(() => {
    let isMounted = true;

    const checkAccess = async (isBackground = false) => {
      if (!isBackground) setLoading(true);
      try {
        const storedProfileRaw = localStorage.getItem('sav_user_profile');
        const storedProfile = storedProfileRaw ? JSON.parse(storedProfileRaw) : null;
        const currentTgId = String(
          telegramId ||
          storedProfile?.telegram_id ||
          localStorage.getItem('gl_tg_id') ||
          ''
        ).trim();

        let isAdmin = false;

        // 1. Explicit admin Telegram ID 169262990
        if (currentTgId === '169262990') {
          isAdmin = true;
        }

        // 2. Email or role check from profile
        if (
          storedProfile?.email === 'shishkarnem@gmail.com' ||
          storedProfile?.role === 'ADMIN' ||
          storedProfile?.role === 'admin' ||
          storedProfile?.is_admin === 1 ||
          storedProfile?.is_admin === true
        ) {
          isAdmin = true;
        }

        // 3. Database check from user_access or users table
        if (!isAdmin && currentTgId) {
          try {
            const { data: ua } = await protalkDb
              .from('user_access')
              .select('*')
              .eq('telegram_id', Number(currentTgId) || currentTgId)
              .limit(1);

            if (ua && ua.length > 0) {
              const row = ua[0] as any;
              if (
                row.is_superuser === 1 ||
                row.role_name === 'ADMIN' ||
                row.role_name === 'admin' ||
                (typeof row.allowed_pages === 'string' && row.allowed_pages.includes('admin')) ||
                (Array.isArray(row.allowed_pages) && row.allowed_pages.includes('admin'))
              ) {
                isAdmin = true;
              }
            }
          } catch (dbErr) {
            console.warn('user_access check error:', dbErr);
          }
        }

        if (isMounted) {
          setHasAccessState({
            home: true,
            immigration: true,
            constitution: true,
            profile: true,
            admin: isAdmin,
          });
          setContext(isAdmin ? 'direct_admin' : (telegramId ? 'telegram' : 'browser'));
          setLoading(false);
        }
      } catch (e) {
        console.error('Access control evaluation error:', e);
        if (isMounted) {
          setHasAccessState({
            home: true,
            immigration: true,
            constitution: true,
            profile: true,
            admin: false,
          });
          setLoading(false);
        }
      }
    };

    checkAccess(false);

    const onProfileUpdate = () => checkAccess(true);
    window.addEventListener('storage', onProfileUpdate);
    window.addEventListener('partner-registered', onProfileUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('storage', onProfileUpdate);
      window.removeEventListener('partner-registered', onProfileUpdate);
    };
  }, [telegramId]);

  const hasAccess = (page: string): boolean => {
    return hasAccessState[page] ?? (page !== 'admin');
  };

  return { hasAccess, loading, context };
}
