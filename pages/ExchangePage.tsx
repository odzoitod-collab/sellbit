import React, { useState } from 'react';
import { ArrowDownUp, Wallet, Coins } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import { useUser } from '../context/UserContext';
import { Haptic } from '../utils/haptics';
import { useLiveAssets } from '../utils/useLiveAssets';
import { MARKET_ASSETS } from '../constants';
import { spotBuy, spotSell } from '../lib/spot';
import { useToast } from '../context/ToastContext';
import type { SpotHolding } from '../types';

const EXCHANGE_CRYPTO_TICKERS = ['BTC', 'ETH', 'SOL', 'USDT', 'TON'];

interface ExchangePageProps {
  spotHoldings: SpotHolding[];
  refreshSpotHoldings: () => Promise<void>;
}

const ExchangePage: React.FC<ExchangePageProps> = ({ spotHoldings, refreshSpotHoldings }) => {
  const { t } = useLanguage();
  const { formatPrice, symbol, convertToRub } = useCurrency();
  const { user, refreshUser } = useUser();
  const toast = useToast();
  const liveAssets = useLiveAssets(MARKET_ASSETS);

  const [direction, setDirection] = useState<'currency_to_crypto' | 'crypto_to_currency' | 'crypto_to_crypto'>('currency_to_crypto');
  const [selectedTicker, setSelectedTicker] = useState<string>(EXCHANGE_CRYPTO_TICKERS[0]);
  const [selectedToTicker, setSelectedToTicker] = useState<string>(EXCHANGE_CRYPTO_TICKERS[1]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const balanceRub = user?.balance ?? 0;
  const asset = liveAssets.find((a) => a.ticker === selectedTicker) ?? MARKET_ASSETS.find((a) => a.ticker === selectedTicker);
  const assetTo = liveAssets.find((a) => a.ticker === selectedToTicker) ?? MARKET_ASSETS.find((a) => a.ticker === selectedToTicker);
  const priceRub = asset?.price ?? 0;
  const priceToRub = assetTo?.price ?? 0;
  const holding = spotHoldings.find((h) => h.ticker === selectedTicker);
  const holdingAmount = holding?.amount ?? 0;

  const numAmount = parseFloat(amount.replace(',', '.')) || 0;

  const resultQuantity = direction === 'currency_to_crypto'
    ? (priceRub > 0 ? (convertToRub(numAmount) / priceRub) : 0)
    : direction === 'crypto_to_currency'
      ? numAmount
      : (priceRub > 0 && priceToRub > 0 ? (numAmount * priceRub) / priceToRub : 0);
  const resultRub = direction === 'currency_to_crypto'
    ? convertToRub(numAmount)
    : numAmount * priceRub;

  const canSubmitCurrencyToCrypto = balanceRub >= convertToRub(numAmount) && numAmount > 0 && priceRub > 0;
  const canSubmitCryptoToCurrency = holdingAmount >= numAmount && numAmount > 0 && priceRub > 0;
  const canSubmitCryptoToCrypto = direction === 'crypto_to_crypto'
    ? holdingAmount >= numAmount && numAmount > 0 && priceRub > 0 && priceToRub > 0 && selectedTicker !== selectedToTicker
    : false;

  const handleSubmit = async () => {
    if (!user) return;
    Haptic.tap();
    setLoading(true);
    try {
      if (direction === 'currency_to_crypto') {
        const amountRub = convertToRub(numAmount);
        if (amountRub <= 0 || amountRub > balanceRub) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const res = await spotBuy(user.user_id, selectedTicker, amountRub, priceRub);
        if (res.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(res.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      } else if (direction === 'crypto_to_crypto') {
        if (numAmount <= 0 || numAmount > holdingAmount || selectedTicker === selectedToTicker) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const sellRes = await spotSell(user.user_id, selectedTicker, numAmount, priceRub);
        if (!sellRes.ok || sellRes.amount_rub == null) {
          toast.show(sellRes.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
          setLoading(false);
          return;
        }
        const buyRes = await spotBuy(user.user_id, selectedToTicker, sellRes.amount_rub, priceToRub);
        if (buyRes.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(buyRes.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      } else {
        if (numAmount <= 0 || numAmount > holdingAmount) {
          toast.show(t('exchange_insufficient_balance'), 'error');
          setLoading(false);
          return;
        }
        const res = await spotSell(user.user_id, selectedTicker, numAmount, priceRub);
        if (res.ok) {
          toast.show(t('exchange_success'), 'success');
          setAmount('');
          await Promise.all([refreshSpotHoldings(), refreshUser()]);
          Haptic.success();
        } else {
          toast.show(res.error ?? t('exchange_insufficient_balance'), 'error');
          Haptic.error();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = direction === 'currency_to_crypto'
    ? canSubmitCurrencyToCrypto
    : direction === 'crypto_to_currency'
      ? canSubmitCryptoToCurrency
      : canSubmitCryptoToCrypto;

  return (
    <div className="flex flex-col h-full animate-fade-in px-4 pt-4 pb-6">
      <h1 className="text-xl font-bold text-white mb-4">{t('exchange_title')}</h1>

      {/* Direction toggle */}
      <div className="flex rounded-xl bg-[#0a0a0a] border border-white/10 p-1 mb-6">
        <button
          type="button"
          onClick={() => { Haptic.tap(); setDirection('currency_to_crypto'); setAmount(''); }}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            direction === 'currency_to_crypto'
              ? 'bg-neon/20 text-neon border border-neon/40'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Wallet size={16} />
          <span>{symbol}→</span>
          <Coins size={16} />
        </button>
        <button
          type="button"
          onClick={() => { Haptic.tap(); setDirection('crypto_to_currency'); setAmount(''); }}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            direction === 'crypto_to_currency'
              ? 'bg-neon/20 text-neon border border-neon/40'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Coins size={16} />
          <span>→{symbol}</span>
          <Wallet size={16} />
        </button>
        <button
          type="button"
          onClick={() => { Haptic.tap(); setDirection('crypto_to_crypto'); setAmount(''); if (selectedToTicker === selectedTicker) setSelectedToTicker(EXCHANGE_CRYPTO_TICKERS.find((t) => t !== selectedTicker) ?? EXCHANGE_CRYPTO_TICKERS[1]); }}
          className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg text-xs font-medium transition-all ${
            direction === 'crypto_to_crypto'
              ? 'bg-neon/20 text-neon border border-neon/40'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          <Coins size={16} />
          <span>↔</span>
          <Coins size={16} />
        </button>
      </div>

      {/* From block */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 mb-3">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-2">{t('from_label')}</p>
        {direction === 'currency_to_crypto' ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                <Wallet size={20} className="text-neon" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-white truncate">{t('exchange_currency_label')}</p>
                <p className="text-xs text-neutral-500">≈ {formatPrice(balanceRub)} {symbol}</p>
              </div>
            </div>
          </div>
        ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar flex-wrap">
              {spotHoldings.filter((h) => h.amount > 0).length > 0
                ? spotHoldings.filter((h) => h.amount > 0).map((h) => (
                    <button
                      key={h.ticker}
                      type="button"
                      onClick={() => { Haptic.tap(); setSelectedTicker(h.ticker); setAmount(''); }}
                      className={`shrink-0 px-3 py-2 rounded-lg text-sm font-mono border transition-all ${
                        selectedTicker === h.ticker
                          ? 'bg-neon/20 text-neon border-neon/50'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {h.ticker}
                    </button>
                  ))
                : EXCHANGE_CRYPTO_TICKERS.map((ticker) => (
                    <button
                      key={ticker}
                      type="button"
                      onClick={() => { Haptic.tap(); setSelectedTicker(ticker); setAmount(''); }}
                      className={`shrink-0 px-3 py-2 rounded-lg text-sm font-mono border transition-all ${
                        selectedTicker === ticker
                          ? 'bg-neon/20 text-neon border-neon/50'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {ticker}
                    </button>
                  ))}
            </div>
        )}
        <input
          type="text"
          inputMode="decimal"
          placeholder={direction === 'currency_to_crypto' ? `0 ${symbol}` : '0'}
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, ''))}
          className="mt-3 w-full bg-[#050505] border border-neutral-800 rounded-xl px-4 py-3 text-white font-mono text-lg focus:outline-none focus:border-neon/50"
        />
        {direction !== 'currency_to_crypto' && holdingAmount > 0 && (
          <button
            type="button"
            onClick={() => { Haptic.tap(); setAmount(String(holdingAmount)); }}
            className="mt-2 text-xs text-neon font-medium"
          >
            Max: {holdingAmount.toFixed(6)} {selectedTicker}
          </button>
        )}
      </div>

      {/* Arrow */}
      <div className="flex justify-center py-1">
        <ArrowDownUp size={20} className="text-neutral-600" />
      </div>

      {/* To block */}
      <div className="rounded-xl border border-white/10 bg-[#0a0a0a] p-4 mb-6">
        <p className="text-[11px] text-neutral-500 uppercase tracking-wide mb-2">{t('to_label')}</p>
        {direction === 'currency_to_crypto' ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-wrap">
            {EXCHANGE_CRYPTO_TICKERS.map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => { Haptic.tap(); setSelectedTicker(ticker); }}
                className={`shrink-0 px-3 py-2 rounded-lg text-sm font-mono border transition-all ${
                  selectedTicker === ticker
                    ? 'bg-neon/20 text-neon border-neon/50'
                    : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        ) : direction === 'crypto_to_crypto' ? (
          <div className="flex gap-2 overflow-x-auto no-scrollbar flex-wrap">
            {EXCHANGE_CRYPTO_TICKERS.filter((t) => t !== selectedTicker).map((ticker) => (
              <button
                key={ticker}
                type="button"
                onClick={() => { Haptic.tap(); setSelectedToTicker(ticker); }}
                className={`shrink-0 px-3 py-2 rounded-lg text-sm font-mono border transition-all ${
                  selectedToTicker === ticker
                    ? 'bg-neon/20 text-neon border-neon/50'
                    : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
                }`}
              >
                {ticker}
              </button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
              <Wallet size={20} className="text-neon" />
            </div>
            <div>
              <p className="font-medium text-white">{t('exchange_currency_label')}</p>
              <p className="text-xs text-neutral-500">{symbol}</p>
            </div>
          </div>
        )}
        {amount && numAmount > 0 && (
          <p className="mt-3 text-lg font-mono font-bold text-neon">
            {direction === 'currency_to_crypto'
              ? `≈ ${resultQuantity.toFixed(8)} ${selectedTicker}`
              : direction === 'crypto_to_crypto'
                ? `≈ ${resultQuantity.toFixed(8)} ${selectedToTicker}`
                : `≈ ${formatPrice(resultRub)} ${symbol}`}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit || loading}
        className="w-full py-3.5 rounded-xl bg-neon text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(163,230,53,0.2)]"
      >
        {loading ? '...' : t('exchange_btn')}
      </button>

      {!user && (
        <p className="mt-4 text-center text-sm text-neutral-500">
          {t('exchange_currency_label')}: войдите или пополните баланс.
        </p>
      )}
    </div>
  );
};

export default ExchangePage;
