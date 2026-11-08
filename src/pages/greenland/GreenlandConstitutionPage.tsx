import React, { useEffect } from 'react';
import { Constitution } from '@/components/greenland/Constitution';
import { Language } from '@/types';

interface Props {
  lang: Language;
  t: (key: string) => string;
  lawsData: any[];
}

const ConstitutionPage: React.FC<Props> = ({ lang, t, lawsData }) => {
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, []);

  return <Constitution lang={lang} t={t} lawsData={lawsData} />;
};

export default ConstitutionPage;
