import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useLanguage } from '../context/LanguageContext';
import type { Locale } from '../i18n/translations';

const LANGUAGES: { code: Locale; labelKey: string }[] = [
  { code: 'en', labelKey: 'lang_en' },
  { code: 'ru', labelKey: 'lang_ru' },
  { code: 'pl', labelKey: 'lang_pl' },
  { code: 'kk', labelKey: 'lang_kk' },
  { code: 'cs', labelKey: 'lang_cs' },
];

interface LanguagePickerPageProps {
  onBack: () => void;
}

const LanguagePickerPage: React.FC<LanguagePickerPageProps> = ({ onBack }) => {
  const { locale, setLocale, t } = useLanguage();

  const handleSelect = (code: Locale) => {
    Haptic.light();
    setLocale(code);
    onBack();
  };

  return (
    <div className="flex flex-col min-h-full animate-fade-in px-4 pt-2 pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => { Haptic.light(); onBack(); }}
          className="p-2 -ml-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
        >
          <ChevronLeft size={24} strokeWidth={2} />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-white">{t('language_title')}</h1>
          <p className="text-xs text-neutral-500">{t('language_subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {LANGUAGES.map(({ code, labelKey }) => {
          const isSelected = locale === code;

          return (
            <button
              key={code}
              onClick={() => handleSelect(code)}
              className={`
                flex items-center justify-between py-3 px-3 rounded-lg text-left
                transition-colors active:scale-[0.99]
                ${isSelected ? 'bg-neon/20 text-neon border border-neon/40' : 'bg-white/[0.02] text-white hover:bg-white/[0.06] border border-transparent'}
              `}
            >
              <span className="font-medium text-sm">{t(labelKey)}</span>
              {isSelected && (
                <span className="text-xs text-neon/80">✓</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LanguagePickerPage;
