import React, { useState } from 'react';
import { useTelegramAuth } from '@/contexts/TelegramAuthContext';
import { Mail, Check, Shield, Sparkles } from 'lucide-react';
import { GlassModal } from '@/components/ui/GlassModal';

export const LinkEmailModal: React.FC = () => {
  const { showLinkEmailModal, setShowLinkEmailModal, linkEmailToAccount, profile, telegramUser } = useTelegramAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!showLinkEmailModal) return null;

  const handleDismiss = () => {
    const tgId = profile?.telegram_id || telegramUser?.id;
    if (tgId) {
      localStorage.setItem(`sav_email_prompt_dismissed_${tgId}`, 'true');
    }
    setShowLinkEmailModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Пожалуйста, введите корректный адрес электронной почты');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const res = await linkEmailToAccount(email, password || undefined);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Ошибка привязки email');
    }
  };

  return (
    <GlassModal
      isOpen={showLinkEmailModal}
      onClose={handleDismiss}
      maxWidth="md"
      title="Привязать Email к профилю"
      subtitle="Единый аккаунт экосистемы SAV AI"
      showLogo
    >
      <div className="space-y-5">
        <p className="text-sm sm:text-base text-amber-100/85 leading-relaxed font-sans">
          Вы вошли через Telegram Mini App. Привяжите почту, чтобы входить как через Telegram, так и через браузер с компьютера по единому профилю с общим балансом и данными.
        </p>

        {errorMsg && (
          <div className="p-3.5 rounded-2xl backdrop-blur-md bg-black/70 border border-amber-400/50 text-white text-sm flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-amber-300 shrink-0" />
            <span className="font-sans">{errorMsg}</span>
          </div>
        )}

        {/* Email Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5 font-sans">
              Ваш рабочий Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="director@company.ru"
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-amber-400/30 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-amber-400 transition-all font-sans"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5 font-sans">
              Пароль для входа с компьютера (опционально)
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-xl bg-black/60 border border-amber-400/30 text-white placeholder:text-white/40 text-sm sm:text-base focus:outline-none focus:border-amber-400 transition-all font-sans"
            />
          </div>

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-base flex items-center justify-center gap-2 transition-all relative overflow-hidden group disabled:opacity-50"
            >
              <span className="liquid-bubble-glare" />
              {isLoading ? (
                <span className="relative z-10">Сохранение...</span>
              ) : (
                <>
                  <Check className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">Привязать почту и синхронизировать</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 px-4 text-sm text-white/70 hover:text-white transition-colors text-center font-sans"
            >
              Пропустить, входить только через Telegram
            </button>
          </div>
        </form>
      </div>
    </GlassModal>
  );
};

