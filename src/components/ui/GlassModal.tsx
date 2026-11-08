import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import BrandLogo from '../BrandLogo';

export interface GlassModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'full';
  showLogo?: boolean;
  showCloseButton?: boolean;
  className?: string;
}

const maxWidthMap = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  full: 'max-w-6xl'
};

export const GlassModal: React.FC<GlassModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'lg',
  showLogo = false,
  showCloseButton = true,
  className = ''
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-transparent select-none overflow-y-auto">
          {/* 100% Transparent backdrop for click-to-close (Zero darkening/blur of background) */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-transparent"
          />

          {/* Modal Container: Liquid Glass Apple with inner dark blur and gold/white borders */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={(e) => e.stopPropagation()}
            className={`relative z-10 w-full ${maxWidthMap[maxWidth]} p-5 sm:p-7 rounded-3xl bg-black/80 backdrop-blur-2xl border border-amber-400/40 shadow-[0_25px_60px_rgba(0,0,0,0.9)] text-white space-y-5 max-h-[90vh] overflow-y-auto ${className}`}
          >
            {/* Top Bar / Header */}
            {(title || showLogo || showCloseButton) && (
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-400/20">
                <div className="flex items-center gap-3">
                  {showLogo && <BrandLogo size="sm" />}
                  <div>
                    {title && (
                      <h3 className="text-xl font-bold bg-gradient-to-r from-amber-100 via-yellow-300 to-amber-400 bg-clip-text text-transparent leading-snug">
                        {title}
                      </h3>
                    )}
                    {subtitle && (
                      <p className="text-sm text-amber-100/75 mt-0.5 font-medium">
                        {subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-1.5 rounded-xl border border-amber-400/30 bg-black/50 text-amber-200/80 hover:text-white hover:border-amber-300 transition-all"
                    title="Закрыть"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Modal Body */}
            <div className="relative text-white font-sans text-sm sm:text-base">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default GlassModal;
