import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import PinKeypad, { PIN_LENGTH } from './PinKeypad';
import { setPin as savePin } from '../utils/pinStorage';

interface CreatePinScreenProps {
  tgid?: string;
  webUserId?: number;
  onCreated: () => void;
}

const CreatePinScreen: React.FC<CreatePinScreenProps> = ({ tgid, webUserId, onCreated }) => {
  const { t } = useLanguage();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleComplete = async (enteredPin: string) => {
    if (enteredPin.length !== PIN_LENGTH) return;
    setError('');
    const userId = tgid || webUserId?.toString();
    if (userId) {
      await savePin(userId, enteredPin);
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
          {t('create_pin_first')}
        </h1>
        <p className="text-sm text-neutral-500 text-center mb-8 max-w-xs">
          {t('create_pin_hint_first')}
        </p>

        <PinKeypad
          value={pin}
          onChange={setPin}
          onSubmit={(enteredPin) => handleComplete(enteredPin)}
          error={!!error}
        />

        {error && (
          <p className="mt-6 text-sm text-red-500 text-center">{error}</p>
        )}
      </div>
    </div>
  );
};

export default CreatePinScreen;
