import React from 'react';
import { LogIn, UserPlus, Shield } from 'lucide-react';

const WEBAPP_URL = (import.meta as any).env?.VITE_WEBAPP_URL || window.location.origin;

interface LandingPageProps {
  refId: string;
  onLogin: () => void;
  onRegister: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ refId, onLogin, onRegister }) => {
  return (
    <div className="min-h-screen bg-background text-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-14 h-14 rounded-2xl bg-[#21B053]/20 flex items-center justify-center gap-0.5 mb-6">
          <span className="text-2xl font-bold text-[#21B053]">e</span>
          <span className="text-2xl font-bold text-white">Toro</span>
        </div>
        <h1 className="text-2xl font-bold text-center mb-2">eToro</h1>
        <p className="text-neutral-400 text-sm text-center mb-8 max-w-xs">
          Торгуйте криптовалютой, акциями и сырьём. Безопасная платформа, быстрый вывод.
        </p>

        <div className="w-full max-w-sm space-y-4 mb-8">
          <button
            onClick={onLogin}
            className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neon/90 active:scale-[0.99] transition-all"
          >
            <LogIn size={20} />
            Войти
          </button>
          <button
            onClick={onRegister}
            className="w-full py-3.5 px-4 bg-white/10 border border-white/20 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-white/15 active:scale-[0.99] transition-all"
          >
            <UserPlus size={20} />
            Регистрация
          </button>
        </div>

        <div className="flex items-center gap-2 text-neutral-500 text-xs mb-6">
          <Shield size={14} />
          <span>Данные защищены</span>
        </div>

        <p className="text-[11px] text-neutral-600 text-center max-w-[280px]">
          Регистрация бесплатна. Подтверждение почты не требуется — вход по email и паролю.
          {refId && ' Вы перешли по реферальной ссылке.'}
        </p>
      </div>
    </div>
  );
};

export default LandingPage;
