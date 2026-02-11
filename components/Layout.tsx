import React from 'react';
import BottomNav from './BottomNav';
import { PageView } from '../types';
import { useKeyboard } from '../context/KeyboardContext';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentPage, onNavigate }) => {
  const { keyboardOpen } = useKeyboard();

  return (
    <div className="h-screen min-h-[100dvh] bg-background text-white flex flex-col relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-neon/5 rounded-full blur-[120px] pointer-events-none z-0" />
      
      {/* Main: when keyboard open, less bottom padding so content stays visible */}
      <main
        className={`flex-1 overflow-y-auto w-full max-w-md mx-auto relative z-10 no-scrollbar scroll-smooth overscroll-contain transition-[padding] duration-150 ${
          keyboardOpen ? 'pb-2' : 'pb-24'
        }`}
      >
        {children}
      </main>
      
      {/* Hide nav when keyboard is open so it doesn't sit on top of input */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-200 ease-out ${
          keyboardOpen ? 'translate-y-full pointer-events-none' : 'translate-y-0'
        }`}
      >
        <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
      </div>
    </div>
  );
};

export default Layout;