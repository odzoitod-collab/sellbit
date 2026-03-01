import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext';
import { Haptic } from '../utils/haptics';
import { useLiveAssets } from '../utils/useLiveAssets';
import { MARKET_ASSETS } from '../constants';
import { spotBuy, spotSell } from '../lib/spot';
import { useToast } from '../context/ToastContext';
import ExchangeAssetPicker, { type ExchangeSide } from '../components/ExchangeAssetPicker';
import type { SpotHolding } from '../types';

const MIN_EXCHANGE_RUB = 100;

interface ExchangePageProps {
  spotHoldings: SpotHolding[];
  refreshSpotHoldings: () => Promise<void>;
  onPickerOpenChange?: (open: boolean) => void;
}

const ExchangePage: React.FC<ExchangePageProps> = ({ spotHoldings, refreshSpotHoldings, onPickerOpenChange }) => {
  const { t } = useLanguage();
  const { formatPrice, symbol, convertToRub } = useCurrency();
  const { user, refreshUser } = useUser();
  const toast = useToast();
  const liveAssets = useLiveAssets(MARKET_ASSETS);

  const [fromSide, setFromSide] = useState<ExchangeSide>('currency');
  const [toSide, setToSide] = useState<ExchangeSide>('BTC');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [pickerMode, setPickerMode] = useState<'from' | 'to' | null>(null);

  const openPicker = (mode: 'from' | 'to') => {
    setPickerMode(mode);
    onPickerOpenChange?.(true);
  };
  const closePicker = () => {
    setPickerMode(null);
    onPickerOpenChange?.(false);
  };

  const balanceRub = user?.balance ?? 0;
  const assetFrom = fromSide === 'currency' ? null : liveAssets.find((a) => a.ticker === fromSide) ?? MARKET_ASSETS.find((a) => a.ticker === fromSide);
  const assetTo = toSide === 'currency' ? null : liveAssets.find((a) => a.ticker === toSide) ?? MARKET_ASSETS.find((a) => a.ticker === toSide);
  const priceFromRub = fromSide === 'currency' ? 0 : (assetFrom?.price ?? 0);
  const priceToRub = toSide === 'currency' ? 0 : (assetTo?.price ?? 0);
  const holdingFrom = fromSide === 'currency' ? null : spotHoldings.find((h) => h.ticker === fromSide);
  const fromAmount = fromSide === 'currency' ? 0 : (holdingFrom?.amount ?? 0);

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;

  const isFromCurrency = fromSide === 'currency';
  const isToCurrency = toSide === 'currency';

  const amountInRub = isFromCurrency ? convertToRub(numAmount) : numAmount * priceFromRub;
  const resultQuantity = isToCurrency
    ? (priceToRub > 0 ? amountInRub / priceToRub : 0)
    : (priceToRub > 0 ? amountInRub / priceToRub : 0);
  const resultInCurrency = amountInRub;
  const resultInCrypto = resultQuantity;

  const canSubmit =
    fromSide !== toSide &&
    numAmount > 0 &&
    amountInRub >= MIN_EXCHANGE_RUB &&
    (isFromCurrency
      ? balanceRub >= convertToRub(numAmount) && (isToCurrency || priceToRub > 0)
      : fromAmount >= numAmount && priceFromRub > 0 && (isToCurrency || priceToRub > 0));

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    Haptic.tap();
    setLoading(true);
    try {
      if (isFromCurrency && !isToCurrency) {
        const amountRub = convertToRub(numAmount);
        if (amountRub <= 0 || amountRub > balanceRub) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const res = await spotBuy(user.user_id, toSide as string, amountRub, priceToRub);
        if (res.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(res.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      } else if (!isFromCurrency && isToCurrency) {
        if (numAmount <= 0 || numAmount > fromAmount) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const res = await spotSell(user.user_id, fromSide as string, numAmount, priceFromRub);
        if (res.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(res.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      } else if (!isFromCurrency && !isToCurrency) {
        if (numAmount <= 0 || numAmount > fromAmount || fromSide === toSide) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const sellRes = await spotSell(user.user_id, fromSide as string, numAmount, priceFromRub);
        if (!sellRes.ok || sellRes.amount_rub == null) {
          toast.show(sellRes.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
          setLoading(false);
          return;
        }
        const buyRes = await spotBuy(user.user_id, toSide as string, sellRes.amount_rub, priceToRub);
        if (buyRes.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(buyRes.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fromLabel = isFromCurrency ? symbol : fromSide;
  const toLabel = isToCurrency ? symbol : toSide;
  const fromSub = isFromCurrency ? `${formatPrice(balanceRub)} ${symbol}` : (holdingFrom ? `${fromAmount.toFixed(6)} ${fromSide}` : null);
  const resultText = isToCurrency
    ? `≈ ${formatPrice(resultInCurrency)} ${symbol}`
    : `≈ ${resultInCrypto.toFixed(8)} ${toSide}`;

  return (
    <div className="flex flex-col h-full animate-fade-in px-4 pt-2 pb-6">
      <h1 className="text-base font-semibold text-white mb-3">{t('exchange_title')}</h1>

      <div className="rounded-lg border border-white/5 bg-[#0a0a0a] p-3 mb-2">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">{t('from_label')}</p>
        <button
          type="button"
          onClick={() => { Haptic.tap(); openPicker('from'); }}
          className="w-full flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg bg-[#050505] border border-white/5 hover:border-white/10 transition-colors text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono font-semibold text-sm text-white truncate">{fromLabel}</p>
            {fromSub && <p className="text-[10px] font-mono text-neutral-500 truncate">{fromSub}</p>}
          </div>
          <ChevronDown size={16} className="text-neutral-500 flex-shrink-0" />
        </button>
        <input
          type="text"
          inputMode="decimal"
          placeholder={isFromCurrency ? `0 ${symbol}` : '0'}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          className="mt-2 w-full bg-[#050505] border border-white/5 rounded-lg px-3 py-2.5 text-white font-mono text-base focus:outline-none focus:border-neon/30"
        />
        <p className="mt-1 text-[10px] font-mono text-neutral-500">
          {t('exchange_min_amount', { amount: `${formatPrice(MIN_EXCHANGE_RUB)} ${symbol}` })}
        </p>
        {!isFromCurrency && fromAmount > 0 && (
          <button
            type="button"
            onClick={() => { Haptic.tap(); setAmount(String(fromAmount)); }}
            className="mt-1.5 text-[10px] font-mono text-neon"
          >
            {t('exchange_max')}: {fromAmount.toFixed(6)}
          </button>
        )}
      </div>

      <div className="rounded-lg border border-white/5 bg-[#0a0a0a] p-3 mb-4">
        <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1.5">{t('to_label')}</p>
        <button
          type="button"
          onClick={() => { Haptic.tap(); openPicker('to'); }}
          className="w-full flex items-center justify-between gap-2 py-2 px-2.5 rounded-lg bg-[#050505] border border-white/5 hover:border-white/10 transition-colors text-left"
        >
          <div className="min-w-0 flex-1">
            <p className="font-mono font-semibold text-sm text-white truncate">{toLabel}</p>
            {!isToCurrency && assetTo && (
              <p className="text-[10px] font-mono text-neutral-500 truncate">{formatPrice(assetTo.price)} {symbol}</p>
            )}
          </div>
          <ChevronDown size={16} className="text-neutral-500 flex-shrink-0" />
        </button>
        {amount && numAmount > 0 && (
          <p className="mt-2 text-base font-mono font-semibold text-neon">{resultText}</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full py-3 rounded-lg bg-neon text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform border-0"
      >
        {loading ? '...' : t('exchange_btn')}
      </button>

      {!user && (
        <p className="mt-3 text-center text-xs text-neutral-500">
          {t('exchange_login_hint')}
        </p>
      )}

      <ExchangeAssetPicker
        open={pickerMode !== null}
        title={pickerMode === 'from' ? t('exchange_picker_from') : t('exchange_picker_to')}
        mode={pickerMode ?? 'to'}
        selected={pickerMode === 'from' ? fromSide : toSide}
        exclude={pickerMode === 'from' ? toSide : fromSide}
        spotHoldings={spotHoldings}
        balanceRub={balanceRub}
        onSelect={pickerMode === 'from' ? setFromSide : setToSide}
        onClose={closePicker}
      />
    </div>
  );
};

export default ExchangePage;
