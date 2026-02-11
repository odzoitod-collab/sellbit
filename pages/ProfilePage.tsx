import React, { useState } from 'react';
import { ArrowLeft, Trophy, XCircle, BarChart3, HelpCircle, ChevronRight, ShieldCheck, ShieldAlert, KeyRound, X } from 'lucide-react';
import { Deal } from '../types';
import { Haptic } from '../utils/haptics';
import { useUser } from '../context/UserContext';
import { usePin } from '../context/PinContext';
import { checkPin, setPin } from '../utils/pinStorage';
import PinKeypad from '../components/PinKeypad';
import { useToast } from '../context/ToastContext';

interface ProfilePageProps {
  deals: Deal[];
  onBack: () => void;
  onNavigateToKyc?: () => void;
}

type ChangePinStep = null | 'current' | 'new' | 'repeat';

const ProfilePage: React.FC<ProfilePageProps> = ({ deals, onBack, onNavigateToKyc }) => {
  const { user, supportLink, tgid } = useUser();
  const { hasPin } = usePin();
  const toast = useToast();
  const [changePinStep, setChangePinStep] = useState<ChangePinStep>(null);
  const [currentPinValue, setCurrentPinValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [repeatPinValue, setRepeatPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const newPinRef = React.useRef('');

  const finishedDeals = deals.filter((d) => d.status === 'WIN' || d.status === 'LOSS');
  const wins = finishedDeals.filter((d) => d.status === 'WIN').length;
  const losses = finishedDeals.filter((d) => d.status === 'LOSS').length;
  const totalVolume = finishedDeals.reduce((acc, curr) => acc + curr.amount, 0);
  const winRate = finishedDeals.length > 0 ? Math.round((wins / finishedDeals.length) * 100) : 0;

  const formatVolume = (val: number) => {
    if (val >= 1000000) return val / 1000000 + 'M ₽';
    if (val >= 1000) return val / 1000 + 'k ₽';
    return val + ' ₽';
  };

  const displayName = user?.full_name || user?.username || (user ? 'Пользователь' : 'Гость');
  const displayId = user ? `ID: ${user.user_id}` : '—';
  const avatarUrl = user?.photo_url || undefined;
  const isGuest = !user;

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in">
      <header className="flex items-center px-4 py-4 border-b border-white/5 bg-[#050505] sticky top-0 z-50">
        <button
          onClick={() => { Haptic.tap(); onBack(); }}
          className="text-neutral-400 hover:text-white mr-4 active:scale-90 transition-transform"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-bold text-white">Профиль</span>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4">
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-6 mb-6 flex flex-col items-center relative overflow-hidden">
          <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-neon/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative mb-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt=""
                className="w-24 h-24 rounded-full border-2 border-neutral-800 bg-neutral-900 object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-neutral-800 bg-neutral-800 flex items-center justify-center text-neon text-2xl font-bold">
                {(displayName || '?').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{displayName}</h2>
          <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded-md border border-neutral-800">
            {displayId}
          </span>

          {/* Гость: подсказка */}
          {isGuest && (
            <p className="mt-4 text-xs text-neutral-500 text-center px-4">
              Откройте приложение из Telegram для торговли и вывода средств.
            </p>
          )}
          {/* Статус верификации из БД (is_kyc выставляется в ТГ-боте). Кнопка только если не верифицирован. */}
          {!isGuest && (
            <div className="mt-4 w-full flex flex-col items-center gap-3">
              <div className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border ${user?.is_kyc === true ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30'}`}>
                {user?.is_kyc === true ? (
                  <>
                    <ShieldCheck size={18} className="text-green-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-green-400">Верификация пройдена</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert size={18} className="text-amber-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-amber-400">Требуется верификация</span>
                  </>
                )}
              </div>
              {user?.is_kyc !== true && onNavigateToKyc && (
                <button
                  onClick={() => { Haptic.tap(); onNavigateToKyc(); }}
                  className="w-full py-3.5 px-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-95 active:scale-[0.98] transition-all shadow-lg shadow-neon/20"
                >
                  <ShieldCheck size={20} />
                  Пройти верификацию
                </button>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <Trophy size={16} className="text-green-500" />
              <span className="text-xs text-neutral-500 uppercase font-bold">Успешных</span>
            </div>
            <span className="text-xl font-mono font-bold text-white">{wins}</span>
          </div>
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle size={16} className="text-red-500" />
              <span className="text-xs text-neutral-500 uppercase font-bold">Неудачных</span>
            </div>
            <span className="text-xl font-mono font-bold text-white">{losses}</span>
          </div>
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex flex-col">
            <div className="flex items-center space-x-2 mb-2">
              <BarChart3 size={16} className="text-neon" />
              <span className="text-xs text-neutral-500 uppercase font-bold">Винрейт</span>
            </div>
            <span className="text-xl font-mono font-bold text-white">{winRate}%</span>
          </div>
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex flex-col">
            <span className="text-xs text-neutral-500 uppercase font-bold mb-2">Оборот</span>
            <span className="text-lg font-mono font-bold text-white tracking-tighter">{formatVolume(totalVolume)}</span>
          </div>
        </div>

        <div className="space-y-2 mb-8">
          {!isGuest && tgid && hasPin(tgid) && (
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
              className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform group text-left"
            >
              <div className="flex items-center space-x-3">
                <KeyRound size={20} className="text-neutral-400 group-hover:text-neon" />
                <span className="text-sm font-medium text-neutral-300 group-hover:text-white">Сменить пароль</span>
              </div>
              <ChevronRight size={16} className="text-neutral-600" />
            </button>
          )}
          <a
            href={supportLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex items-center justify-between active:scale-[0.98] transition-transform group block"
            onClick={() => Haptic.tap()}
          >
            <div className="flex items-center space-x-3">
              <HelpCircle size={20} className="text-neutral-400 group-hover:text-white" />
              <span className="text-sm font-medium text-neutral-300 group-hover:text-white">Поддержка</span>
            </div>
            <ChevronRight size={16} className="text-neutral-600" />
          </a>
        </div>
      </div>

      {/* Модалка смены пароля */}
      {changePinStep && tgid && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full bg-[#111] border-t border-white/10 rounded-t-2xl px-6 pt-6 pb-8 max-w-md animate-slide-up">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">
                {changePinStep === 'current' && 'Введите текущий пароль'}
                {changePinStep === 'new' && 'Новый пароль'}
                {changePinStep === 'repeat' && 'Повторите новый пароль'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  Haptic.tap();
                  setChangePinStep(null);
                  setPinError('');
                }}
                className="text-neutral-500 hover:text-white p-1"
                aria-label="Закрыть"
              >
                <X size={22} />
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
                      setPinError('Неверный пароль');
                      setCurrentPinValue('');
                    }
                  }}
                  error={!!pinError}
                />
                {pinError && <p className="text-center text-red-500 text-sm mt-3">{pinError}</p>}
              </>
            )}
            {changePinStep === 'new' && (
              <>
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
              </>
            )}
            {changePinStep === 'repeat' && (
              <>
                <PinKeypad
                  value={repeatPinValue}
                  onChange={setRepeatPinValue}
                  onSubmit={async (pin) => {
                    if (pin !== newPinRef.current) {
                      Haptic.error();
                      setPinError('Пароли не совпадают');
                      setRepeatPinValue('');
                      return;
                    }
                    setPinError('');
                    await setPin(tgid, pin);
                    Haptic.success();
                    toast.show('Пароль успешно изменён', 'success');
                    setChangePinStep(null);
                  }}
                  error={!!pinError}
                />
                {pinError && <p className="text-center text-red-500 text-sm mt-3">{pinError}</p>}
                <button
                  type="button"
                  onClick={() => {
                    Haptic.tap();
                    setChangePinStep('new');
                    setRepeatPinValue('');
                    setNewPinValue('');
                    setPinError('');
                  }}
                  className="mt-4 text-sm text-neutral-500 hover:text-white w-full"
                >
                  Назад
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
