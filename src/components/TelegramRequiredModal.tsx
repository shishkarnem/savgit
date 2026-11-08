import React, { useState } from 'react';
import { Send, Mail } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { GlassModal } from '@/components/ui/GlassModal';

interface TelegramRequiredModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const TelegramRequiredModal: React.FC<TelegramRequiredModalProps> = ({ isOpen, onClose }) => {
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (!isOpen) return null;

  const handleOpenTelegram = () => {
    window.location.href = 'https://t.me/SAV_AIbot/app';
  };

  const handleOpenEmail = () => {
    if (onClose) onClose();
    setShowAuthModal(true);
  };

  return (
    <>
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <GlassModal
        isOpen={isOpen}
        onClose={onClose || (() => {})}
        maxWidth="md"
        title="Вход в личный кабинет"
        subtitle="Выберите способ авторизации в экосистеме SAV AI"
        showLogo
        showCloseButton={!!onClose}
      >
        <div className="space-y-4 pt-1">
          {/* Content */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleOpenEmail}
              className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-gold text-stone-950 font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition-all relative overflow-hidden group"
            >
              <span className="liquid-bubble-glare" />
              <Mail className="w-4 h-4 text-stone-950 relative z-10" />
              <span className="relative z-10 font-bold">Войти по Email и паролю</span>
            </button>

            <button
              type="button"
              onClick={handleOpenTelegram}
              className="w-full py-3.5 px-4 rounded-2xl liquid-bubble-secondary text-amber-100 hover:text-white font-bold text-sm md:text-base flex items-center justify-center gap-2.5 transition-all relative overflow-hidden group"
            >
              <span className="liquid-bubble-glare" />
              <Send className="w-4 h-4 text-amber-300 relative z-10" />
              <span className="relative z-10">Войти через Telegram бота</span>
            </button>
          </div>

          <div className="pt-3 border-t border-amber-400/20 text-center font-sans">
            <p className="text-sm text-amber-100/70">
              Расчёт стоимости и подбор решений доступны без обязательной регистрации.
            </p>
          </div>
        </div>
      </GlassModal>
    </>
  );
};

export default TelegramRequiredModal;
