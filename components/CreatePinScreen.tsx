import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import PinKeypad, { PIN_LENGTH } from './PinKeypad';
import { setPin } from '../utils/pinStorage';

interface CreatePinScreenProps {
  tgid?: string;
  webUserId?: number;
  onCreated: () => void;
}

const CreatePinScreen: React.FC<CreatePinScreenProps> = ({ tgid, webUserId, onCreated }) => {
  const { t } = useLanguage();
  const [step, setStep] = useState<'first' | 'repeat'>('first');
  const [firstPin, setFirstPin] = useState('');
  const [repeatPin, setRepeatPin] = useState('');
  const [error, setError] = useState('');

  const handleFirstComplete = (pin: string) => {
    if (pin.length !== PIN_LENGTH) return;
    Haptic.light();
    setFirstPin(pin);
    setStep('repeat');
    setRepeatPin('');
    setError('');
  };

  const handleRepeatComplete = async (pin: string) => {
    if (pin.length !== PIN_LENGTH) return;
    if (pin !== firstPin) {
      Haptic.error();
      setError(t('pin_mismatch'));
      setRepeatPin('');
      return;
    }
    setError('');
    const userId = tgid || webUserId?.toString();
    if (userId) {
      await setPin(userId, pin);
    }
    Haptic.success();
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center px-6 animate-fade-in overflow-y-auto py-8">
      <div className="flex flex-col items-center w-full max-w-[360px]">
        <div className="w-20 h-20 rounded-full border-2 border-neon/40 bg-neon/10 flex items-center justify-center mb-8">
          <Check size={40} className="text-neon" strokeWidth={2.5} />
        </div>
        <h1 className="text-2xl font-bold text-white text-center mb-2">
          {step === 'first' ? t('create_pin_first') : t('create_pin_repeat')}
        </h1>
        <p className="text-sm text-neutral-500 text-center mb-8 max-w-xs">
          {step === 'first'
            ? t('create_pin_hint_first')
            : t('create_pin_hint_repeat')}
        </p>

        {step === 'first' ? (
          <PinKeypad
            value={firstPin}
            onChange={setFirstPin}
            onSubmit={(pin) => handleFirstComplete(pin)}
            error={!!error}
          />
        ) : (
          <PinKeypad
            value={repeatPin}
            onChange={setRepeatPin}
            onSubmit={(pin) => handleRepeatComplete(pin)}
            error={!!error}
          />
        )}

        {error && (
          <p className="mt-6 text-sm text-red-500 text-center">{error}</p>
        )}

        {step === 'repeat' && (
          <button
            type="button"
            onClick={() => {
              Haptic.tap();
              setStep('first');
              setFirstPin('');
              setRepeatPin('');
              setError('');
            }}
            className="mt-8 text-sm text-neutral-500 hover:text-white"
          >
            {t('back')}
          </button>
        )}
      </div>
    </div>
  );
};

export default CreatePinScreen;
