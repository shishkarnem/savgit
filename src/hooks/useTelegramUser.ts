import { useState, useEffect } from 'react';

export interface TelegramProfile {
  telegram_id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date?: number;
}

export function useTelegramUser() {
  const [profile, setProfile] = useState<TelegramProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      setIsTelegram(true);
      if (tg.initDataUnsafe?.user) {
        const u = tg.initDataUnsafe.user;
        setProfile({
          telegram_id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          username: u.username,
          photo_url: u.photo_url,
        });
      }
    }
  }, []);

  return { profile, loading, isTelegram };
}
