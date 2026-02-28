import React, { useState, useMemo } from 'react';
import AssetTable, { FilterType } from '../components/AssetTable';
import { MARKET_ASSETS } from '../constants';
import { Asset } from '../types';
import type { SpotHolding, StakingPosition, StakingRate } from '../types';
import { Search, SlidersHorizontal, TrendingUp, X, Info } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { usePin } from '../context/PinContext';
import { useUser } from '../context/UserContext';
import { useWebAuth } from '../context/WebAuthContext';
import { Haptic } from '../utils/haptics';
import { useLiveAssets } from '../utils/useLiveAssets';
import { stake, unstake } from '../lib/staking';
import { useToast } from '../context/ToastContext';
import StakingCreateScreen from './StakingCreateScreen';

const STAKING_TICKERS = ['BTC', 'ETH', 'SOL'];

interface CoinsPageProps {
  onNavigateToTrading: (asset: Asset, options?: { tradeType?: 'futures' | 'spot'; spotAction?: 'buy' | 'sell' }) => void;
  spotHoldings: SpotHolding[];
  stakingPositions: StakingPosition[];
  stakingRates: StakingRate[];
  refreshSpotHoldings: () => Promise<void>;
  refreshStaking: () => Promise<void>;
  userId: number;
  onReferralStake?: (ticker: string, amount: number) => void;
}

