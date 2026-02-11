import React from 'react';
import { Search, User } from 'lucide-react';
import type { DbUser } from '../context/UserContext';
import { Haptic } from '../utils/haptics';

interface HomeHeaderProps {
  showBalanceTitle: boolean;
  balance: number;
  user: DbUser | null;
  onSearch?: () => void;
}

const HomeHeader: React.FC<HomeHeaderProps> = ({ showBalanceTitle, balance, user, onSearch }) => {
  const formattedBalance = new Intl.NumberFormat('ru-RU', {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(balance);

  return (
    <header className="sticky top-0 z-50 flex justify-between items-center py-4 px-4 bg-[#050505] border-b border-white/5 transition-all duration-300 shadow-md shadow-black/50">
      <div className="flex items-center min-w-0">
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
      </div>

      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 pointer-events-none">
        <div className={`flex flex-col items-center transition-opacity duration-300 ${showBalanceTitle ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 absolute'}`}>
          <span className="text-base font-mono font-bold text-white tracking-tight">{formattedBalance} ₽</span>
        </div>
        <div className={`flex flex-col items-center transition-opacity duration-300 ${!showBalanceTitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 absolute'}`}>
          <span className="text-sm font-medium text-neutral-400 uppercase tracking-widest">Sellbit</span>
        </div>
      </div>

      <button
        onClick={() => { Haptic.tap(); onSearch?.(); }}
        className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-neutral-800 active:bg-neutral-700 active:scale-95 transition-transform flex-shrink-0"
      >
        <Search size={22} className="text-neutral-400" />
      </button>
    </header>
  );
};

export default HomeHeader;