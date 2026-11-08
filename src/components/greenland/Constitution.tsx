import React, { useState, useMemo } from 'react';
import { Plus, Minus, MessageCircle, Book, Search } from 'lucide-react';
import { Language } from '@/types';

interface ConstitutionProps {
  lang: Language;
  t: (key: string) => string;
  lawsData: any[];
}

export const Constitution: React.FC<ConstitutionProps> = ({ lang, t, lawsData }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLaws = useMemo(() => {
    if (!searchQuery) return lawsData;
    const lowerQuery = searchQuery.toLowerCase();
    return lawsData.filter((item: any) => {
      const q = (item.q || '').toLowerCase();
      const a = (item.a || '').toLowerCase();
      return q.includes(lowerQuery) || a.includes(lowerQuery);
    });
  }, [lawsData, searchQuery]);

  return (
    <div className="container mx-auto px-4 py-4 max-w-4xl space-y-6">
      {/* Header Card in Liquid Glass 3D */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 text-center relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <span className="liquid-bubble-glare" />
        <div className="w-14 h-14 liquid-bubble-secondary rounded-2xl flex items-center justify-center mx-auto mb-3 border border-amber-400/30 shadow-md">
          <Book className="text-amber-400" size={28} />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-2 bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent">
          {t('const_title') || 'Конституция и Законы ИИ-Гренландии'}
        </h2>
        <p className="text-zinc-300 text-sm md:text-base max-w-xl mx-auto font-medium">
          {t('const_desc') || 'Официальный свод правил, регламентов и прав резидентов цифрового государства'}
        </p>

        {/* Search */}
        <div className="relative mt-6 max-w-lg mx-auto">
          <input
            type="text"
            placeholder={lang === 'ru' ? "Поиск по статьям и законам..." : "Поиск по законам..."}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setOpenIndex(null); }}
            className="w-full pl-12 pr-4 py-3 rounded-xl liquid-bubble-secondary border border-white/15 focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 outline-none transition-all text-white placeholder:text-zinc-500 text-sm md:text-base font-medium backdrop-blur-xl"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400/80" size={18} />
        </div>
      </div>

      {/* Accordion List in Liquid Glass */}
      <div className="space-y-3.5 min-h-[250px]">
        {filteredLaws && filteredLaws.length > 0 ? (
          filteredLaws.map((item: any, index: number) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`liquid-bubble-plate rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-xl relative border ${
                  isOpen ? 'border-amber-400/50 shadow-lg shadow-amber-500/10' : 'border-white/10 hover:border-amber-400/30'
                }`}
              >
                <span className="liquid-bubble-glare" />
                <button
                  className="w-full flex items-center justify-between p-4 md:p-5 text-left gap-3 relative z-10 cursor-pointer"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                >
                  <span className="font-bold text-base md:text-lg text-white flex items-center gap-3">
                    <span className="text-amber-400 font-mono select-none text-lg">§</span>
                    {lang === 'olbanian' && item.q_olbanian ? item.q_olbanian : item.q}
                  </span>
                  {isOpen ? (
                    <Minus className="text-amber-400 shrink-0" size={20} />
                  ) : (
                    <Plus className="text-zinc-400 shrink-0" size={20} />
                  )}
                </button>

                {isOpen && (
                  <div className="p-5 pt-1 text-zinc-200 border-t border-white/10 text-sm md:text-base leading-relaxed whitespace-pre-wrap relative z-10 bg-black/20">
                    {lang === 'olbanian' && item.a_olbanian ? item.a_olbanian : item.a}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400">
            <Search size={40} className="mb-3 opacity-50 text-amber-400" />
            <p className="text-base font-medium">Ничего не найдено по вашему запросу</p>
          </div>
        )}
      </div>

      {/* Telegram Clarification Block */}
      <div className="liquid-bubble-plate border border-amber-400/35 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden shadow-2xl backdrop-blur-xl">
        <span className="liquid-bubble-glare" />
        <div className="relative z-10">
          <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-amber-100 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-1">
            {t('const_clarify_title') || 'Остались вопросы по регламентам?'}
          </h3>
          <p className="text-zinc-300 text-sm md:text-base font-medium">
            {t('const_clarify_desc') || 'Свяжитесь с канцлером для получения персональной консультации'}
          </p>
        </div>
        <a
          href="https://t.me/shishkarnem"
          target="_blank"
          rel="noopener noreferrer"
          className="liquid-bubble-gold text-amber-950 font-bold border border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.45)] px-6 py-3.5 text-sm md:text-base flex items-center gap-2 whitespace-nowrap rounded-xl hover:scale-[1.02] active:scale-95 relative overflow-hidden transition-all duration-300 z-10 cursor-pointer"
        >
          <span className="liquid-bubble-glare" />
          <MessageCircle size={18} className="relative z-10" />
          <span className="relative z-10">{t('const_btn') || 'Написать канцлеру'}</span>
        </a>
      </div>
    </div>
  );
};

