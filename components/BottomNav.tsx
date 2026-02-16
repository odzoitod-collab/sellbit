import React from 'react';
import { Home, Coins, BarChart2, Briefcase } from 'lucide-react';
import { PageView, NavItem } from '../types';
import { Haptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface BottomNavProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { t } = useLanguage();
  const navItems: NavItem[] = [
    { id: 'HOME', label: t('nav_home'), icon: Home },
    { id: 'COINS', label: t('nav_coins'), icon: Coins },
    { id: 'TRADING', label: t('nav_trading'), icon: BarChart2 },
    { id: 'DEALS', label: t('nav_deals'), icon: Briefcase },
  ];
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-[#050505] border-t border-white/10 pt-2 px-2 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex justify-around items-center max-w-md mx-auto h-[70px] pb-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => { Haptic.tap(); onNavigate(item.id); }}
              className="flex flex-col items-center justify-center w-full h-full space-y-1.5 active:scale-95 transition-transform"
            >
              <div className={`transition-all duration-200 ${isActive ? 'text-neon' : 'text-neutral-500'}`}>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[11px] font-medium tracking-wide transition-colors duration-200 ${isActive ? 'text-neon' : 'text-neutral-600'}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;