import React, { useState } from 'react';
import { ChevronDown, ArrowLeftRight } from 'lucide-react';
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
      <div className="max-w-2xl w-full mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-card border border-border/70 flex items-center justify-center text-neon/90 transition-transform duration-200">
            <ArrowLeftRight size={14} />
          </div>
          <h1 className="text-sm font-semibold text-white tracking-wide">{t('exchange_title')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          {/* FROM */}
          <div className="rounded-xl bg-card border border-border/70 p-3">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.16em] mb-1.5">{t('from_label')}</p>
            <button
              type="button"
              onClick={() => { Haptic.tap(); openPicker('from'); }}
              className="w-full flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-background/80 border border-border/60 hover:border-neon/40 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold text-xs text-white truncate">{fromLabel}</p>
                {fromSub && <p className="text-[10px] font-mono text-neutral-500 truncate">{fromSub}</p>}
              </div>
              <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />
            </button>
            <input
              type="text"
              inputMode="decimal"
              placeholder={isFromCurrency ? `0 ${symbol}` : '0'}
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
              className="mt-2 w-full bg-background/80 border border-border/60 rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-neon/40"
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

          {/* TO */}
          <div className="rounded-xl bg-card border border-border/70 p-3">
            <p className="text-[10px] text-neutral-500 uppercase tracking-[0.16em] mb-1.5">{t('to_label')}</p>
            <button
              type="button"
              onClick={() => { Haptic.tap(); openPicker('to'); }}
              className="w-full flex items-center justify-between gap-2 py-1.5 px-2.5 rounded-lg bg-background/80 border border-border/60 hover:border-neon/40 transition-colors text-left"
            >
              <div className="min-w-0 flex-1">
                <p className="font-mono font-semibold text-xs text-white truncate">{toLabel}</p>
                {!isToCurrency && assetTo && (
                  <p className="text-[10px] font-mono text-neutral-500 truncate">
                    {assetTo.priceUnavailable ? '—' : formatPrice(assetTo.price)} {symbol}
                  </p>
                )}
              </div>
              <ChevronDown size={14} className="text-neutral-500 flex-shrink-0" />
            </button>
            {amount && numAmount > 0 && (
              <p className="mt-2 text-sm font-mono font-semibold text-neon">{resultText}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit || loading}
          className="w-full py-2.5 rounded-xl bg-neon text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
        >
          {loading ? '...' : t('exchange_btn')}
        </button>

        {!user && (
          <p className="mt-3 text-center text-[11px] text-neutral-500">
            {t('exchange_login_hint')}
          </p>
        )}
      </div>

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
