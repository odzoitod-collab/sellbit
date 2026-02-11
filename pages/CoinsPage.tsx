import React, { useState, useMemo } from 'react';
import AssetTable, { FilterType } from '../components/AssetTable';
import { MARKET_ASSETS } from '../constants';
import { Asset } from '../types';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useLiveAssets } from '../utils/useLiveAssets';

interface CoinsPageProps {
    onNavigateToTrading: (asset: Asset) => void;
}

const CoinsPage: React.FC<CoinsPageProps> = ({ onNavigateToTrading }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('Top');
  const liveMarket = useLiveAssets(MARKET_ASSETS);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'Top', label: 'Топ' },
    { key: 'Gainers', label: 'Лидеры' },
    { key: 'Losers', label: 'Аутсайдеры' },
    { key: 'Vol', label: 'Объем' },
    { key: 'New', label: 'Новые' },
  ];

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return liveMarket;
    const lowerQuery = searchQuery.toLowerCase();
    return liveMarket.filter(asset =>
      asset.ticker.toLowerCase().includes(lowerQuery) ||
      asset.name.toLowerCase().includes(lowerQuery)
    );
  }, [searchQuery, liveMarket]);

  return (
    <div className="flex flex-col h-full animate-fade-in relative">
        
        {/* Sticky Header Container */}
        <div className="sticky top-0 z-50 bg-[#050505] shadow-[0_10px_30px_rgba(0,0,0,0.8)] pb-2">
            
            {/* Top Row: Search Input */}
            <div className="px-4 pt-4 pb-2">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={18} className="text-neutral-500 group-focus-within:text-neon transition-colors" />
                    </div>
                    <input 
                        type="search"
                        inputMode="search"
                        autoComplete="off"
                        placeholder="Поиск пары (BTC, ETH...)"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => Haptic.tap()}
                        className="block w-full pl-10 pr-3 py-3 bg-[#0a0a0a] border border-neutral-800 rounded-xl leading-5 text-white placeholder-neutral-600 focus:outline-none focus:border-neon/50 focus:ring-1 focus:ring-neon/50 focus:bg-neutral-900 transition-all font-mono text-sm"
                    />
                </div>
            </div>

            {/* Bottom Row: Static Filters */}
            <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar px-4 py-2 border-b border-white/5">
                <div className="pr-2 border-r border-white/10">
                   <SlidersHorizontal size={16} className="text-neutral-400" />
                </div>
                
                {filters.map((filter) => (
                    <button
                        key={filter.key}
                        onClick={() => { Haptic.tap(); setActiveFilter(filter.key); }}
                        className={`
                            whitespace-nowrap px-3 py-1.5 rounded-md text-xs font-mono uppercase tracking-wide transition-all active:scale-95
                            ${activeFilter === filter.key 
                                ? 'bg-neon text-black font-bold shadow-[0_0_10px_rgba(163,230,53,0.3)]' 
                                : 'text-neutral-500 hover:text-neutral-300 hover:bg-white/5'
                            }
                        `}
                    >
                        {filter.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Content Area */}
        <div className="px-4 pb-20 pt-2 min-h-screen">
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
                    <span className="text-sm font-mono">Ничего не найдено</span>
                </div>
            )}
        </div>
    </div>
  );
};

export default CoinsPage;