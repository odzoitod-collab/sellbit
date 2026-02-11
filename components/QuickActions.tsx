import React from 'react';
import { ArrowDownLeft, ArrowUpRight, Repeat, User } from 'lucide-react';
import { PageView } from '../types';
import { Haptic } from '../utils/haptics';

interface QuickActionsProps {
    onNavigate: (page: PageView) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions: { label: string; icon: any; highlight: boolean; target: PageView }[] = [
    { label: 'Пополнить', icon: ArrowDownLeft, highlight: true, target: 'DEPOSIT' },
    { label: 'Вывести', icon: ArrowUpRight, highlight: false, target: 'WITHDRAW' },
    { label: 'Обмен', icon: Repeat, highlight: false, target: 'EXCHANGE' },
    { label: 'Профиль', icon: User, highlight: false, target: 'PROFILE' },
  ];

  return (
    <div className="flex justify-between items-start px-6 mb-8">
      {actions.map((action) => (
        <div 
            key={action.label} 
            onClick={() => { Haptic.tap(); onNavigate(action.target); }}
            className="flex flex-col items-center space-y-3 group cursor-pointer"
        >
          <div 
            className={`
              h-14 w-14 rounded-full flex items-center justify-center transition-all duration-300 border border-transparent active:scale-90
              ${action.highlight 
                ? 'bg-neon text-black shadow-[0_0_15px_rgba(163,230,53,0.3)] hover:shadow-[0_0_25px_rgba(163,230,53,0.5)]' 
                : 'bg-neutral-900 text-white hover:bg-neutral-800 border-white/5 hover:border-white/10'
              }
            `}
          >
            <action.icon size={24} strokeWidth={2} />
          </div>
          <span className="text-xs font-medium text-neutral-400 group-hover:text-neutral-200">
            {action.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default QuickActions;