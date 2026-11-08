import React, { useEffect } from 'react';
import { Home } from '@/components/greenland/Home';
import { Language, CityNode } from '@/types';

interface HomePageProps {
  lang: Language;
  mapImage: string;
  cities: CityNode[];
  t: (key: string) => string;
}

const HomePage: React.FC<HomePageProps> = ({ lang, mapImage, cities, t }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return <Home lang={lang} mapImage={mapImage} cities={cities} t={t} />;
};

export default HomePage;
