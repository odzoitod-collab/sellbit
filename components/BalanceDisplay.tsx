import React from 'react';

interface BalanceDisplayProps {
  balance: number;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ balance }) => {
  // Format: 1 250 000
  const formattedBalance = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(balance);

  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-3 space-y-3 relative">
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
        Общий баланс
      </span>
      
      <div className="flex items-baseline space-x-2">
        <span className="text-5xl font-mono font-bold text-white tracking-tighter">
          {formattedBalance}
        </span>
        <span className="text-2xl font-mono text-neon font-light">₽</span>
      </div>
      <span className="text-[10px] text-neutral-600">Курсы в реальном времени · В рублях</span>
    </div>
  );
};

export default BalanceDisplay;