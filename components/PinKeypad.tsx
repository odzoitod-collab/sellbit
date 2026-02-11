import React, { useCallback } from 'react';
import { Delete } from 'lucide-react';
import { Haptic } from '../utils/haptics';

const PIN_LENGTH = 4;
const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'];

interface PinKeypadProps {
  value: string;
  onChange: (value: string) => void;
  /** Вызывается при вводе 4-й цифры; передаётся введённое значение. */
  onSubmit: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
}

const PinKeypad: React.FC<PinKeypadProps> = ({ value, onChange, onSubmit, error, disabled }) => {
  const addDigit = useCallback(
    (d: string) => {
      if (disabled) return;
      if (value.length >= PIN_LENGTH) return;
      Haptic.light();
      const next = value + d;
      onChange(next);
      if (next.length === PIN_LENGTH) {
        setTimeout(() => onSubmit(next), 80);
      }
    },
    [value, onChange, disabled]
  );

  const backspace = useCallback(() => {
    if (disabled) return;
    Haptic.light();
    onChange(value.slice(0, -1));
  }, [value, onChange, disabled]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Dots */}
      <div className="flex justify-center gap-4 mb-8">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-all ${
              value.length > i
                ? error
                  ? 'bg-red-500 border-red-500'
                  : 'bg-neon border-neon'
                : 'border-neutral-600 bg-transparent'
            }`}
          />
        ))}
      </div>

      {/* Виртуальная клавиатура — крупные кнопки, как в банковских приложениях */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[320px]">
        {DIGITS.map((d, i) => {
          if (d === '') return <div key={i} />;
          if (d === 'back') {
            return (
              <button
                key="back"
                type="button"
                onClick={backspace}
                disabled={disabled}
                className="h-[72px] rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center active:scale-95 disabled:opacity-50 touch-manipulation hover:bg-white/10 transition-colors"
              >
                <Delete size={28} className="text-neutral-400" />
              </button>
            );
          }
          return (
            <button
              key={d}
              type="button"
              onClick={() => addDigit(d)}
              disabled={disabled}
              className="h-[72px] rounded-2xl bg-white/5 border border-white/10 text-white text-2xl font-mono font-bold active:scale-95 disabled:opacity-50 hover:bg-white/10 transition-colors touch-manipulation"
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PinKeypad;
export { PIN_LENGTH };
