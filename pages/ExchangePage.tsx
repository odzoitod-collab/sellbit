import React, { useState } from 'react';
import { ArrowLeft, Repeat, Check, ArrowDown } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useToast } from '../context/ToastContext';

interface ExchangePageProps {
  balance: number;
  onBack: () => void;
  onExchange: (amount: number) => void;
}

const ExchangePage: React.FC<ExchangePageProps> = ({ balance, onBack, onExchange }) => {
  const toast = useToast();
  const [success, setSuccess] = useState(false);
  const [amountFrom, setAmountFrom] = useState('');
  
  // Hardcoded rates for demo
  const rate = 0.000016; // RUB to BTC
  const amountTo = amountFrom ? (parseFloat(amountFrom) * rate).toFixed(8) : '0.00';

  const handleExchange = () => {
    const numAmount = parseFloat(amountFrom);
    if (isNaN(numAmount) || numAmount <= 0) {
        Haptic.error();
        return;
    }
    if (numAmount > balance) {
        Haptic.error();
        toast.show('Недостаточно средств на балансе.', 'error');
        return;
    }
    Haptic.tap();
    onExchange(numAmount);
    setSuccess(true);
  };

  if (success) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 animate-fade-in p-6 text-center">
             <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-neon/20 mb-6 animate-scale-in">
                <div className="absolute inset-0 rounded-full border-2 border-neon animate-ping opacity-20"></div>
                <Check size={48} className="text-neon animate-check-stroke" strokeWidth={3} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Обмен успешен!</h2>
            <div className="bg-neutral-900 rounded-lg p-4 mb-8 w-full max-w-xs border border-white/5">
                <div className="flex justify-between text-sm mb-1">
                    <span className="text-neutral-500">Отдано</span>
                    <span className="text-white font-mono">{amountFrom} RUB</span>
                </div>
                 <div className="flex justify-between text-sm">
                    <span className="text-neutral-500">Получено</span>
                    <span className="text-neon font-mono font-bold">{amountTo} BTC</span>
                </div>
            </div>
            <button 
                onClick={() => { Haptic.tap(); onBack(); }}
                className="px-8 py-3 rounded-full border border-neutral-700 text-white hover:bg-neutral-900 transition-colors active:scale-95"
            >
                Отлично
            </button>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in">
      <header className="flex items-center px-4 py-4 border-b border-white/5">
        <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white mr-4">
            <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-bold">Обмен валют</span>
      </header>

      <div className="flex-1 p-4 flex flex-col pt-8">
        
        {/* FROM */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 space-y-2 focus-within:border-neutral-600 transition-colors">
            <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500 uppercase font-bold">Отдаю</span>
                <span className="text-xs text-neutral-600">Баланс: {balance.toLocaleString()} RUB</span>
            </div>
            <div className="flex items-center justify-between">
                <input 
                    type="number" 
                    value={amountFrom}
                    onChange={(e) => setAmountFrom(e.target.value)}
                    className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none placeholder-neutral-700"
                    placeholder="0"
                />
                <button className="flex items-center space-x-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700 ml-2">
                    <div className="w-5 h-5 rounded-full bg-neutral-700 flex items-center justify-center text-[10px] font-bold">₽</div>
                    <span className="font-bold text-sm">RUB</span>
                    <ArrowDown size={14} className="text-neutral-500" />
                </button>
            </div>
        </div>

        {/* Separator */}
        <div className="flex justify-center -my-3 z-10">
            <div className="bg-[#111] border border-neutral-700 rounded-full p-2 text-neon shadow-lg">
                <ArrowDown size={20} />
            </div>
        </div>

        {/* TO */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center">
                <span className="text-xs text-neutral-500 uppercase font-bold">Получаю</span>
            </div>
            <div className="flex items-center justify-between">
                <input 
                    type="text" 
                    readOnly
                    value={amountTo}
                    className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none placeholder-neutral-700"
                    placeholder="0.00"
                />
                <button className="flex items-center space-x-2 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700 ml-2">
                    <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">B</div>
                    <span className="font-bold text-sm">BTC</span>
                    <ArrowDown size={14} className="text-neutral-500" />
                </button>
            </div>
        </div>

        {/* Info */}
        <div className="mt-6 flex justify-between items-center px-2">
            <span className="text-xs text-neutral-500">Курс обмена</span>
            <span className="text-sm font-mono text-white">1 RUB ≈ {rate} BTC</span>
        </div>

        <div className="mt-auto mb-6">
            <button 
                onClick={handleExchange}
                disabled={!amountFrom}
                className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 shadow-[0_4px_20px_rgba(163,230,53,0.2)]"
            >
                Обменять
            </button>
        </div>

      </div>
    </div>
  );
};

export default ExchangePage;