import React, { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { Haptic } from '../utils/haptics';
import { MARKET_ASSETS } from '../constants';
import { useLiveAssets } from '../utils/useLiveAssets';
import type { SpotHolding } from '../types';

export type ExchangeSide = 'currency' | string;

function isExcluded(side: ExchangeSide, exclude: ExchangeSide | null): boolean {
  if (!exclude) return false;
  if (side === 'currency' && exclude === 'currency') return true;
  if (typeof side === 'string' && side === exclude) return true;
  return false;
}

interface ExchangeAssetPickerProps {
  open: boolean;
  title: string;
  mode: 'from' | 'to';
  selected: ExchangeSide;
  exclude: ExchangeSide | null;
  spotHoldings: SpotHolding[];
  balanceRub: number;
  onSelect: (side: ExchangeSide) => void;
  onClose: () => void;
}

const ExchangeAssetPicker: React.FC<ExchangeAssetPickerProps> = ({
  open,
  title,
  mode,
  selected,
  exclude,
  spotHoldings,
  balanceRub,
  onSelect,
  onClose,
}) => {
  const { t } = useLanguage();
  const { formatPrice, symbol } = useCurrency();
  const liveAssets = useLiveAssets(MARKET_ASSETS);
  const [searchQuery, setSearchQuery] = useState('');

  const holdingsByTicker = useMemo(() => {
    const m: Record<string, SpotHolding> = {};
    spotHoldings.forEach((h) => { m[h.ticker] = h; });
    return m;
  }, [spotHoldings]);

  const myHoldings = useMemo(() => spotHoldings.filter((h) => h.amount > 0), [spotHoldings]);

  const assetsForFrom = useMemo(() => {
    return myHoldings
      .map((h) => liveAssets.find((a) => a.ticker === h.ticker))
      .filter(Boolean) as typeof liveAssets;
  }, [myHoldings, liveAssets]);

  const filteredAssetsForFrom = useMemo(() => {
    if (!searchQuery.trim()) return assetsForFrom;
    const q = searchQuery.trim().toLowerCase();
    return assetsForFrom.filter((a) => a.ticker.toLowerCase().includes(q));
  }, [assetsForFrom, searchQuery]);

  const filteredAssetsForTo = useMemo(() => {
    if (!searchQuery.trim()) return liveAssets;
    const q = searchQuery.trim().toLowerCase();
    return liveAssets.filter((a) => a.ticker.toLowerCase().includes(q));
  }, [liveAssets, searchQuery]);

  const filteredAssets = mode === 'from' ? filteredAssetsForFrom : filteredAssetsForTo;

  const handleSelect = (side: ExchangeSide) => {
    if (isExcluded(side, exclude)) return;
    Haptic.tap();
    onSelect(side);
    onClose();
  };

  const handleClose = () => {
    Haptic.tap();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-[#050505] flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/5 flex-shrink-0">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button
          type="button"
          onClick={handleClose}
          className="p-1.5 rounded-lg text-neutral-500 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
          aria-label={t('close')}
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="px-4 pt-2 pb-1.5 flex-shrink-0">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('search_placeholder')}
            className="w-full px-2.5 py-2 rounded-lg bg-white/[0.03] border border-white/5 text-white placeholder:text-neutral-500 text-xs font-mono focus:outline-none focus:border-neon/30"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          <button
            type="button"
            onClick={() => handleSelect('currency')}
            disabled={isExcluded('currency', exclude)}
            className={`w-full flex items-center justify-between gap-2 py-2.5 px-2.5 rounded-lg border text-left transition-all mb-1 ${
              isExcluded('currency', exclude)
                ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02]'
                : selected === 'currency'
                  ? 'bg-neon/10 border-neon/30 text-neon'
                  : 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.04] active:scale-[0.99]'
            }`}
          >
            <div className="min-w-0 flex-1 flex items-center justify-between gap-2">
              <span className="font-mono font-semibold text-sm">{symbol}</span>
              <span className="text-[10px] font-mono text-neutral-500 truncate">
                {t('exchange_balance')}: {formatPrice(balanceRub)}
              </span>
            </div>
          </button>

          <div className="flex flex-col gap-0.5 mt-2">
            {filteredAssets.map((asset) => {
              const holding = holdingsByTicker[asset.ticker];
              const amount = holding?.amount ?? 0;
              const disabled = isExcluded(asset.ticker, exclude);
              const isSelected = selected === asset.ticker;
              const showBalance = mode === 'from' ? true : amount > 0;

              return (
                <button
                  key={asset.ticker}
                  type="button"
                  onClick={() => handleSelect(asset.ticker)}
                  disabled={disabled}
                  className={`w-full flex items-center justify-between gap-2 py-2.5 px-2.5 rounded-lg border text-left transition-all ${
                    disabled
                      ? 'opacity-40 cursor-not-allowed border-white/5 bg-white/[0.02]'
                      : isSelected
                        ? 'bg-neon/10 border-neon/30 text-neon'
                        : 'bg-white/[0.02] border-white/5 text-white hover:bg-white/[0.04] active:scale-[0.99]'
                  }`}
                >
                  <span className="font-mono font-semibold text-sm">{asset.ticker}</span>
                  {showBalance && (
                    <span className="text-[10px] font-mono text-neutral-500 truncate">
                      {mode === 'from' ? `${t('exchange_balance')}: ${amount.toFixed(6)}` : amount.toFixed(6)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {filteredAssets.length === 0 && (
            <p className="text-xs text-neutral-500 py-6 text-center font-mono">{t('nothing_found')}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExchangeAssetPicker;
