import React, { useRef, useEffect, useState } from 'react';
import HomeHeader from '../components/HomeHeader';
import BalanceDisplay from '../components/BalanceDisplay';
import QuickActions from '../components/QuickActions';
import MarketTicker from '../components/MarketTicker';
import AssetTable from '../components/AssetTable';
import { MOCK_ASSETS } from '../constants';
import { Asset, PageView } from '../types';
import { useLiveAssets } from '../utils/useLiveAssets';

interface HomePageProps {
    balance: number;
    user: import('../context/UserContext').DbUser | null;
    onNavigateToTrading: (asset: Asset) => void;
    onSearch: () => void;
    onNavigate: (page: PageView) => void;
}

const HomePage: React.FC<HomePageProps> = ({ balance, user, onNavigateToTrading, onSearch, onNavigate }) => {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);
  const liveAssets = useLiveAssets(MOCK_ASSETS);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        // If entry is NOT intersecting (ratio 0), it means it's out of view
        setIsBalanceHidden(!entry.isIntersecting);
      },
      {
        root: null, // viewport
        threshold: 0.2, // Trigger when 20% of the element is visible (mostly scrolled out)
      }
    );

    if (balanceRef.current) {
      observer.observe(balanceRef.current);
    }

    return () => {
      if (balanceRef.current) {
        observer.unobserve(balanceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col min-h-full animate-fade-in">
      {/* Pass state to header to toggle title */}
      <HomeHeader 
        showBalanceTitle={isBalanceHidden} 
        balance={balance} 
        user={user}
        onSearch={onSearch} 
      />
      
      {/* Wrap BalanceDisplay in a ref div to track scrolling */}
      <div ref={balanceRef} className="opacity-100 transition-opacity duration-300">
        <BalanceDisplay balance={balance} />
      </div>

      <QuickActions onNavigate={onNavigate} />

      {/* Полоска как на бирже: объём 24ч + статус */}
      <div className="px-4 mt-2 flex items-center justify-between text-[11px] text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
          Все системы работают
        </span>
        <span className="font-mono">24ч объём: 12.4 млрд ₽</span>
      </div>

      <div className="px-4 mt-3">
        <MarketTicker />
      </div>
      
      <div className="mt-4 flex-1 px-4 pb-28">
        <AssetTable assets={liveAssets} onAssetClick={onNavigateToTrading} />
      </div>
    </div>
  );
};

export default HomePage;