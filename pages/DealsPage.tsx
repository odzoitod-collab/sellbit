import React, { useState, useEffect } from 'react';
import { Deal } from '../types';
import { CheckCircle2, XCircle, Timer, TrendingUp, TrendingDown } from 'lucide-react';
import { Haptic } from '../utils/haptics';

interface DealsPageProps {
    deals: Deal[];
}

const DealsPage: React.FC<DealsPageProps> = ({ deals }) => {
    const [activeTab, setActiveTab] = useState<'ACTIVE' | 'HISTORY'>('ACTIVE');
    const [now, setNow] = useState(Date.now());

    // Update timer every second to animate countdowns
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(interval);
    }, []);

    const activeDeals = deals.filter(d => d.status === 'ACTIVE').sort((a, b) => b.startTime - a.startTime);
    const historyDeals = deals.filter(d => d.status !== 'ACTIVE').sort((a, b) => b.startTime - a.startTime);

    const formatTimeLeft = (deal: Deal) => {
        const endTime = deal.startTime + (deal.durationSeconds * 1000);
        const left = Math.max(0, endTime - now);
        const seconds = Math.floor((left / 1000) % 60);
        const minutes = Math.floor((left / 1000 / 60));
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="flex flex-col h-full animate-fade-in px-4 pt-4">
            <h1 className="text-xl font-bold text-white mb-4">Портфель сделок</h1>

            {/* Tabs */}
            <div className="flex bg-[#0a0a0a] rounded-lg p-1 mb-6 border border-white/5">
                <button 
                    onClick={() => { Haptic.tap(); setActiveTab('ACTIVE'); }}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all active:scale-[0.98] ${activeTab === 'ACTIVE' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`}
                >
                    Активные ({activeDeals.length})
                </button>
                <button 
                    onClick={() => { Haptic.tap(); setActiveTab('HISTORY'); }}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all active:scale-[0.98] ${activeTab === 'HISTORY' ? 'bg-neutral-800 text-white shadow' : 'text-neutral-500'}`}
                >
                    История ({historyDeals.length})
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar pb-20 space-y-3">
                
                {activeTab === 'ACTIVE' && activeDeals.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <Timer size={32} className="mb-2 opacity-20" />
                        <span className="text-xs">Нет активных сделок</span>
                    </div>
                )}

                {activeTab === 'ACTIVE' && activeDeals.map(deal => {
                    const isProfitable = (deal.pnl || 0) >= 0;
                    const priceDiff = (deal.currentPrice || deal.entryPrice) - deal.entryPrice;
                    const pricePercent = (priceDiff / deal.entryPrice) * 100;

                    return (
                        <div key={deal.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 relative overflow-hidden">
                            {/* PnL Indicator Border */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${isProfitable ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            
                            <div className="flex justify-between items-start mb-3 pl-2">
                                <div className="flex flex-col">
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-white text-lg">{deal.assetTicker}</span>
                                        <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-1.5 rounded border border-white/5">x{deal.leverage}</span>
                                    </div>
                                    <div className="flex items-center space-x-1 mt-1">
                                        {deal.side === 'UP' ? <TrendingUp size={12} className="text-green-500" /> : <TrendingDown size={12} className="text-red-500" />}
                                        <span className={`text-xs font-bold ${deal.side === 'UP' ? 'text-green-500' : 'text-red-500'}`}>
                                            {deal.side === 'UP' ? 'ВВЕРХ' : 'ВНИЗ'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-xl font-mono text-white font-medium">{formatTimeLeft(deal)}</span>
                                    <span className="text-[10px] text-neutral-500">осталось</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 mt-2 pl-2">
                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                    <span className="text-[10px] text-neutral-500 block">P&L (RUB)</span>
                                    <span className={`text-sm font-mono font-bold ${isProfitable ? 'text-green-500' : 'text-red-500'}`}>
                                        {isProfitable ? '+' : ''}{deal.pnl} ₽
                                    </span>
                                </div>
                                <div className="bg-neutral-900/50 rounded-lg p-2">
                                    <span className="text-[10px] text-neutral-500 block">Цена</span>
                                    <div className="flex items-center space-x-1">
                                         <span className="text-sm font-mono text-white">{deal.currentPrice?.toFixed(2)}</span>
                                         <span className={`text-[10px] font-mono ${priceDiff >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                            ({pricePercent > 0 ? '+' : ''}{pricePercent.toFixed(2)}%)
                                         </span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono mt-3 pt-2 border-t border-dashed border-white/10 pl-2">
                                <span>Вход: {deal.entryPrice.toFixed(2)}</span>
                                <span>Сумма: {deal.amount} ₽</span>
                            </div>
                        </div>
                    );
                })}

                {activeTab === 'HISTORY' && historyDeals.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-40 text-neutral-600">
                        <span className="text-xs">История пуста</span>
                    </div>
                )}

                {activeTab === 'HISTORY' && historyDeals.map(deal => (
                    <div key={deal.id} className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                        <div className="flex flex-col">
                            <div className="flex items-center space-x-2">
                                <span className="font-bold text-white">{deal.assetTicker}</span>
                                <span className={`text-[10px] px-1 rounded ${deal.side === 'UP' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                                    {deal.side === 'UP' ? 'LONG' : 'SHORT'}
                                </span>
                            </div>
                            <span className="text-[10px] text-neutral-500 font-mono mt-1">{formatTime(deal.startTime)}</span>
                        </div>
                        
                        <div className="flex flex-col items-end">
                            <div className="flex items-center space-x-1.5">
                                <span className={`font-mono font-bold text-sm ${deal.status === 'WIN' ? 'text-green-500' : 'text-red-500'}`}>
                                    {deal.status === 'WIN' ? '+' : ''}{deal.pnl} ₽
                                </span>
                                {deal.status === 'WIN' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
                            </div>
                            <span className="text-[10px] text-neutral-500">x{deal.leverage}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DealsPage;