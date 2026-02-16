import React, { useState } from 'react';
import { ArrowLeft, Trophy, XCircle, BarChart3, HelpCircle, ChevronRight, ShieldCheck, ShieldAlert, KeyRound, X, DollarSign, Languages, LogOut } from 'lucide-react';
import { Deal } from '../types';
import { Haptic } from '../utils/haptics';
import { useUser } from '../context/UserContext';
import { usePin } from '../context/PinContext';
import { useCurrency } from '../context/CurrencyContext';
import { useLanguage } from '../context/LanguageContext';
import { checkPin, setPin } from '../utils/pinStorage';
import PinKeypad from '../components/PinKeypad';
import { useToast } from '../context/ToastContext';
import { useWebAuth } from '../context/WebAuthContext';

interface ProfilePageProps {
  deals: Deal[];
  onBack: () => void;
  onNavigateToKyc?: () => void;
  onNavigateToCurrency?: () => void;
  onNavigateToLanguage?: () => void;
}

type ChangePinStep = null | 'current' | 'new' | 'repeat';

const ProfilePage: React.FC<ProfilePageProps> = ({ deals, onBack, onNavigateToKyc, onNavigateToCurrency, onNavigateToLanguage }) => {
  const { user, supportLink, tgid, webUserId } = useUser();
  const { logout } = useWebAuth();
  const { hasPin } = usePin();
  const { symbol, currencyCode } = useCurrency();
  const { t, locale } = useLanguage();
  const toast = useToast();
  const [changePinStep, setChangePinStep] = useState<ChangePinStep>(null);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [repeatPinValue, setRepeatPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const newPinRef = React.useRef('');

  const finishedDeals = deals.filter((d) => d.status === 'WIN' || d.status === 'LOSS');
  const winsFromDeals = finishedDeals.filter((d) => d.status === 'WIN').length;
  const lossesFromDeals = finishedDeals.filter((d) => d.status === 'LOSS').length;
  const wins = user?.stats_wins != null ? user.stats_wins : winsFromDeals;
  const losses = user?.stats_losses != null ? user.stats_losses : lossesFromDeals;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const isWebUser = !!(user?.web_registered || (user?.email && !tgid));
  const displayName = user?.full_name || user?.username || (user?.email && isWebUser ? user.email : (user ? t('user_placeholder') : t('guest')));
  const displayId = user ? `#${user.user_id}` : '—';
  const avatarUrl = isWebUser ? undefined : (user?.photo_url || undefined);
  const isGuest = !user;

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in">
      <header className="flex items-center px-4 py-3 border-b border-white/[0.06] bg-[#050505] sticky top-0 z-50">
        <button
          onClick={() => { Haptic.tap(); onBack(); }}
          className="p-1.5 -ml-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 active:scale-95 transition-all"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span className="text-sm font-semibold text-white/90 ml-2">{t('profile')}</span>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 py-4">
        {/* Компактная планка аватар + имя / веб: только email */}
        <div className="flex items-center gap-3 mb-6 py-2">
          {!isWebUser && (
            <div className="relative flex-shrink-0">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-10 h-10 rounded-full border border-white/10 bg-neutral-900 object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full border border-white/10 bg-neutral-800/80 flex items-center justify-center text-neon/90 text-sm font-semibold">
                  {(displayName || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-white truncate">{displayName}</h2>
            <span className="text-[11px] font-mono text-neutral-500">{displayId}</span>
            {isWebUser && user?.email && (
              <p className="text-[11px] text-neutral-500 truncate mt-0.5">{user.email}</p>
            )}
          </div>
        </div>

        {/* Верификация — компактно */}
        {!isGuest && (
          <div className="mb-5">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                user?.is_kyc === true
                  ? 'bg-emerald-500/5 border-emerald-500/20'
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}
            >
              {user?.is_kyc === true ? (
                <ShieldCheck size={14} className="text-emerald-500 flex-shrink-0" />
              ) : (
                <ShieldAlert size={14} className="text-amber-500 flex-shrink-0" />
              )}
              <span className={`text-xs font-medium ${user?.is_kyc === true ? 'text-emerald-400' : 'text-amber-400'}`}>
                {user?.is_kyc === true ? t('verified') : t('verification_required')}
              </span>
            </div>
            {user?.is_kyc !== true && onNavigateToKyc && (
              <button
                onClick={() => { Haptic.tap(); onNavigateToKyc(); }}
                className="mt-2 w-full py-2.5 px-3 bg-neon/90 text-black text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 hover:bg-neon active:scale-[0.99] transition-all"
              >
                <ShieldCheck size={14} />
                {t('verify_btn')}
              </button>
            )}
          </div>
        )}

        {isGuest && (
          <p className="text-[11px] text-neutral-500 mb-5">{t('open_from_telegram')}</p>
        )}

        {/* Статистика — минималистичная сетка */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
            <Trophy size={14} className="text-emerald-500 mx-auto mb-1" />
            <span className="text-sm font-bold text-white tabular-nums">{wins}</span>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('wins')}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
            <XCircle size={14} className="text-red-500/80 mx-auto mb-1" />
            <span className="text-sm font-bold text-white tabular-nums">{losses}</span>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('losses')}</p>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 text-center">
            <BarChart3 size={14} className="text-neon/80 mx-auto mb-1" />
            <span className="text-sm font-bold text-white tabular-nums">{winRate}%</span>
            <p className="text-[9px] text-neutral-500 uppercase tracking-wider mt-0.5">{t('winrate')}</p>
          </div>
        </div>

        {/* Меню — тонкие строки */}
        <div className="space-y-1">
          {onNavigateToLanguage && (
            <button
              type="button"
              onClick={() => { Haptic.tap(); onNavigateToLanguage(); }}
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between group text-left hover:bg-white/[0.04] active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <Languages size={16} className="text-neutral-500 group-hover:text-neon/80" />
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white">{t('language_title')}</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">{locale === 'en' ? 'EN' : locale === 'ru' ? 'RU' : locale === 'pl' ? 'PL' : locale === 'kk' ? 'KK' : 'CS'}</span>
              <ChevronRight size={14} className="text-neutral-600 -mr-1" />
            </button>
          )}
          {onNavigateToCurrency && (
            <button
              type="button"
              onClick={() => { Haptic.tap(); onNavigateToCurrency(); }}
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between group text-left hover:bg-white/[0.04] active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <DollarSign size={16} className="text-neutral-500 group-hover:text-neon/80" />
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white">{t('currency')}</span>
              </div>
              <span className="text-[11px] text-neutral-500 font-mono">{currencyCode}</span>
              <ChevronRight size={14} className="text-neutral-600 -mr-1" />
            </button>
          )}
          {!isGuest && tgid && hasPin(tgid) && !webUserId && (
            <button
              type="button"
              onClick={() => {
                Haptic.tap();
                setChangePinStep('current');
                setCurrentPinValue('');
                setNewPinValue('');
                setRepeatPinValue('');
                setPinError('');
              }}
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between group text-left hover:bg-white/[0.04] active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <KeyRound size={16} className="text-neutral-500 group-hover:text-neon/80" />
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white">{t('change_password')}</span>
              </div>
              <ChevronRight size={14} className="text-neutral-600" />
            </button>
          )}
          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between group block hover:bg-white/[0.04] active:scale-[0.99] transition-all"
            onClick={() => Haptic.tap()}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle size={16} className="text-neutral-500 group-hover:text-white" />
              <span className="text-xs font-medium text-neutral-300 group-hover:text-white">{t('support')}</span>
            </div>
            <ChevronRight size={14} className="text-neutral-600" />
          </a>
          {isWebUser && webUserId && (
            <button
              type="button"
              onClick={() => { Haptic.tap(); logout(); window.location.href = '/'; }}
              className="w-full bg-white/[0.02] border border-white/[0.06] rounded-lg px-3 py-2.5 flex items-center justify-between group text-left hover:bg-white/[0.04] active:scale-[0.99] transition-all"
            >
              <div className="flex items-center gap-2.5">
                <LogOut size={16} className="text-neutral-500 group-hover:text-red-400" />
                <span className="text-xs font-medium text-neutral-300 group-hover:text-white">Выйти</span>
              </div>
              <ChevronRight size={14} className="text-neutral-600" />
            </button>
          )}
        </div>
      </div>

      {/* Модалка смены пароля */}
      {changePinStep && tgid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full bg-[#0d0d0d] border-t border-white/10 rounded-t-2xl px-5 pt-5 pb-8 max-w-md animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold text-white">
                {changePinStep === 'current' && t('pin_current')}
                {changePinStep === 'new' && t('pin_new')}
                {changePinStep === 'repeat' && t('pin_repeat')}
              </h3>
              <button
                type="button"
                onClick={() => {
                  Haptic.tap();
                  setChangePinStep(null);
                  setPinError('');
                }}
                className="text-neutral-500 hover:text-white p-1 rounded"
                aria-label={t('close')}
              >
                <X size={20} strokeWidth={2} />
              </button>
            </div>
            {changePinStep === 'current' && (
              <>
                <PinKeypad
                  value={currentPinValue}
                  onChange={setCurrentPinValue}
                  onSubmit={async (pin) => {
                    const ok = await checkPin(tgid, pin);
                    if (ok) {
                      setPinError('');
                      setCurrentPinValue('');
                      setChangePinStep('new');
                    } else {
                      Haptic.error();
                      setPinError(t('pin_wrong'));
                      setCurrentPinValue('');
                    }
                  }}
                  error={!!pinError}
                />
                {pinError && <p className="text-center text-red-500 text-xs mt-3">{pinError}</p>}
              </>
            )}
            {changePinStep === 'new' && (
              <PinKeypad
                value={newPinValue}
                onChange={setNewPinValue}
                onSubmit={(pin) => {
                  newPinRef.current = pin;
                  setNewPinValue('');
                  setRepeatPinValue('');
                  setPinError('');
                  setChangePinStep('repeat');
                }}
                error={!!pinError}
              />
            )}
            {changePinStep === 'repeat' && (
              <>
                <PinKeypad
                  value={repeatPinValue}
                  onChange={setRepeatPinValue}
                  onSubmit={async (pin) => {
                    if (pin !== newPinRef.current) {
                      Haptic.error();
                      setPinError(t('pin_mismatch'));
                      setRepeatPinValue('');
                      return;
                    }
                    setPinError('');
                    await setPin(tgid, pin);
                    Haptic.success();
                    toast.show(t('pin_changed'), 'success');
                    setChangePinStep(null);
                  }}
                  error={!!pinError}
                />
                {pinError && <p className="text-center text-red-500 text-xs mt-3">{pinError}</p>}
                <button
                  type="button"
                  onClick={() => {
                    Haptic.tap();
                    setChangePinStep('new');
                    setRepeatPinValue('');
                    setNewPinValue('');
                    setPinError('');
                  }}
                  className="mt-4 text-xs text-neutral-500 hover:text-white w-full"
                >
                  {t('back')}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
