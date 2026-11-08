import React from 'react';
import { AlertTriangle, X, Check } from 'lucide-react';
import { useSystemAdminStore } from '@/store/useSystemAdminStore';
import Rivets from '@/components/Rivets';

export const ConfirmModal: React.FC = () => {
  const { confirmModal, closeConfirmModal } = useSystemAdminStore();

  if (!confirmModal.isOpen) return null;

  const handleConfirm = () => {
    if (confirmModal.onConfirm) {
      confirmModal.onConfirm();
    }
    closeConfirmModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent select-none">
      <div className="relative w-full max-w-md backdrop-blur-3xl bg-black/50 border border-white/20 rounded-3xl shadow-2xl p-6 md:p-8 text-white overflow-hidden">
        <Rivets />

        <button
          onClick={closeConfirmModal}
          className="absolute top-5 right-5 text-white/60 hover:text-white transition-colors p-1.5 rounded-full backdrop-blur-md bg-white/[0.05] hover:bg-white/[0.15] border border-white/10"
        >
          <X size={18} />
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl flex-shrink-0 backdrop-blur-md bg-amber-400/10 text-amber-300 border border-amber-400/30">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              {confirmModal.title || 'Подтверждение действия'}
            </h3>
            <p className="text-sm text-white/80 leading-relaxed font-normal">
              {confirmModal.message}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={closeConfirmModal}
            className="px-4 py-2.5 text-sm font-medium text-white/80 hover:text-white backdrop-blur-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 rounded-xl transition-all"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl transition-all flex items-center gap-2 border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent hover:from-amber-500/30 hover:to-amber-400/20 text-white shadow-lg shadow-amber-500/10"
          >
            <Check size={16} className="text-amber-300" />
            <span>{confirmModal.confirmText || 'Подтвердить'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

