import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';

interface BrowserWarningModalProps {
  lang: 'ru' | 'olbanian';
}

export const BrowserWarningModal: React.FC<BrowserWarningModalProps> = ({ lang }) => {
  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white dark:bg-greenland-deep border border-gray-200 dark:border-greenland-ice/30 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-fadeIn transition-colors">
        <div className="w-16 h-16 mx-auto mb-6 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center">
          <AlertTriangle size={32} className="text-yellow-600 dark:text-yellow-400" />
        </div>
        <h2 className="text-2xl font-display font-bold text-gray-900 dark:text-white mb-4">
          {lang === 'ru' ? 'Доступ ограничен' : 'СТОЙ! НЕ ПУЩУ!'}
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
          {lang === 'ru'
            ? 'Для доступа к приложению необходимо войти через Telegram бота. Откройте бота и запустите приложение оттуда.'
            : 'НАДО ЗАЙТИ ЧЕРЕЗ ТЕЛЕГУ, КРАБЕ! ОТКРОЙ БОТА И ЖМАКАЙ ТАМ!'}
        </p>
        <a
          href="https://t.me/SAVPartnerBot"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 bg-greenland-ice text-white dark:text-greenland-deep font-bold rounded-xl hover:bg-blue-600 transition-all shadow-lg shadow-greenland-ice/30 text-lg"
        >
          <ExternalLink size={20} />
          {lang === 'ru' ? 'Открыть Telegram бота' : 'ОТКРЫТЬ БОТА'}
        </a>
        <p className="mt-4 text-xs text-gray-500">
          @SAVPartnerBot
        </p>
      </div>
    </div>
  );
};
