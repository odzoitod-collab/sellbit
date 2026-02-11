import React, { useState } from 'react';
import { Asset } from '../types';
import { Filter } from 'lucide-react';
import { Haptic } from '../utils/haptics';

export type FilterType = 'Top' | 'Gainers' | 'Losers' | 'Vol' | 'New';

interface AssetTableProps {
  assets: Asset[];
  onAssetClick?: (asset: Asset) => void;
  externalFilter?: FilterType; // Optional prop to control sort from outside
  hideFilterBar?: boolean;     // Optional prop to hide the internal filter UI
}

const AssetTable: React.FC<AssetTableProps> = ({ 
  assets, 
  onAssetClick, 
  externalFilter, 
  hideFilterBar = false 
}) => {
  const [internalFilter, setInternalFilter] = useState<FilterType>('Top');

  // Use external filter if provided, otherwise use internal state
  const activeFilter = externalFilter || internalFilter;

  // Mapping internal logic to Russian display names
  const filters: { key: FilterType; label: string }[] = [
    { key: 'Top', label: 'Топ' },
    { key: 'Gainers', label: 'Рост' },
    { key: 'Losers', label: 'Падение' },
    { key: 'Vol', label: 'Объем' },
    { key: 'New', label: 'Новые' },
  ];

  const sortedAssets = [...assets].sort((a, b) => {
    switch (activeFilter) {
      case 'Gainers': return b.change24h - a.change24h;
      case 'Losers': return a.change24h - b.change24h;
      case 'Vol': return b.volume24h - a.volume24h;
      default: return 0; // Top
    }
  });

  const formatPrice = (price: number) => {
    const fractionDigits = price < 1 ? 6 : (price < 100 ? 2 : 0);
    return new Intl.NumberFormat('ru-RU', {
      style: 'decimal',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(price);
  };

  const formatVol = (vol: number) => {
    if (vol >= 1000000000) return (vol / 1000000000).toFixed(1) + 'млрд';
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'млн';
    return (vol / 1000).toFixed(0) + 'тыс';
  };

  return (
    <div className="flex flex-col w-full relative">
      {!hideFilterBar && (
        <div className="sticky top-[73px] z-40 bg-[#050505] py-2 mb-1 -mx-4 px-4 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <Filter size={14} className="text-neutral-500 flex-shrink-0" />
          {filters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => { Haptic.tap(); setInternalFilter(filter.key); }}
              className={`text-xs font-mono uppercase tracking-wide px-3 py-1.5 rounded-md whitespace-nowrap active:scale-95 transition-colors ${
                activeFilter === filter.key ? 'bg-white/10 text-neon' : 'text-neutral-500 hover:text-neutral-300'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-12 gap-1 text-[10px] uppercase tracking-wider text-neutral-500 mb-0.5 px-1">
        <div className="col-span-5 text-left">Пара</div>
        <div className="col-span-3 text-right">Цена</div>
        <div className="col-span-4 text-right">24ч</div>
      </div>

      <div className="flex flex-col gap-0.5 pb-4">
        {sortedAssets.map((asset) => (
          <div
            key={asset.id}
            onClick={() => { Haptic.tap(); onAssetClick?.(asset); }}
            className="grid grid-cols-12 gap-1 items-center py-2.5 px-2 rounded-lg bg-white/[0.02] active:bg-white/[0.06] transition-colors cursor-pointer group"
          >
            <div className="col-span-5 flex flex-col min-w-0">
              <span className="text-sm font-bold text-white group-hover:text-neon transition-colors truncate">
                {asset.ticker}
              </span>
              <span className="text-[10px] text-neutral-500 truncate">{asset.name}</span>
            </div>
            <div className="col-span-3 flex flex-col items-end justify-center">
              <span className="text-xs font-mono text-white tabular-nums">
                {formatPrice(asset.price)}
              </span>
              <span className="text-[9px] text-neutral-500">₽</span>
            </div>
            <div className="col-span-4 flex flex-col items-end justify-center">
              <span className={`text-xs font-mono tabular-nums ${asset.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {asset.change24h > 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
              </span>
              <span className="text-[9px] text-neutral-500">{formatVol(asset.volume24h)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssetTable;