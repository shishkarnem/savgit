import React, { useEffect } from 'react';
import { Profile } from '@/components/greenland/Profile';
import { CityNode, Language } from '@/types';
import { TelegramProfile } from '@/hooks/useTelegramUser';

interface Props {
  lang: Language;
  mapImage: string;
  cities: CityNode[];
  onUpdateMapImage: (url: string) => void;
  onUpdateCities: (cities: CityNode[]) => void;
  t: (key: string) => string;
  appData: any;
  setAppData: (data: any) => void;
  tgProfile: TelegramProfile | null;
  tgLoading: boolean;
  isTelegram: boolean;
}

const ProfilePage: React.FC<Props> = (props) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return <Profile {...props} />;
};

export default ProfilePage;
