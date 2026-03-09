import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { hasStoredPin, checkPin as checkPinStorage } from '../utils/pinStorage';
import PinKeypad from '../components/PinKeypad';

interface PinContextValue {
  hasPin: (userId: string) => boolean;
  requirePin: (userId: string, title: string, onSuccess: () => void) => void;
}

const PinContext = createContext<PinContextValue | null>(null);

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<{ title: string; onSuccess: () => void; userId: string } | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [error, setError] = useState(false);

  const hasPin = useCallback((userId: string) => hasStoredPin(userId), []);

  const requirePin = useCallback((userId: string, title: string, onSuccess: () => void) => {
    if (!hasStoredPin(userId)) {
      onSuccess();
      return;
    }
    setModal({ title, onSuccess, userId });
    setPinValue('');
    setError(false);
  }, []);

  const handleSubmit = useCallback(async (submittedValue?: string) => {
    const valueToCheck = submittedValue ?? pinValue;
    if (!modal || valueToCheck.length !== 4) return;
    const ok = await checkPinStorage(modal.userId, valueToCheck);
    if (ok) {
      Haptic.success();
      setModal(null);
      setPinValue('');
      setError(false);
      modal.onSuccess();
    } else {
      Haptic.error();
      setError(true);
      setPinValue('');
      setTimeout(() => setError(false), 600);
    }
  }, [modal, pinValue]);

  const handleClose = useCallback(() => {
    Haptic.light();
    setModal(null);
    setPinValue('');
    setError(false);
  }, []);

  const value: PinContextValue = { hasPin, requirePin };

  return (
    <PinContext.Provider value={value}>
      {children}
      {modal && (
        <div
          className="fullscreen-overlay flex flex-col items-center justify-end sm:justify-center bg-black/70 backdrop-blur-sm animate-fade-in"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0)' }}
        >
          <div
            className="w-full max-w-md bg-card border-t border-border rounded-t-2xl sm:rounded-2xl px-6 pt-6 pb-8 animate-sheet-up sm:animate-modal-in shadow-2xl max-h-[90dvh] overflow-y-auto scroll-app"
            style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
          >
            <div className="flex justify-between items-center mb-6 touch-target">
              <h3 className="text-lg font-bold text-white">{modal.title}</h3>
              <button
                onClick={handleClose}
                className="touch-target p-2 -mr-2 rounded-xl text-textMuted hover:text-white hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center"
                aria-label="Закрыть"
              >
                <X size={22} />
              </button>
            </div>
            <PinKeypad
              value={pinValue}
              onChange={setPinValue}
              onSubmit={(pin) => handleSubmit(pin)}
              error={error}
            />
            {error && (
              <p className="text-center text-red-400 text-sm mt-4 font-medium">Неверный пароль</p>
            )}
          </div>
        </div>
      )}
    </PinContext.Provider>
  );
}

export function usePin() {
  const ctx = useContext(PinContext);
  if (!ctx) throw new Error('usePin must be used within PinProvider');
  return ctx;
}
