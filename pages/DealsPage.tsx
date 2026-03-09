import React, { useState, useEffect } from 'react';
import { Deal } from '../types';
import type { SpotHolding, StakingPosition, ActivityHistoryItem } from '../types';
import type { Asset } from '../types';
import { Timer, TrendingUp, TrendingDown, Wallet, Lock, History } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { MARKET_ASSETS } from '../constants';
import { useLiveAssets } from '../utils/useLiveAssets';
import { fetchActivityHistory } from '../lib/activityHistory';

interface DealsPageProps {
  deals: Deal[];
  spotHoldings: SpotHolding[];
  stakingPositions?: StakingPosition[];
  userId: number;
  onNavigateToTrading: (asset: Asset, options?: { tradeType?: 'futures' | 'spot'; spotAction?: 'buy' | 'sell' }) => void;
}

const DealsPage: React.FC<DealsPageProps> = ({ deals, spotHoldings, stakingPositions = [], userId, onNavigateToTrading }) => {
    const { formatPrice, symbol } = useCurrency();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY' | 'ASSETS'>('HISTORY');
    const [now, setNow] = useState(Date.now());
    const [activityHistory, setActivityHistory] = useState<ActivityHistoryItem[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const liveAssets = useLiveAssets(MARKET_ASSETS);

    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (activeTab !== 'HISTORY' || userId <= 0) return;
        setHistoryLoading(true);
        fetchActivityHistory(userId).then((list) => {
            setActivityHistory(list);
            setHistoryLoading(false);
        });
    }, [activeTab, userId]);

    const activeDeals = deals.filter(d => d.status === 'ACTIVE').sort((a, b) => b.startTime - a.startTime);

    const formatTimeLeft = (deal: Deal) => {
        const endTime = deal.startTime + (deal.durationSeconds * 1000);
        const left = Math.max(0, endTime - now);
        const seconds = Math.floor((left / 1000) % 60);
        const minutes = Math.floor((left / 1000 / 60));
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatHistoryDate = (createdAt: string) => {
        const d = new Date(createdAt);
        return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full animate-fade-in px-4 pt-4">
            <h1 className="text-xl font-bold text-white mb-4">{t('portfolio_title')}</h1>

            {/* Вкладки: Активные, Мои активы */}
            <div className="flex gap-2 mb-3">
                {[
                    { id: 'ACTIVE' as const, label: t('active_tab'), count: activeDeals.length },
                    { id: 'ASSETS' as const, label: t('my_assets'), count: spotHoldings.length },
                ].map(({ id, label, count }) => (
                    <button
                        key={id}
                        onClick={() => { Haptic.tap(); setActiveTab(id); }}
                        className={`flex-1 py-2.5 px-2 text-xs font-medium rounded-xl transition-all active:scale-[0.98] border ${
                            activeTab === id
                                ? 'bg-card text-white border border-border'
                                : 'bg-surface text-textSecondary border-border hover:text-textPrimary'
                        }`}
                    >
                        {label} ({count})
                    </button>
                ))}
            </div>

            {/* История — минималистичная кнопка в стиле сайта */}
            <button
                type="button"
                onClick={() => { Haptic.tap(); setActiveTab('HISTORY'); }}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg border text-xs font-mono transition-all active:scale-[0.98] mb-4 ${
                    activeTab === 'HISTORY'
                        ? 'bg-card border border-neon text-neon' : 'bg-surface text-textSecondary border border-border hover:text-textPrimary hover:border-neutral-500'
                }`}
            >
                <History size={12} />
                {t('history_tab')}
            </button>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-28 space-y-3">
                
                {activeTab === 'ACTIVE' && activeDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <Timer size={32} className="mb-2 opacity-20" />
                        <span className="text-xs">{t('no_active')}</span>
                    </div>
                )}

                {activeTab === 'ACTIVE' && activeDeals.map(deal => {
                    const isProfitable = (deal.pnl || 0) >= 0;
                    const priceDiff = (deal.currentPrice || deal.entryPrice) - deal.entryPrice;
                    const pricePercent = (priceDiff / deal.entryPrice) * 100;

                    return (
                        <div key={deal.id} className="bg-surface border border-neutral-800 rounded-xl p-4 relative overflow-hidden">
                            {/* PnL Indicator Border */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isProfitable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-white text-lg">{deal.assetTicker}</span>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-1.5 rounded border border-white/5">x{deal.leverage}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 mt-1">
                                        {deal.side === 'UP' ? <TrendingUp size={12} className="text-up" /> : <TrendingDown size={12} className="text-down" />}
                                        <span className={`text-xs font-bold ${deal.side === 'UP' ? 'text-up' : 'text-down'}`}>
                                            {deal.side === 'UP' ? t('up') : t('down')}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-mono text-white font-medium">{formatTimeLeft(deal)}</span>
                                    <span className="text-[10px] text-neutral-500">{t('left')}</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2 pl-2">
                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                    <span className="text-[10px] text-neutral-500 block">P&L</span>
                                    <span className={`text-sm font-mono font-bold ${isProfitable ? 'text-up' : 'text-down'}`}>
                                        {isProfitable ? '+' : ''}{formatPrice(deal.pnl ?? 0)} {symbol}
                                    </span>
                                </div>
                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                    <span className="text-[10px] text-neutral-500 block">{t('price')}</span>
                                    <div className="flex items-center space-x-1">
                                         <span className="text-sm font-mono text-white">{deal.currentPrice != null ? formatPrice(deal.currentPrice) : '—'}</span>
                                         <span className={`text-[10px] font-mono ${priceDiff >= 0 ? 'text-up' : 'text-down'}`}>
                                            ({pricePercent > 0 ? '+' : ''}{pricePercent.toFixed(2)}%)
                                         </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mt-3 pt-2 border-t border-dashed border-white/10 pl-2">
                                <span>{t('entry')}: {formatPrice(deal.entryPrice)}</span>
                                <span>{t('sum')}: {formatPrice(deal.amount)} {symbol}</span>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'HISTORY' && historyLoading && (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <span className="text-xs">{t('loading_rates')}</span>
                    </div>
                )}

                {activeTab === 'HISTORY' && !historyLoading && activityHistory.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <History size={32} className="mb-2 opacity-20" />
                        <span className="text-xs">{t('history_empty')}</span>
                    </div>
                )}

                {activeTab === 'HISTORY' && !historyLoading && activityHistory.length > 0 && activityHistory.map((item) => {
                    const labelMap: Record<ActivityHistoryItem['activity_type'], string> = {
                        spot_buy: t('spot_buy'),
                        spot_sell: t('spot_sell'),
                        stake: t('stake_btn'),
                        unstake: t('unstake_btn'),
                        trade: t('history_trade'),
                        staking_reward: t('staking_reward_history'),
                    };
                    const label = labelMap[item.activity_type];
                    const isGreen = item.activity_type === 'spot_buy' || item.activity_type === 'stake' || item.activity_type === 'staking_reward' || (item.activity_type === 'trade' && (item.amount_rub ?? 0) >= 0);
                    const isRed = item.activity_type === 'spot_sell' || item.activity_type === 'unstake' || (item.activity_type === 'trade' && (item.amount_rub ?? 0) < 0);
                    const ticker = item.ticker || (item.payload?.symbol as string) || '—';
                    const amountRub = item.amount_rub ?? 0;
                    const quantity = item.quantity ?? 0;
                    return (
                        <div key={`${item.id}-${item.created_at}`} className="bg-surface border border-neutral-800 rounded-xl p-4 flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className={`text-xs font-medium ${isGreen ? 'text-up' : isRed ? 'text-down' : 'text-neutral-400'}`}>
                                    {label}
                                </span>
                                <span className="font-mono font-semibold text-white mt-0.5">{ticker}</span>
                                {item.activity_type === 'trade' && item.payload && (
                                    <span className="text-[10px] text-neutral-500 mt-0.5">
                                        {(item.payload as { type?: string }).type ?? ''} · x{(item.payload as { leverage?: number }).leverage ?? 1}
                                    </span>
                                )}
                                {(item.activity_type === 'spot_buy' || item.activity_type === 'spot_sell') && quantity > 0 && (
                                    <span className="text-[10px] text-neutral-500 font-mono">{quantity.toFixed(6)}</span>
                                )}
                                {item.activity_type === 'stake' && quantity > 0 && (
                                    <span className="text-[10px] text-neutral-500 font-mono">{quantity.toFixed(6)}</span>
                                )}
                                {item.activity_type === 'unstake' && quantity > 0 && (
                                    <span className="text-[10px] text-neutral-500 font-mono">{quantity.toFixed(6)}</span>
                                )}
                                {item.activity_type === 'staking_reward' && quantity > 0 && (
                                    <span className="text-[10px] text-neutral-500 font-mono">{quantity.toFixed(6)}</span>
                                )}
                                <span className="text-[10px] text-neutral-500 mt-1">{formatHistoryDate(item.created_at)}</span>
                            </div>
                            <div className="text-right">
                                {item.activity_type === 'trade' && (
                                    <span className={`font-mono font-bold text-sm ${amountRub >= 0 ? 'text-up' : 'text-down'}`}>
                                        {amountRub >= 0 ? '+' : ''}{formatPrice(amountRub)} {symbol}
                                    </span>
                                )}
                                {(item.activity_type === 'spot_buy' || item.activity_type === 'spot_sell') && (
                                    <span className="font-mono text-sm text-white">{formatPrice(amountRub)} {symbol}</span>
                                )}
                                {item.activity_type === 'stake' && (
                                    <span className="font-mono text-sm text-neon">−{formatPrice(amountRub)} {symbol}</span>
                                )}
                                {item.activity_type === 'unstake' && (
                                    <span className="font-mono text-sm text-up">+{formatPrice(amountRub)} {symbol}</span>
                                )}
                                {item.activity_type === 'staking_reward' && (
                                    <span className="font-mono text-sm text-up">+{formatPrice(amountRub)} {symbol}</span>
                                )}
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'ASSETS' && spotHoldings.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <Wallet size={32} className="mb-2 opacity-20" />
                        <span className="text-xs">{t('no_spot_assets')}</span>
                    </div>
                )}

                {activeTab === 'ASSETS' && spotHoldings.length > 0 && spotHoldings.map((holding) => {
                    const asset = MARKET_ASSETS.find(a => a.ticker === holding.ticker) || {
                        id: holding.ticker,
                        ticker: holding.ticker,
                        name: holding.ticker,
                        price: holding.avgPriceRub,
                        volume24h: 0,
                        change24h: 0,
                    };
                    const valueRub = holding.amount * holding.avgPriceRub;
                    return (
                        <button
                            key={holding.ticker}
                            type="button"
                            onClick={() => {
                                Haptic.tap();
                                onNavigateToTrading(asset, { tradeType: 'spot', spotAction: 'sell' });
                            }}
                            className="w-full bg-surface border border-neutral-800 rounded-xl p-4 flex justify-between items-center hover:border-neon/50 active:scale-[0.98] transition-all text-left"
                        >
                            <div className="flex flex-col">
                                <span className="font-bold text-white">{holding.ticker}</span>
                                <span className="text-[10px] text-neutral-500 font-mono mt-0.5">
                                    {holding.amount.toFixed(8)} × {formatPrice(holding.avgPriceRub)} ≈ {formatPrice(valueRub)} {symbol}
                                </span>
                            </div>
                            <span className="text-xs text-neon font-medium">{t('sell')}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default DealsPage;