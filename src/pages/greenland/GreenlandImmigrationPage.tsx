import React, { useEffect } from 'react';
import { Immigration } from '@/components/greenland/Immigration';
import { Language } from '@/types';
import { TelegramProfile } from '@/hooks/useTelegramUser';

interface Props {
  lang: Language;
  t: (key: string) => string;
  tgProfile?: TelegramProfile | null;
}

const ImmigrationPage: React.FC<Props> = ({ lang, t, tgProfile }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return <Immigration lang={lang} t={t} tgProfile={tgProfile} />;
};

export default ImmigrationPage;
