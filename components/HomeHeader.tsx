import React from 'react';
import { Search, User } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import type { DbUser } from '../context/UserContext';
import { Haptic } from '../utils/haptics';
import { useCurrency } from '../context/CurrencyContext';

interface HomeHeaderProps {
  showBalanceTitle: boolean;
  balance: number;
  user: DbUser | null;
  onSearch?: () => void;
  onProfileClick?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ showBalanceTitle, balance, user, onSearch, onProfileClick }) => {
  const { formatPrice, symbol } = useCurrency();
  const { t } = useLanguage();
  const formattedBalance = formatPrice(balance, { fractionDigits: 0 });

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center py-4 px-4 bg-background border-b border-border transition-all duration-300">
      <button
        type="button"
        onClick={() => { Haptic.tap(); onProfileClick?.(); }}
        className="touch-target flex items-center min-w-0 p-1 rounded-full hover:bg-card active:scale-[0.97] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/30"
      >
        {user?.photo_url ? (
          <img
            src={user.photo_url}
            alt=""
            className="h-9 w-9 rounded-full border border-neutral-700 object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-9 w-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neon flex-shrink-0">
            <User size={18} />
          </div>
        )}
      </button>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none">
        <div className={`flex flex-col items-center transition-opacity duration-300 ${showBalanceTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute'}`}>
          <span className="text-base font-mono font-semibold text-textPrimary tracking-heading">{formattedBalance} {symbol}</span>
        </div>
        <div className={`flex flex-col items-center transition-opacity duration-300 ${!showBalanceTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
          <span className="text-sm font-medium text-textSecondary uppercase tracking-cap">{t('sellbit')}</span>
        </div>
      </div>

      <button
        onClick={() => { Haptic.tap(); onSearch?.(); }}
        className="touch-target h-10 w-10 rounded-xl flex items-center justify-center hover:bg-card active:scale-[0.97] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-neon/30 flex-shrink-0"
      >
        <Search size={22} className="text-textSecondary" />
      </button>
    </header>
  );
};

export default HomeHeader;