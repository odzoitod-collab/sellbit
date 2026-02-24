import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Scan, User } from 'lucide-react';
import { PageView } from '../types';
import { Haptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';

interface QuickActionsProps {
    onNavigate: (page: PageView) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const { t } = useLanguage();
  const actions: { labelKey: string; icon: any; highlight: boolean; target: PageView }[] = [
    { labelKey: 'quick_deposit', icon: ArrowDownLeft, highlight: true, target: 'DEPOSIT' },
    { labelKey: 'quick_withdraw', icon: ArrowUpRight, highlight: false, target: 'WITHDRAW' },
    { labelKey: 'quick_scan', icon: Scan, highlight: false, target: 'QR_SCANNER' },
    { labelKey: 'profile', icon: User, highlight: false, target: 'PROFILE' },
  ];

  return (
    <div className="flex justify-between items-start px-4 lg:px-6 mb-5 -mt-1 max-w-2xl mx-auto lg:max-w-4xl">
      {actions.map((action) => (
        <div 
            key={action.labelKey} 
            onClick={() => { Haptic.tap(); onNavigate(action.target); }}
            className="flex flex-col items-center space-y-3 group cursor-pointer lg:hover:opacity-90"
        >
          <div 
            className={`
              h-14 w-14 lg:h-16 lg:w-16 rounded-full flex items-center justify-center transition-all duration-300 border border-transparent active:scale-90
              ${action.highlight 
                ? 'bg-neon text-black shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)]' 
                : 'bg-neutral-900 text-white hover:bg-neutral-800 border-white/5 hover:border-white/10'
              }
            `}
          >
            <action.icon size={24} strokeWidth={2} className="lg:w-6 lg:h-6" />
          </div>
          <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-200">
            {t(action.labelKey)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default QuickActions;