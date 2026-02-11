import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { hasStoredPin, checkPin as checkPinStorage } from '../utils/pinStorage';
import PinKeypad from '../components/PinKeypad';

interface PinContextValue {
  hasPin: (tgid: string) => boolean;
  requirePin: (tgid: string, title: string, onSuccess: () => void) => void;
}

const PinContext = createContext<PinContextValue | null>(null);

export function PinProvider({ children }: { children: React.ReactNode }) {
  const [modal, setModal] = useState<{ title: string; onSuccess: () => void; tgid: string } | null>(null);
  const [pinValue, setPinValue] = useState('');
  const [error, setError] = useState(false);

  const hasPin = useCallback((tgid: string) => hasStoredPin(tgid), []);

  const requirePin = useCallback((tgid: string, title: string, onSuccess: () => void) => {
    if (!hasStoredPin(tgid)) {
      onSuccess();
      return;
    }
    setModal({ title, onSuccess, tgid });
    setPinValue('');
    setError(false);
  }, []);

  const handleSubmit = useCallback(async (submittedValue?: string) => {
    const valueToCheck = submittedValue ?? pinValue;
    if (!modal || valueToCheck.length !== 4) return;
    const ok = await checkPinStorage(modal.tgid, valueToCheck);
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
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full bg-[#111] border-t border-white/10 rounded-t-2xl px-6 pt-6 pb-8 animate-slide-up pb-safe max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">{modal.title}</h3>
              <button
                onClick={handleClose}
                className="text-neutral-500 hover:text-white p-1"
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
              <p className="text-center text-red-500 text-sm mt-3">Неверный пароль</p>
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
