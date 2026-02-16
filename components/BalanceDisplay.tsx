import React from 'react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';

interface BalanceDisplayProps {
  balance: number;
  onCurrencyClick?: () => void;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({ balance, onCurrencyClick }) => {
  const { formatPrice, symbol, baseCurrency } = useCurrency();
  const { t } = useLanguage();

  const formattedBalance = formatPrice(balance, { fractionDigits: 0 });
  const currencyKey = baseCurrency === 'usd' ? 'currency_dollars' : baseCurrency === 'rub' ? 'currency_rubles' : baseCurrency === 'eur' ? 'currency_euros' : 'currency_default';
  const currencyName = t(currencyKey);

  return (
    <div className="flex flex-col items-center justify-center pt-8 pb-3 space-y-3 relative">
      <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
        {t('total_balance')}
      </span>
      
      <div className="flex items-baseline space-x-2">
        <span className="text-5xl font-mono font-bold text-white tracking-tighter">
          {formattedBalance}
        </span>
        <span className="text-2xl font-mono text-neon font-light">{symbol}</span>
      </div>
      <button
        type="button"
        onClick={onCurrencyClick}
        className="text-[10px] text-neutral-500 hover:text-neon active:text-neon underline decoration-dotted decoration-neutral-600 hover:decoration-neon underline-offset-2 transition-colors cursor-pointer"
      >
        {t('rates_realtime')} · {t('in_currency', { currency: currencyName })}
      </button>
    </div>
  );
};

export default BalanceDisplay;