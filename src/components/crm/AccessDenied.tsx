import React from 'react';
import { Shield, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface AccessDeniedProps {
  message?: string;
}

export const AccessDenied: React.FC<AccessDeniedProps> = ({ 
  message = 'У вас нет доступа к этому разделу' 
}) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="rounded-3xl backdrop-blur-2xl bg-black/60 border border-white/20 p-8 text-center shadow-2xl text-white space-y-6">
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-amber-400/10 rounded-2xl animate-pulse" />
            <div className="absolute inset-2 bg-black/50 rounded-2xl flex items-center justify-center border border-amber-400/40">
              <Shield className="w-8 h-8 text-amber-300" />
            </div>
            <Lock className="absolute -bottom-1 -right-1 w-6 h-6 text-amber-300 bg-black/80 rounded-lg p-1 border border-white/20" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200 bg-clip-text text-transparent mb-2">
              Доступ ограничен
            </h1>
            <p className="text-white/70 text-sm">{message}</p>
          </div>
          <div className="bg-black/30 border border-white/10 rounded-2xl p-4 text-left">
            <p className="text-sm text-white/80 leading-relaxed">
              Для получения доступа обратитесь к администратору системы. Доступ предоставляется авторизованным пользователям экосистемы.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate('/')} 
              variant="outline" 
              className="w-full py-3.5 border border-white/20 hover:border-amber-400/40 text-white font-medium text-sm md:text-base rounded-2xl backdrop-blur-xl bg-black/20"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться на главную
            </Button>
          </div>
        </div>
        <p className="text-center text-white/40 text-sm mt-4">SAV CRM • Защищённый раздел</p>
      </div>
    </div>
  );
};

export default AccessDenied;
