import React, { useState, useEffect } from 'react';

/** Фейковые последние сделки для вида «как на бирже» */
const TICKER_ITEMS = [
  { pair: 'BTC/RUB', price: '6 250 000', change: '+0.12%', side: 'up' as const },
  { pair: 'ETH/RUB', price: '320 000', change: '-0.05%', side: 'down' as const },
  { pair: 'SOL/RUB', price: '12 500', change: '+1.2%', side: 'up' as const },
  { pair: 'TON/RUB', price: '650', change: '+0.3%', side: 'up' as const },
  { pair: 'BTC/RUB', price: '6 248 000', change: '-0.02%', side: 'down' as const },
  { pair: 'DOGE/RUB', price: '12.80', change: '+5.1%', side: 'up' as const },
  { pair: 'XRP/RUB', price: '55.20', change: '-0.1%', side: 'down' as const },
  { pair: 'ETH/RUB', price: '319 500', change: '+0.8%', side: 'up' as const },
];

const MarketTicker: React.FC = () => {
  const [start, setStart] = useState(0);
  const visible = 4;
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS].slice(start, start + visible);

  useEffect(() => {
    const t = setInterval(() => {
      setStart((s) => (s + 1) % TICKER_ITEMS.length);
    }, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="w-full overflow-hidden rounded-lg bg-black/30 border border-white/5 px-3 py-1">
      <div className="text-[9px] text-neutral-500 uppercase tracking-wider mb-0.5">Последние сделки</div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {items.map((item, i) => (
          <span key={`${item.pair}-${start}-${i}`} className="text-[11px] font-mono flex items-center gap-1 leading-tight">
            <span className="text-white">{item.pair}</span>
            <span className="text-neutral-500">{item.price} ₽</span>
            <span className={item.side === 'up' ? 'text-green-500' : 'text-red-500'}>{item.change}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarketTicker;
