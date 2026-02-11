import React from 'react';
import BottomNav from './BottomNav';
import { PageView } from '../types';
import { useKeyboard } from '../context/KeyboardContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

const PAGES_WITHOUT_BOTTOM_NAV: PageView[] = ['KYC', 'DEPOSIT', 'WITHDRAW'];

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { keyboardOpen } = useKeyboard();
  const hideBottomNav = PAGES_WITHOUT_BOTTOM_NAV.includes(currentPage) || keyboardOpen;

  return (
    <div className="h-screen min-h-[100dvh] bg-background text-white flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon/5 rounded-full blur-[120px] pointer-events-none z-0" />
      
      {/* Main: no bottom padding when nav hidden (KYC, Deposit, Withdraw) or keyboard open */}
      <main
        className={`flex-1 overflow-y-auto w-full max-w-md mx-auto relative z-10 no-scrollbar scroll-smooth overscroll-contain transition-[padding] duration-150 ${
          hideBottomNav ? 'pb-2' : 'pb-24'
        }`}
      >
        {children}
      </main>
      
      {/* Bottom nav: hidden on KYC, Deposit, Withdraw and when keyboard is open */}
      {!PAGES_WITHOUT_BOTTOM_NAV.includes(currentPage) && (
        <div
          className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out ${
            keyboardOpen ? 'translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
        >
          <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        </div>
      )}
    </div>
  );
};

export default Layout;