import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'info' | 'error' | 'success';

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [type, setType] = useState<ToastType>('info');

  const show = useCallback((msg: string, t: ToastType = 'info') => {
    setMessage(msg);
    setType(t);
    setTimeout(() => setMessage(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {message && (
        <div
          className={`fixed bottom-24 left-4 right-4 max-w-md mx-auto py-3 px-4 rounded-xl text-center text-sm font-medium z-[100] animate-fade-in ${
            type === 'error' ? 'bg-red-500/90 text-white' : type === 'success' ? 'bg-green-500/90 text-black' : 'bg-neutral-800 text-white border border-white/10'
          }`}
        >
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return { show: () => {} };
  return ctx;
}