const CoinsPage: React.FC<CoinsPageProps> = ({
  onNavigateToTrading,
  spotHoldings,
  stakingPositions,
  stakingRates,
  refreshSpotHoldings,
  refreshStaking,
  userId,
  onReferralStake,
}) => {
  const { t } = useLanguage();
  const toast = useToast();
  const { requirePin } = usePin();
  const { tgid } = useUser();
  const { webUserId } = useWebAuth();
  const pinUserId = String(tgid ?? webUserId ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Top');
  const [stakeScreen, setStakeScreen] = useState<{ ticker: string; maxAmount: number; ratePerMonth: number } | null>(null);
  const [unstakeTicker, setUnstakeTicker] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const liveMarket = useLiveAssets(MARKET_ASSETS);
  const rateByTicker = useMemo(() => {
    const m: Record<string, StakingRate> = {};
    stakingRates.forEach((r) => { m[r.ticker] = r; });
    return m;
  }, [stakingRates]);

  const spotByTicker = useMemo(() => {
    const m: Record<string, SpotHolding> = {};
    spotHoldings.forEach((h) => { m[h.ticker] = h; });
    return m;
  }, [spotHoldings]);

  const filters: { key: FilterType; labelKey: string }[] = [
    { key: 'Top', labelKey: 'filter_top' },
    { key: 'Gainers', labelKey: 'filter_gainers' },
    { key: 'Losers', labelKey: 'filter_losers' },
    { key: 'Vol', labelKey: 'filter_vol' },
    { key: 'New', labelKey: 'filter_new' },
  ];

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return liveMarket;
    const lowerQuery = searchQuery.toLowerCase();
    return liveMarket.filter(
      (asset) =>
        asset.ticker.toLowerCase().includes(lowerQuery) ||
        asset.name.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, liveMarket]);

  const handleOpenStake = (ticker: string) => {
    const holding = spotByTicker[ticker];
    const maxAmount = holding ? holding.amount : 0;
    if (maxAmount <= 0) {
      const asset = liveMarket.find((a) => a.ticker === ticker);
      if (asset) onNavigateToTrading(asset, { tradeType: 'spot', spotAction: 'buy' });
      return;
    }
    const rate = rateByTicker[ticker];
    Haptic.tap();
    setStakeScreen({ ticker, maxAmount, ratePerMonth: rate?.ratePerMonth ?? 0.13 });
  };

  const handleUnstake = async (ticker: string) => {
    if (userId <= 0) return;
    const asset = liveMarket.find((a) => a.ticker === ticker);
    const priceRub = asset?.price ?? 0;
    if (priceRub <= 0) {
      toast.show('Price unknown', 'error');
      return;
    }
    setLoading(true);
    const res = await unstake(userId, ticker, priceRub);
    setLoading(false);
    setUnstakeTicker(null);
    if (res.ok) {
      await refreshStaking();
      toast.show(t('unstake_btn') + ' OK', 'success');
      Haptic.success();
    } else {
      toast.show(res.error || 'Error', 'error');
      Haptic.error();
    }
  };

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
      <div className="sticky top-0 z-50 bg-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.8)] pb-2">
        <div className="px-4 pt-4 pb-2">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-neutral-500 group-focus-within:text-neon transition-colors" />
            </div>
            <input
              type="search"
              inputMode="search"
              autoComplete="off"
              placeholder={t('search_pair')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => Haptic.tap()}
              className="block w-full pl-10 pr-3 py-3 bg-[#0a0a0a] border border-neutral-800 rounded-xl leading-5 text-white placeholder-neutral-600 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 focus:bg-neutral-900 transition-all font-mono text-sm"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar px-4 py-2 border-b border-white/5">
          <div className="pr-2 border-r border-white/10">
            <SlidersHorizontal size={16} className="text-neutral-400" />
          </div>
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => {
                Haptic.tap();
                setActiveFilter(filter.key);
              }}
              className={`
                whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-all active:scale-95
                ${activeFilter === filter.key ? 'bg-neon text-black font-bold shadow-[0_0_10px_rgba(163,230,53,0.3)]' : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'}
              `}
            >
              {t(filter.labelKey)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pb-28 pt-2 min-h-screen">
        {/* Спец предложение — Стейкинг */}
        {userId > 0 && (
          <section className="mb-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wide text-neutral-500 flex items-center gap-1.5">
                <TrendingUp size={12} className="text-neon" />
                {t('special_offer')} · {t('staking_title')}
              </span>
            </div>
            <div className="rounded-xl border border-white/10 bg-[#0a0a0a] overflow-hidden">
              <div className="p-3 border-b border-white/5 flex items-start gap-2">
                <Info size={14} className="text-neon flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-neutral-400 leading-snug">
                  {t('staking_what_is')}
                </p>
              </div>
              <div className="p-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {STAKING_TICKERS.map((ticker) => {
                    const rate = rateByTicker[ticker];
                    const spot = spotByTicker[ticker];
                    const position = stakingPositions.find((p) => p.ticker === ticker);
                    const pct = rate ? Math.round(rate.ratePerMonth * 100) : 13;
                    const hasSpot = (spot?.amount ?? 0) > 0;
                    return (
                      <button
                        key={ticker}
                        onClick={() => handleOpenStake(ticker)}
                        className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-neon/10 border border-white/10 hover:border-neon/30 transition-all text-left min-w-0"
                      >
                        <span className="font-mono font-semibold text-white text-sm">{ticker}</span>
                        <span className="text-[10px] font-mono text-neon">~{pct}%</span>
                        {position && (
                          <span className="text-[10px] text-neutral-400 font-mono" title={`${position.amount.toFixed(4)} + ${position.rewardsAccrued.toFixed(4)}`}>
                            ✓
                          </span>
                        )}
                        {!hasSpot && !position && (
                          <span className="text-[9px] text-neutral-500">→</span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {stakingPositions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                    {stakingPositions.map((pos) => {
                      const asset = liveMarket.find((a) => a.ticker === pos.ticker);
                      const price = asset?.price ?? 0;
                      const totalRub = price * (pos.amount + pos.rewardsAccrued);
                      return (
                        <div key={pos.ticker} className="flex items-center justify-between gap-2 py-1">
                          <span className="text-xs font-mono text-white">{pos.ticker}</span>
                          <span className="text-[10px] text-neutral-400 font-mono truncate flex-1 text-right mx-1">
                            {(pos.amount + pos.rewardsAccrued).toFixed(4)} {price > 0 && `≈ ${totalRub.toFixed(0)} ₽`}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); Haptic.tap(); setUnstakeTicker(pos.ticker); }}
                            className="px-2 py-0.5 rounded text-[10px] font-mono border border-white/20 text-neutral-400 hover:bg-white/5"
                          >
                            {t('unstake_btn')}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {filteredAssets.length > 0 ? (
          <AssetTable
            assets={filteredAssets}
            onAssetClick={onNavigateToTrading}
            externalFilter={activeFilter}
            hideFilterBar={true}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-neutral-600 space-y-2">
            <Search size={32} className="opacity-20" />
            <span className="text-sm font-mono">{t('nothing_found')}</span>
          </div>
        )}
      </div>

      {/* Полноэкранный экран создания стейкинга */}
      {stakeScreen && pinUserId && (
        <StakingCreateScreen
          ticker={stakeScreen.ticker}
          maxAmount={stakeScreen.maxAmount}
          ratePerMonth={stakeScreen.ratePerMonth}
          userId={userId}
          pinUserId={pinUserId}
          requirePin={requirePin}
          onClose={() => setStakeScreen(null)}
          onSuccess={(ticker, amount) => {
            refreshStaking();
            onReferralStake?.(ticker, amount);
          }}
          onError={(msg) => toast.show(msg, 'error')}
        />
      )}

      {/* Модалка вывода из стейкинга */}
      {unstakeTicker && (() => {
        const pos = stakingPositions.find((p) => p.ticker === unstakeTicker);
        const asset = liveMarket.find((a) => a.ticker === unstakeTicker);
        const price = asset?.price ?? 0;
        const total = pos ? pos.amount + pos.rewardsAccrued : 0;
        const totalRub = price * total;
        return (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-[#0f0f0f] border border-white/10 p-4 shadow-xl">
              <h3 className="text-base font-semibold text-white mb-1">
                {t('unstake_modal_title')}
              </h3>
              <p className="text-xs text-neutral-500 mb-3">
                {unstakeTicker} · {t('unstake_you_receive')}:
              </p>
              <div className="rounded-xl bg-[#0a0a0a] border border-white/10 p-3 mb-4">
                <p className="text-lg font-mono font-bold text-neon">
                  {total.toFixed(8)} {unstakeTicker}
                </p>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  {pos && `${pos.amount.toFixed(6)} осн. + ${pos.rewardsAccrued.toFixed(6)} начислено`}
                  {price > 0 && ` · ≈ ${totalRub.toFixed(0)} ₽`}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => { Haptic.tap(); setUnstakeTicker(null); }}
                  className="flex-1 py-3 rounded-xl border border-white/20 text-neutral-300 font-medium text-sm"
                >
                  {t('cancel')}
                </button>
                <button
                  onClick={() => {
                    Haptic.tap();
                    if (pinUserId) {
                      requirePin(pinUserId, t('enter_pin_for_confirm'), () => handleUnstake(unstakeTicker));
                    } else {
                      handleUnstake(unstakeTicker);
                    }
                  }}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-neon text-black font-bold text-sm disabled:opacity-50"
                >
                  {loading ? '...' : t('confirm')}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CoinsPage;
