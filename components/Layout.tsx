import React from 'react';
import BottomNav from './BottomNav';
import SidebarNav from './SidebarNav';
import { PageView } from '../types';
import { useKeyboard } from '../context/KeyboardContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  hideNavigation?: boolean;
}

const PAGES_WITHOUT_BOTTOM_NAV: PageView[] = ['KYC', 'CURRENCY', 'LANGUAGE'];

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate, hideNavigation = false }) => {
  const { keyboardOpen } = useKeyboard();
  const hideBottomNav = PAGES_WITHOUT_BOTTOM_NAV.includes(currentPage) || keyboardOpen || hideNavigation;

  return (
    <div className="h-screen min-h-[100dvh] bg-background text-white flex flex-col lg:flex-row relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-neon/3 rounded-full blur-[100px] pointer-events-none z-0 hidden lg:block" />

      {/* Desktop: sidebar (скрыт на DEPOSIT, WITHDRAW, KYC и т.д.) */}
      {!hideBottomNav && <SidebarNav currentPage={currentPage} onNavigate={onNavigate} />}

      {/* Main: адаптивная ширина под все экраны */}
      <main
        className={`flex-1 overflow-y-auto w-full relative z-10 no-scrollbar scroll-smooth overscroll-contain transition-[padding] duration-150
          max-w-md lg:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl mx-auto
          ${hideBottomNav ? 'pb-2' : 'pb-32 lg:pb-8'}
        `}
      >
        {children}
      </main>

      {/* Bottom nav: только мобильный/планшет; на ПК — сайдбар */}
      {!hideBottomNav && (
        <div
          className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out ${
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