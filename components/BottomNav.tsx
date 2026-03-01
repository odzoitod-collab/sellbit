import React from 'react';
import { Home, Coins, BarChart2, Briefcase, ArrowLeftRight } from 'lucide-react';
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
    { id: 'EXCHANGE', label: t('nav_exchange'), icon: ArrowLeftRight },
    { id: 'DEALS', label: t('nav_deals'), icon: Briefcase },
  ];
  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-50 rounded-t-2xl bg-[#0a0a0a]/98 border-t border-x border-white/10 backdrop-blur-xl shadow-[0_-4px_20px_rgba(0,0,0,0.3)] pt-2"
      style={{ paddingBottom: 'max(8px, env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="flex justify-around items-center h-[50px] px-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => { Haptic.tap(); onNavigate(item.id); }}
              className="flex flex-col items-center justify-center flex-1 min-w-0 h-full space-y-0.5 active:scale-95 transition-transform"
            >
              <div className={`transition-all duration-200 ${isActive ? 'text-neon' : 'text-neutral-500'}`}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[9px] font-medium tracking-wide transition-colors duration-200 truncate w-full text-center leading-tight ${isActive ? 'text-neon' : 'text-neutral-600'}`}>
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