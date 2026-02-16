import React, { useState } from 'react';
import { ArrowLeft, UserPlus, ArrowRight } from 'lucide-react';
import { useWebAuth } from '../context/WebAuthContext';
import { useToast } from '../context/ToastContext';

interface RegisterPageProps {
  refId: string;
  onBack: () => void;
  onSuccess: () => void;
}

type Step = 'email' | 'password' | 'name';

const RegisterPage: React.FC<RegisterPageProps> = ({ refId, onBack, onSuccess }) => {
  const { register } = useWebAuth();
  const toast = useToast();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  const referrerId = parseInt(refId || '0', 10) || 0;

  const handleEmailNext = () => {
    const trimmed = email.trim();
    if (!trimmed || !trimmed.includes('@')) {
      toast.show('Введите корректный email', 'error');
      return;
    }
    setEmail(trimmed);
    setStep('password');
  };

  const handlePasswordNext = () => {
    if (password.length < 6) {
      toast.show('Пароль должен быть не менее 6 символов', 'error');
      return;
    }
    setStep('name');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.show('Введите имя', 'error');
      return;
    }
    // referrerId может быть 0 (регистрация без реферальной ссылки)
    setLoading(true);
    const { ok, error } = await register(email, password, fullName.trim(), referrerId || 0);
    setLoading(false);
    if (ok) {
      toast.show('Регистрация успешна', 'success');
      onSuccess();
    } else {
      toast.show(error || 'Ошибка регистрации', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      <header className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-[#050505]">
        <button onClick={step === 'email' ? onBack : () => setStep(step === 'name' ? 'password' : 'email')} className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-white">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-white/90 ml-2">Регистрация — шаг {step === 'email' ? 1 : step === 'password' ? 2 : 3}</span>
      </header>

      <div className="flex-1 px-6 py-8">
        <form onSubmit={(e) => { e.preventDefault(); step === 'email' ? handleEmailNext() : step === 'password' ? handlePasswordNext() : handleSubmit(e); }} className="space-y-4 max-w-sm mx-auto">
          {step === 'email' && (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@mail.com"
                  autoComplete="email"
                  autoFocus
                  className="w-full py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:border-neon/50 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neon/90 active:scale-[0.99] transition-all">
                Далее <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 'password' && (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Не менее 6 символов"
                  autoComplete="new-password"
                  autoFocus
                  className="w-full py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:border-neon/50 focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neon/90 active:scale-[0.99] transition-all">
                Далее <ArrowRight size={18} />
              </button>
            </>
          )}

          {step === 'name' && (
            <>
              <div>
                <label className="block text-xs text-neutral-500 mb-1.5">Имя</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  autoComplete="name"
                  autoFocus
                  className="w-full py-3 px-4 bg-white/[0.05] border border-white/10 rounded-xl text-white placeholder-neutral-600 focus:border-neon/50 focus:outline-none"
                />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-neon/90 disabled:opacity-60 active:scale-[0.99] transition-all">
                <UserPlus size={20} />
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
