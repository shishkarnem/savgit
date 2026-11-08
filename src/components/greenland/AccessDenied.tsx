import React from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AccessDeniedProps {
  lang: 'ru' | 'olbanian';
  context?: 'telegram' | 'lovable' | 'browser';
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ lang, context = 'browser' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const homePath = location.pathname.startsWith('/partner') ? '/partner' : '/greenland';
  const isBrowser = context === 'browser';

  return (
    <div className="container mx-auto px-4 py-16 text-center max-w-2xl">
      <div className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center bg-black/40 border border-amber-400/40 shadow-lg">
        <ShieldAlert size={36} className="text-amber-300" />
      </div>
      {isBrowser ? (
        <div className="rounded-3xl backdrop-blur-2xl bg-black/60 border border-white/20 p-8 shadow-2xl space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
            {lang === 'ru' ? 'Доступ через Telegram' : 'Вход через Telegram'}
          </h2>
          <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-lg mx-auto">
            {lang === 'ru'
              ? 'Этот раздел партнёрской программы оптимизирован для Telegram Mini App. Откройте нашего бота @SAVPartnerBot для быстрого доступа ко всем функциям:'
              : 'Этот раздел работает через бота @SAVPartnerBot. Запустите его для доступа:'}
          </p>
          <ul className="text-left max-w-md mx-auto space-y-3 text-sm text-white/80 bg-black/30 border border-white/10 p-5 rounded-2xl">
            <li className="flex items-center gap-2.5"><span>✨</span> <span>Персональный профиль и статистика</span></li>
            <li className="flex items-center gap-2.5"><span>✨</span> <span>Доступ к юридическим документам</span></li>
            <li className="flex items-center gap-2.5"><span>✨</span> <span>Казначейство и партнёрские выплаты</span></li>
            <li className="flex items-center gap-2.5"><span>✨</span> <span>ИИ-ассистент и база знаний</span></li>
          </ul>
          <a
            href="https://t.me/SAVPartnerBot"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 border border-amber-400 text-white hover:border-amber-300 font-bold rounded-2xl shadow-lg shadow-amber-500/10 transition-all text-sm md:text-base backdrop-blur-xl bg-black/40"
          >
            <ExternalLink size={18} className="text-amber-300" />
            <span>Открыть Telegram бота</span>
          </a>
          <p className="text-sm text-amber-300/80 font-mono">@SAVPartnerBot</p>
        </div>
      ) : (
        <div className="rounded-3xl backdrop-blur-2xl bg-black/60 border border-white/20 p-8 shadow-2xl space-y-6">
          <h2 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent">
            {lang === 'ru' ? 'Нет доступа' : 'Доступ ограничен'}
          </h2>
          <p className="text-white/80 text-sm md:text-base leading-relaxed max-w-md mx-auto">
            {lang === 'ru'
              ? 'У вас нет доступа к этой странице. Обратитесь к администратору для получения прав доступа.'
              : 'Для доступа обратитесь к администратору системы.'}
          </p>
          <button
            onClick={() => navigate(homePath)}
            className="px-8 py-3.5 border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm md:text-base rounded-2xl backdrop-blur-xl bg-black/20 transition-all"
          >
            {lang === 'ru' ? 'На главную' : 'На главную'}
          </button>
        </div>
      )}
    </div>
  );
};
