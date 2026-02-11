import React, { useState, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { Haptic } from '../utils/haptics';

interface OnboardingScreenProps {
  onNext: () => void;
}

const STEPS = [
  {
    title: 'Добро пожаловать',
    text: 'Торговая платформа с быстрыми сделками. Минимум настроек — сразу к делу.',
    icon: null,
  },
  {
    title: 'Безопасность',
    text: 'Реквизиты и вывод защищены паролем. Только вы подтверждаете операции.',
    icon: null,
  },
  {
    title: 'Всё готово',
    text: 'Осталось придумать пароль — и можно начинать.',
    icon: 'check',
  },
];

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({ onNext }) => {
  const [step, setStep] = useState(0);
  const [key, setKey] = useState(0);

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    setKey((k) => k + 1);
  }, [step]);

  const handleNext = () => {
    Haptic.light();
    if (isLast) {
      onNext();
      return;
    }
    setStep((s) => s + 1);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex flex-col items-center justify-center px-8 animate-fade-in overflow-hidden">
      {/* Фон */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 bg-neon/5 rounded-full blur-[120px] pointer-events-none transition-opacity duration-500"
        style={{ opacity: isLast ? 0.6 : 1 }}
      />

      <div className="relative flex flex-col items-center max-w-sm w-full min-h-[420px]">
        {/* Контент шага с анимацией появления */}
        <div key={key} className="flex flex-col items-center flex-1 animate-slide-in-right">
          {current.icon === 'check' ? (
            /* Шаг 3: галочка в круге с анимацией */
            <div className="flex flex-col items-center">
              <div className="w-24 h-24 rounded-full border-2 border-neon/40 bg-neon/5 flex items-center justify-center mb-10 animate-circle-fade">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-neon animate-check-draw"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">
                {current.title}
              </h1>
              <p className="text-sm text-neutral-500 text-center leading-relaxed max-w-[260px]">
                {current.text}
              </p>
            </div>
          ) : (
            /* Шаги 1–2: иконка-буква */
            <>
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center mb-12 bg-white/[0.02]">
                <span className="text-2xl font-bold text-neon tracking-tight">N</span>
              </div>
              <h1 className="text-2xl font-bold text-white text-center mb-2 tracking-tight">
                {current.title}
              </h1>
              <p className="text-sm text-neutral-500 text-center leading-relaxed max-w-[260px]">
                {current.text}
              </p>
            </>
          )}
        </div>

        {/* Индикатор шагов */}
        <div className="flex items-center gap-2.5 mb-10">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-neon' : i < step ? 'w-1.5 bg-neon/60' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={handleNext}
          className="w-full py-4 rounded-2xl bg-neon/90 text-black font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(163,230,53,0.2)]"
        >
          {isLast ? 'Создать пароль' : 'Далее'}
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
};

export default OnboardingScreen;
