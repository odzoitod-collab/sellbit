import React, { useState } from 'react';
import { ArrowLeft, LogIn } from 'lucide-react';
import { useWebAuth } from '../context/WebAuthContext';
import { useToast } from '../context/ToastContext';

interface LoginPageProps {
  onBack: () => void;
  onSuccess: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onBack, onSuccess }) => {
  const { login } = useWebAuth();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.show('Введите email и пароль', 'error');
      return;
    }
    setLoading(true);
    const { ok, error } = await login(email.trim(), password);
    setLoading(false);
    if (ok) {
      toast.show('Вход выполнен', 'success');
      onSuccess();
    } else {
      toast.show(error || 'Ошибка входа', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-[#050505]">
        <button onClick={onBack} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-white">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-white/90 ml-2">Вход</span>
      </header>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@mail.com"
              autoComplete="email"
              className="w-full py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:border-neon/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1.5">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:border-neon/50 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neon/90 disabled:opacity-60 active:scale-[0.99] transition-all"
          >
            <LogIn size={20} />
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
