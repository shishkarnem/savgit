import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Header } from '@/components/Header';
import { RealisticSmokeBackdrop } from '@/components/RealisticSmokeBackdrop';
import { 
  ArrowLeft, 
  Home, 
  Compass, 
  AlertTriangle, 
  FileQuestion, 
  Search, 
  ExternalLink,
  Layers,
  Sparkles
} from 'lucide-react';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  const handleHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-3 md:p-4 lg:p-6 relative text-slate-100 overflow-x-hidden">
      {/* Хедер с главного лендинга */}
      <Header onLogoClick={() => navigate('/')} />

      {/* Основной контент */}
      <main className="w-full flex-grow flex items-center justify-center py-6 md:py-12 z-10">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="w-full max-w-2xl px-2 sm:px-4"
        >
          <div className="liquid-bubble-plate rounded-3xl p-6 sm:p-8 md:p-10 border border-amber-400/40 shadow-2xl relative backdrop-blur-2xl">
            <span className="liquid-bubble-glare" />
            <RealisticSmokeBackdrop 
              speed="normal" 
              opacity={0.35} 
              className="-top-4 -left-4 w-[calc(100%+32px)] h-[120px] pointer-events-none" 
            />

            {/* Заголовок и статус-код */}
            <div className="text-center relative z-10 mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 mb-4 shadow-lg shadow-amber-500/5">
                <Compass className="w-9 h-9 sm:w-11 sm:h-11 text-amber-300 animate-pulse" />
              </div>

              <div className="flex items-center justify-center gap-3 mb-2">
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-amber-400/15 text-amber-200 border border-amber-400/30">
                  ошибка 404
                </span>
                <span className="text-xs font-mono px-3 py-1 rounded-full bg-white/10 text-zinc-200 border border-white/15">
                  page not found
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-amber-200 via-amber-300 to-amber-100 bg-clip-text text-transparent mb-3">
                Страница не найдена
              </h1>

              <p className="text-sm sm:text-base text-zinc-200/90 max-w-lg mx-auto leading-relaxed">
                Запрашиваемый адрес отсутствует или был перемещен. Платформа не смогла обнаружить запрашиваемый маршрут.
              </p>

              {location.pathname && (
                <div className="mt-3 inline-block px-3.5 py-1.5 rounded-xl bg-black/40 border border-amber-400/20 text-xs font-mono text-amber-300/85 break-all max-w-full">
                  Путь: {location.pathname}
                </div>
              )}
            </div>

            {/* Блок возможных причин ошибки */}
            <div className="relative z-10 mb-8 space-y-3">
              <div className="text-xs sm:text-sm font-semibold text-amber-200 flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0" />
                <span>Возможные причины ошибки:</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 flex items-start gap-2.5">
                  <FileQuestion className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-white block">Опечатка в URL-адресе</span>
                    <span className="text-zinc-300 text-xs leading-relaxed">
                      Проверьте правильность написания символов в адресной строке браузера.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 flex items-start gap-2.5">
                  <Search className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-white block">Устаревшая ссылка</span>
                    <span className="text-zinc-300 text-xs leading-relaxed">
                      Раздел мог быть обновлен, объединен или перемещен на новый маршрут.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 flex items-start gap-2.5">
                  <Layers className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-white block">Ограничение доступа</span>
                    <span className="text-zinc-300 text-xs leading-relaxed">
                      Для некоторых разделов может потребоваться вход через Telegram или авторизация.
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-black/35 border border-white/10 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-medium text-white block">Обновление платформы</span>
                    <span className="text-zinc-300 text-xs leading-relaxed">
                      Интерфейс экосистемы активно развивается, часть ссылок синхронизируется.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Кнопки действий: Назад и На главную */}
            <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleBack}
                className="liquid-bubble-secondary px-6 py-3.5 rounded-2xl font-medium text-sm sm:text-base text-white hover:text-amber-200 transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-md cursor-pointer"
              >
                <span className="liquid-bubble-glare" />
                <ArrowLeft className="w-4 h-4 text-amber-300" />
                <span>Назад</span>
              </button>

              <button
                type="button"
                onClick={handleHome}
                className="liquid-bubble-gold px-7 py-3.5 rounded-2xl font-semibold text-sm sm:text-base text-zinc-950 transition-all flex items-center justify-center gap-2.5 active:scale-95 shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                <span className="liquid-bubble-glare" />
                <Home className="w-4 h-4 text-zinc-950" />
                <span>На главную</span>
              </button>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Футер */}
      <footer className="mt-8 py-4 px-6 text-center text-amber-200/80 text-sm font-mono relative z-20 overflow-visible max-w-2xl mx-auto rounded-xl">
        <RealisticSmokeBackdrop speed="fast" opacity={0.75} className="-inset-y-2 -inset-x-4" />
        <span className="relative z-10 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)]">
          © 2026 SAV AI • Платформа корпоративной роботизации и ИИ-агентов
        </span>
      </footer>
    </div>
  );
};

export default NotFound;
