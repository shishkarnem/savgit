import React, { useState } from 'react';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { Mail, Lock, User, ArrowRight, Sparkles, Send, Info, AlertCircle } from 'lucide-react';
import { GlassModal } from '@/components/ui/GlassModal';
import { BrandLogo } from '@/components/BrandLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginWithEmail, registerWithEmail } = useTelegramAuth();
  const [authMethod, setAuthMethod] = useState<'email' | 'telegram'>('email');
  const [emailMode, setEmailMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let res;
    if (emailMode === 'login') {
      res = await loginWithEmail(email, password);
    } else {
      res = await registerWithEmail(email, password, name);
    }

    setLoading(false);
    if (res.success) {
      onClose();
    } else {
      setError(res.error || 'Не удалось выполнить вход. Проверьте введённые данные.');
    }
  };

  const handleOpenTelegram = () => {
    window.location.href = 'https://t.me/SAV_AIbot/app';
  };

  return (
    <GlassModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="lg"
      title="Вход в SAV AI"
      subtitle="Единый аккаунт экосистемы"
      showLogo
    >
      <div className="space-y-5">
        {/* Free calculation note */}
        <div className="p-3.5 rounded-2xl backdrop-blur-md bg-black/60 border border-amber-400/30 text-white/90 text-sm flex items-start gap-2.5">
          <Info className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <p className="leading-relaxed font-sans">
            Расчёт стоимости, калькулятор и подбор ИИ-продавца доступны без регистрации. Вход нужен для сохранения истории и доступа к партнёрской программе.
          </p>
        </div>

        {/* Auth Method Switcher */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-black/60 border border-amber-400/25">
          <button
            type="button"
            onClick={() => { setAuthMethod('email'); setError(null); }}
            className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              authMethod === 'email'
                ? 'liquid-bubble-secondary text-white border border-amber-400/60 shadow-md'
                : 'border border-transparent text-white/70 hover:text-white'
            }`}
          >
            По Email и паролю
          </button>
          <button
            type="button"
            onClick={() => { setAuthMethod('telegram'); setError(null); }}
            className={`py-2.5 px-3 rounded-xl text-sm font-semibold transition-all ${
              authMethod === 'telegram'
                ? 'liquid-bubble-secondary text-white border border-amber-400/60 shadow-md'
                : 'border border-transparent text-white/70 hover:text-white'
            }`}
          >
            Через Telegram
          </button>
        </div>

        {/* Telegram Auth Tab */}
        {authMethod === 'telegram' && (
          <div className="space-y-4 pt-1">
            <p className="text-sm sm:text-base text-white/85 leading-relaxed font-sans">
              Вы можете мгновенно авторизоваться через официального Telegram-бота SAV AI без ввода паролей:
            </p>

            <div className="p-4 rounded-2xl bg-black/60 border border-amber-400/30 space-y-2.5 text-sm text-white/90">
              <div className="flex items-center gap-2 text-amber-300 font-medium">
                <Send className="w-4 h-4" />
                <span>Быстрый запуск</span>
              </div>
              <p className="font-sans">
                Бот автоматически создаст профиль или выполнит вход в существующий аккаунт.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenTelegram}
              className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-secondary text-amber-100 hover:text-white font-bold text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden group"
            >
              <span className="liquid-bubble-glare" />
              <Send className="w-4 h-4 text-amber-300 relative z-10" />
              <span className="relative z-10">Войти через Telegram бота</span>
            </button>
          </div>
        )}

        {/* Email Auth Tab */}
        {authMethod === 'email' && (
          <div className="space-y-4">
            {/* Sub-mode switcher */}
            <div className="flex items-center justify-center gap-4 text-sm font-sans">
              <button
                type="button"
                onClick={() => { setEmailMode('login'); setError(null); }}
                className={`pb-1 border-b-2 font-medium transition-all ${
                  emailMode === 'login'
                    ? 'border-amber-400 text-amber-300 font-bold'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                Вход по паролю
              </button>
              <span className="text-white/30">•</span>
              <button
                type="button"
                onClick={() => { setEmailMode('register'); setError(null); }}
                className={`pb-1 border-b-2 font-medium transition-all ${
                  emailMode === 'register'
                    ? 'border-amber-400 text-amber-300 font-bold'
                    : 'border-transparent text-white/60 hover:text-white'
                }`}
              >
                Новая регистрация
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-2xl backdrop-blur-md bg-black/70 border border-amber-400/50 text-white text-sm flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
                <span className="font-sans">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {emailMode === 'register' && (
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-1 font-sans">
                    Ваше имя
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Алексей"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-amber-400/30 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-amber-400 transition-all font-sans"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1 font-sans">
                  Электронная почта
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-amber-400/30 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-amber-400 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/80 mb-1 font-sans">
                  Пароль
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/60 border border-amber-400/30 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-amber-400 transition-all font-sans"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-secondary text-amber-100 hover:text-white font-bold text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden group disabled:opacity-50 mt-3"
              >
                <span className="liquid-bubble-glare" />
                <span className="relative z-10 font-bold">
                  {loading ? 'Обработка...' : (
                    emailMode === 'login' ? 'Войти в личный кабинет' : 'Зарегистрировать аккаунт'
                  )}
                </span>
                <ArrowRight className="w-4 h-4 text-amber-300 relative z-10" />
              </button>
            </form>
          </div>
        )}
      </div>
    </GlassModal>
  );
};

export default AuthModal;
