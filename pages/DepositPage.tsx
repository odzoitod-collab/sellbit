import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, Wallet, Copy, Upload, Loader2, Clock, X, FileText } from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';
import { Haptic } from '../utils/haptics';
import { useUser, type CountryBank } from '../context/UserContext';
import { usePin } from '../context/PinContext';
import { useToast } from '../context/ToastContext';
import { useLanguage } from '../context/LanguageContext';
import { useWebAuth } from '../context/WebAuthContext';
import { supabase } from '../lib/supabase';
import { sendDepositToTelegram, canSendDepositToTelegram } from '../lib/telegramNotify';
import {
  getDepositSession,
  saveDepositSession,
  clearDepositSession,
  DEPOSIT_TIMER_SECONDS,
  type DepositMethod as SessionDepositMethod,
  type CryptoNetwork as SessionCryptoNetwork,
} from '../lib/depositSession';

interface DepositPageProps {
  onBack: () => void;
  onDeposit: () => void;
}

const CRYPTO_BOT_LOGO = 'https://torforex.com/wp-content/uploads/2024/09/cryptobot.png';
const CRYPTO_BOT_LINK = 'https://t.me/send';
const CRYPTO_BOT_BONUS_PERCENT = 5;

type Step = 'METHOD' | 'COUNTRY' | 'NETWORK' | 'AMOUNT' | 'MATCHING' | 'PAYMENT' | 'CHECK' | 'SUCCESS';
type CryptoNetwork = 'trc20' | 'ton' | 'btc' | 'sol';
type DepositMethod = 'CARD' | 'SBP' | 'CRYPTO' | 'CRYPTO_BOT';

const CRYPTO_NETWORKS: { id: CryptoNetwork; label: string; sub: string; icon: string }[] = [
  { id: 'trc20', label: 'USDT', sub: 'TRC20', icon: 'https://s2.coinmarketcap.com/static/img/coins/200x200/1958.png' },
  { id: 'ton', label: 'TON', sub: 'Toncoin', icon: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Gram_cryptocurrency_logo.svg/960px-Gram_cryptocurrency_logo.svg.png' },
  { id: 'btc', label: 'Bitcoin', sub: 'BTC', icon: 'https://pngicon.ru/file/uploads/ikonka-bitkoin.png' },
  { id: 'sol', label: 'Solana', sub: 'SOL', icon: 'https://cdn-icons-png.flaticon.com/512/6001/6001527.png' },
];

const DepositPage: React.FC<DepositPageProps> = ({ onBack, onDeposit }) => {
  const { formatPrice, symbol } = useCurrency();
  const { user, tgid, minDepositUsd, countries, settings, cryptoWallets } = useUser();
  const { webUserId } = useWebAuth();
  const { requirePin } = usePin();
  const toast = useToast();
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>('METHOD');
  const [method, setMethod] = useState<DepositMethod>('CARD');
  const [cryptoNetwork, setCryptoNetwork] = useState<CryptoNetwork>('trc20');
  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [checkLink, setCheckLink] = useState('');
  const [timeLeft, setTimeLeft] = useState(DEPOSIT_TIMER_SECONDS);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [guestContact, setGuestContact] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryBank | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkLinkInputRef = useRef<HTMLTextAreaElement>(null);
  const restoredSessionRef = useRef(false);

  const isGuest = !user && !tgid;

  // CARD/SBP: страна из выбора; CRYPTO/CRYPTO_BOT: без страны
  const country = (method === 'CARD' || method === 'SBP') ? selectedCountry ?? countries?.[0] : null;
  const requisites = country?.bank_details ?? settings?.bank_details ?? t('deposit_reqs_unavailable');
  const bankName = country?.bank_name ?? null;
  const sbpBankName = country?.sbp_bank_name ?? null;
  const sbpPhone = country?.sbp_phone ?? null;
  const cryptoWallet = method === 'CRYPTO' ? cryptoWallets.find((w) => w.network === cryptoNetwork) : null;
  const currencyLabel = country?.currency ?? 'USD';
  const exchangeRate = country?.exchange_rate ?? 1;
  const amountNum = parseFloat(amount) || 0;
  // CARD/SBP: пользователь вводит сумму в валюте страны; CRYPTO/CRYPTO_BOT: в USD
  const amountLocal = (method === 'CARD' || method === 'SBP') ? amountNum : amountNum * exchangeRate;
  const amountUsd = (method === 'CARD' || method === 'SBP') ? amountNum / exchangeRate : amountNum;

  const russiaRate = countries?.find((c) => c.country_code === 'RU')?.exchange_rate ?? 100;
  const minDepositLocal = country ? minDepositUsd * (country.exchange_rate / russiaRate) : minDepositUsd;

  const isRequisitesPlaceholder = (details: string | null | undefined): boolean => {
    if (!details || !details.trim()) return true;
    const lower = details.toLowerCase();
    return lower.includes('реквизиты не указаны') || lower.includes('обратитесь в поддержку') || lower.includes('доступна только криптовалюта');
  };
  const userRegionCountry = user?.country_code && countries?.length
    ? countries.find((c) => (c.country_code || '').toUpperCase() === (user.country_code || '').toUpperCase())
    : null;
  const regionHasRequisites = !user?.country_code || (userRegionCountry != null && !isRequisitesPlaceholder(userRegionCountry.bank_details));

  // Восстановление активной сделки пополнения при повторном заходе
  useEffect(() => {
    if (!countries?.length) return;
    const session = getDepositSession();
    if (!session) {
      restoredSessionRef.current = false;
      return;
    }
    if (restoredSessionRef.current) return;
    restoredSessionRef.current = true;
    setStep('PAYMENT');
    setMethod(session.method as DepositMethod);
    setAmount(session.amount);
    setCryptoNetwork(session.cryptoNetwork as CryptoNetwork);
    setSenderName(session.senderName);
    setGuestContact(session.guestContact);
    setCheckLink(session.checkLink);
    const country = session.selectedCountryId
      ? countries.find((c) => c.id === session.selectedCountryId) ?? null
      : null;
    setSelectedCountry(country);
    const remaining = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
    setTimeLeft(remaining);
  }, [countries]);

  // Timer logic for PAYMENT step; по истечении — очищаем сессию
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (step === 'PAYMENT' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearDepositSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, timeLeft]);

  // После шага MATCHING (подбор сделки) — показ реквизитов и сохранение сессии
  useEffect(() => {
    if (step !== 'MATCHING') return;
    const t = setTimeout(() => {
      setTimeLeft(DEPOSIT_TIMER_SECONDS);
      setStep('PAYMENT');
      saveDepositSession({
        step: 'PAYMENT',
        method: method as SessionDepositMethod,
        amount,
        cryptoNetwork: cryptoNetwork as SessionCryptoNetwork,
        senderName,
        guestContact,
        checkLink,
        selectedCountryId: selectedCountry?.id ?? null,
      });
    }, 2200);
    return () => clearTimeout(t);
  }, [step, method, amount, cryptoNetwork, senderName, guestContact, checkLink, selectedCountry?.id]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    Haptic.light();
    if (step === 'METHOD') {
      if (method === 'CRYPTO') setStep('NETWORK');
      else if (method === 'CRYPTO_BOT') setStep('AMOUNT');
      else setStep('COUNTRY');
    } else if (step === 'COUNTRY') setStep('AMOUNT');
    else if (step === 'NETWORK') setStep('AMOUNT');
    else if (step === 'AMOUNT') {
        const num = parseFloat(amount);
        const minVal = (method === 'CARD' || method === 'SBP') ? minDepositLocal : minDepositUsd;
        if (!amount || isNaN(num) || num < minVal) {
            Haptic.error();
            const minStr = (method === 'CARD' || method === 'SBP') ? String(Math.round(minVal)) : formatPrice(minDepositUsd);
            toast.show(`${t('min_deposit_toast', { amount: minStr })} ${currencyLabel}`, 'error');
            return;
        }
        const userId = tgid || webUserId?.toString();
        if (userId && user) {
          requirePin(userId, t('enter_pin_for_view'), () => setStep('MATCHING'));
        } else {
          setStep('MATCHING');
        }
    }
    else if (step === 'PAYMENT') {
      if (method === 'CRYPTO_BOT' && !checkLink.trim()) {
        Haptic.error();
        toast.show(t('deposit_paste_check'), 'error');
        return;
      }
      // Crypto Bot: только чек (ссылка), без шага со скриншотом — сразу подтверждение
      if (method === 'CRYPTO_BOT') {
        runSubmitDeposit();
        return;
      }
      setStep('CHECK');
    }
    else if (step === 'CHECK') {
      runSubmitDeposit();
    }
  };

  const runSubmitDeposit = () => {
    const numAmount = parseFloat(amount) || 0;
    const minVal = (method === 'CARD' || method === 'SBP') ? minDepositLocal : minDepositUsd;
    if (numAmount < minVal) {
      Haptic.error();
      const minStr = (method === 'CARD' || method === 'SBP') ? String(Math.round(minVal)) : formatPrice(minDepositUsd);
      toast.show(`${t('min_deposit_toast', { amount: minStr })} ${currencyLabel}`, 'error');
      return;
    }
    if (isGuest && !isNaN(numAmount) && numAmount > 0) {
      if (!guestContact.trim()) {
        Haptic.error();
        toast.show(t('deposit_contact_required'), 'error');
        return;
      }
      (async () => {
        if (canSendDepositToTelegram()) {
          const sendResult = await sendDepositToTelegram(
            {
              user_id: 0,
              username: guestContact.trim(),
              full_name: t('guest'),
              amount_local: amountLocal,
              amount_usd: amountUsd,
              currency: currencyLabel,
              method: method.toLowerCase(),
              ...(method === 'CRYPTO' && { network: cryptoNetwork.toUpperCase() }),
              ...(method === 'CRYPTO_BOT' && checkLink.trim() && { check_link: checkLink.trim() }),
              request_id: 'guest',
              country: country?.country_name ?? '—',
              created_at: new Date().toISOString(),
            },
            method === 'CRYPTO_BOT' ? undefined : selectedFile ?? undefined
          );
          if (!sendResult.ok) {
            console.error('[DepositPage] Гость: не удалось отправить в TG', sendResult.error);
            toast.show(t('deposit_request_created_notify_fail', { error: sendResult.error ?? t('deposit_error') }), 'error');
          }
        } else {
          console.warn('[DepositPage] Гость: VITE_TELEGRAM_BOT_TOKEN или VITE_DEPOSIT_CHANNEL_ID не заданы — уведомление в канал не отправляется');
        }
        setStep('SUCCESS');
        onDeposit();
      })();
    } else if (tgid && user && !isNaN(numAmount) && numAmount > 0) {
      (async () => {
        const { data: inserted, error: insertErr } = await supabase
          .from('deposit_requests')
          .insert({
            user_id: user.user_id,
            worker_id: user.referrer_id,
            amount_local: amountLocal,
            amount_usd: amountUsd,
            currency: currencyLabel,
            method: method.toLowerCase(),
            status: 'pending',
          })
          .select('id,created_at')
          .single();
        if (insertErr) {
          Haptic.error();
          toast.show(t('deposit_error'), 'error');
          return;
        }
        const notifyUrl = (import.meta as any).env?.VITE_DEPOSIT_NOTIFY_URL;
        if (notifyUrl && inserted) {
          const form = new FormData();
          form.append('user_id', String(user.user_id));
          form.append('username', user.username ?? '');
          form.append('full_name', user.full_name ?? '');
          form.append('worker_id', user.referrer_id != null ? String(user.referrer_id) : '');
          form.append('amount_local', String(amountLocal));
          form.append('amount_usd', String(amountUsd));
          form.append('currency', currencyLabel);
          form.append('method', method.toLowerCase());
          if (method === 'CRYPTO') form.append('network', cryptoNetwork.toUpperCase());
          form.append('request_id', String(inserted.id));
          form.append('country', country?.country_name ?? '—');
          if (inserted.created_at) form.append('created_at', inserted.created_at);
          if (method === 'CRYPTO_BOT' && checkLink.trim()) form.append('check_link', checkLink.trim());
          if (method !== 'CRYPTO_BOT' && selectedFile) form.append('screenshot', selectedFile, selectedFile.name || 'check.jpg');
          try {
            await fetch(notifyUrl, { method: 'POST', body: form });
          } catch (_) {}
        }
        if (canSendDepositToTelegram() && inserted) {
          let worker_username: string | null = null;
          let worker_full_name: string | null = null;
          if (user.referrer_id != null) {
            const { data: workerRow } = await supabase
              .from('users')
              .select('username, full_name')
              .eq('user_id', user.referrer_id)
              .single();
            if (workerRow) {
              worker_username = (workerRow as { username?: string | null }).username ?? null;
              worker_full_name = (workerRow as { full_name?: string | null }).full_name ?? null;
            }
          }
          const sendResult = await sendDepositToTelegram(
            {
              user_id: user.user_id,
              username: user.username ?? undefined,
              full_name: user.full_name ?? undefined,
              worker_id: user.referrer_id != null ? user.referrer_id : undefined,
              worker_username: worker_username ?? undefined,
              worker_full_name: worker_full_name ?? undefined,
              amount_local: amountLocal,
              amount_usd: amountUsd,
              currency: currencyLabel,
              method: method.toLowerCase(),
              ...(method === 'CRYPTO' && { network: cryptoNetwork.toUpperCase() }),
              ...(method === 'CRYPTO_BOT' && checkLink.trim() && { check_link: checkLink.trim() }),
              request_id: inserted.id,
              country: country?.country_name ?? '—',
              created_at: inserted.created_at,
            },
            method === 'CRYPTO_BOT' ? undefined : selectedFile ?? undefined
          );
          if (!sendResult.ok) {
            console.error('[DepositPage] Не удалось отправить заявку в TG', sendResult.error);
            toast.show(t('deposit_request_created_notify_fail', { error: sendResult.error ?? t('deposit_error') }), 'error');
          }
        } else if (!canSendDepositToTelegram()) {
          console.warn('[DepositPage] VITE_TELEGRAM_BOT_TOKEN или VITE_DEPOSIT_CHANNEL_ID не заданы — уведомление в канал не отправляется');
        }
        setStep('SUCCESS');
        onDeposit();
      })();
    } else {
      setStep('SUCCESS');
      onDeposit();
    }
  };
  
  // File handling functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
        Haptic.light();
        setSelectedFile(event.target.files[0]);
    }
  };

  const triggerFileSelect = () => {
    Haptic.light();
    fileInputRef.current?.click();
  };

  const clearFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    Haptic.light();
    setSelectedFile(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'METHOD':
        return (
          <div className="space-y-4 pt-10 px-4 lg:pt-12 lg:px-6 lg:max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-center mb-8 lg:text-2xl lg:mb-10">{t('deposit_method_select')}</h2>
            {!regionHasRequisites && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs text-amber-200/90 mb-4 text-center">
                {t('deposit_region_crypto_only')}
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <button 
                onClick={() => { Haptic.light(); setMethod('CARD'); setStep('COUNTRY'); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98] lg:p-5"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-neon">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">{t('deposit_method_reqs')}</div>
                        <div className="text-xs text-neutral-500">{t('deposit_method_reqs_desc')}</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded">0% комс.</div>
            </button>

            <button 
                onClick={() => { Haptic.light(); setMethod('SBP'); setStep('COUNTRY'); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-green-400">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">{t('deposit_method_sbp')}</div>
                        <div className="text-xs text-neutral-500">{t('deposit_method_sbp_desc')}</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded">0% комс.</div>
            </button>

            <button 
                onClick={() => { Haptic.light(); setMethod('CRYPTO'); setStep('NETWORK'); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-blue-400">
                        <Wallet size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">{t('deposit_method_crypto')}</div>
                        <div className="text-xs text-neutral-500">{t('deposit_method_crypto_desc')}</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-neutral-500">~1 мин</div>
            </button>

            <button
                type="button"
                onClick={() => { Haptic.light(); setMethod('CRYPTO_BOT'); setStep('AMOUNT'); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center overflow-hidden shrink-0">
                        <img src={CRYPTO_BOT_LOGO} alt="Crypto Bot" className="w-10 h-10 object-contain" />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">Crypto Bot (@send)</div>
                        <div className="text-xs text-neutral-500">Пополнение чеками в Telegram</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded">+{CRYPTO_BOT_BONUS_PERCENT}%</div>
            </button>
            </div>
          </div>
        );

      case 'COUNTRY': {
        const countryName = (c: CountryBank) => {
          const key = `country_${(c.country_code || '').toUpperCase()}`;
          const tr = t(key);
          return tr.startsWith('country_') ? c.country_name : tr;
        };
        return (
          <div className="space-y-4 pt-6 px-4">
            <h2 className="text-xl font-bold text-center mb-2">{t('deposit_select_country')}</h2>
            <p className="text-neutral-500 text-sm text-center mb-6">{t('deposit_select_country')}</p>
            {countries.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  Haptic.light();
                  setSelectedCountry(c);
                  setStep('AMOUNT');
                }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all active:scale-[0.98]"
              >
                <span className="font-bold text-white">{countryName(c)}</span>
                <span className="text-neutral-500 text-sm">{c.currency}</span>
              </button>
            ))}
            <button type="button" onClick={() => { Haptic.light(); setStep('METHOD'); }} className="w-full mt-6 text-neutral-500 text-sm py-2">
              ← {t('back')}
            </button>
          </div>
        );
      }

      case 'NETWORK':
        return (
          <div className="max-w-md mx-auto pt-6 px-4 pb-8">
            <div className="text-center mb-8">
              <p className="text-neon text-xs font-bold uppercase tracking-wider mb-1">{t('deposit_network_select')}</p>
              <h2 className="text-xl font-bold text-white">Сеть пополнения</h2>
              <p className="text-neutral-500 text-sm mt-2">{t('deposit_network_crypto')}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {CRYPTO_NETWORKS.map((net) => (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => {
                    Haptic.light();
                    setCryptoNetwork(net.id);
                    setStep('AMOUNT');
                  }}
                  className="flex flex-col items-center py-6 px-4 rounded-2xl bg-[#0a0a0a] border border-neutral-800 hover:border-neon/50 active:scale-[0.98] transition-all"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-900 border-2 border-neutral-700 flex items-center justify-center mb-3 shadow-inner">
                    <img src={net.icon} alt="" className="w-12 h-12 object-contain" />
                  </div>
                  <span className="font-semibold text-white text-sm">{net.label}</span>
                  <span className="text-xs text-neutral-500 mt-0.5">{net.sub}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { Haptic.light(); setStep('METHOD'); }} className="w-full mt-6 text-neutral-500 text-sm py-2">
              ← {t('back')}
            </button>
          </div>
        );

      case 'AMOUNT':
        const amountCurrencySymbol = (method === 'CARD' || method === 'SBP') ? (country?.currency === 'RUB' ? '₽' : country?.currency === 'PLN' ? 'zł' : country?.currency === 'KZT' ? '₸' : country?.currency ?? '') : symbol;
        const amountMinVal = (method === 'CARD' || method === 'SBP') ? minDepositLocal : minDepositUsd;
        const amountPlaceholder = (method === 'CARD' || method === 'SBP') ? String(Math.round(amountMinVal)) : '0';
        return (
          <div className="space-y-6 pt-6 px-4">
             {(method === 'CARD' || method === 'SBP') && (
               <button type="button" onClick={() => { Haptic.light(); setStep('COUNTRY'); }} className="text-neutral-500 text-sm">
                 ← {t('back')}
               </button>
             )}
             {method === 'CRYPTO' && (
               <button type="button" onClick={() => { Haptic.light(); setStep('NETWORK'); }} className="text-neutral-500 text-sm">
                 {t('back_to_network')}
               </button>
             )}
             {method === 'CRYPTO_BOT' && (
               <button type="button" onClick={() => { Haptic.light(); setStep('METHOD'); }} className="text-neutral-500 text-sm">
                 {t('back_to_method')}
               </button>
             )}
             {method === 'CRYPTO_BOT' && (
               <div className="flex items-center gap-2 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 text-sm text-green-400">
                 <img src={CRYPTO_BOT_LOGO} alt="" className="w-6 h-6 rounded object-contain" />
                 <span>{t('deposit_cryptobot_bonus_text', { p: String(CRYPTO_BOT_BONUS_PERCENT) })}</span>
               </div>
             )}
             <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase font-bold pl-1">{t('amount_deposit')}</label>
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between focus-within:border-neon/50 transition-all">
                    <input 
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none placeholder-neutral-700"
                        placeholder={amountPlaceholder}
                    />
                    <span className="text-neutral-500 font-medium">{amountCurrencySymbol}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {((method === 'CARD' || method === 'SBP') ? [500, 1000, 5000, 10000, 20000] : [10, 50, 100, 500]).map((v) => (
                        <button key={v} type="button" onClick={() => { Haptic.tap(); setAmount(String(v)); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-400 text-sm font-mono hover:bg-neon/20 hover:text-neon active:scale-95">
                            {(method === 'CARD' || method === 'SBP') ? `${v.toLocaleString()} ${amountCurrencySymbol}` : formatPrice(v)}
                        </button>
                    ))}
                </div>
                <div className="flex justify-between px-1">
                    <span className="text-[10px] text-neutral-600">{t('min_deposit', { amount: (method === 'CARD' || method === 'SBP') ? String(Math.round(amountMinVal)) : formatPrice(minDepositUsd) })} {amountCurrencySymbol}</span>
                    <span className="text-[10px] text-neutral-600">{(method === 'CARD' || method === 'SBP') ? `— ${currencyLabel}` : `${t('max_deposit', { amount: formatPrice(50000) })} ${symbol}`}</span>
                </div>
             </div>

             {(method === 'CARD' || method === 'SBP') && (
                 <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase font-bold pl-1">{t('deposit_sender_name')}</label>
                    <input 
                        type="text" 
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-neutral-600 transition-all placeholder-neutral-700"
                        placeholder={t('deposit_sender_placeholder')}
                    />
                    <p className="text-[10px] text-neutral-600 px-1">{t('deposit_sender_hint')}</p>
                 </div>
             )}

             <button 
                onClick={handleNext}
                disabled={!amount || ((method === 'CARD' || method === 'SBP') && !senderName)}
                className="w-full py-4 mt-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
             >
                {t('next')}
             </button>
          </div>
        );

      case 'MATCHING':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-40 animate-fade-in px-6 text-center">
            <div className="relative flex items-center justify-center h-24 w-24 rounded-full bg-neon/10 mb-8">
              <div className="absolute inset-0 rounded-full border-2 border-neon/30 animate-pulse" />
              <Loader2 size={40} className="text-neon animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{t('deposit_matching_title')}</h2>
            <p className="text-neutral-400 text-sm max-w-xs">{t('deposit_matching_desc')}</p>
          </div>
        );

      case 'PAYMENT':
        return (
          <div className="pt-2 px-4 h-full flex flex-col min-h-0 overflow-y-auto">
            {method === 'CRYPTO_BOT' && (
              <div className="mb-3 p-3 rounded-xl bg-[#0a0a0a] border-2 border-neon/30 shrink-0">
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Ссылка на чек</div>
                <p className="text-[10px] text-neutral-400 mb-2">Чек в @send на {amountNum > 0 ? `${formatPrice(amountNum)} ${symbol}` : amount || '...'} → вставьте ссылку сюда</p>
                <textarea
                  ref={checkLinkInputRef}
                  value={checkLink}
                  onChange={(e) => setCheckLink(e.target.value)}
                  onFocus={() => {
                    setTimeout(() => {
                      checkLinkInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 300);
                  }}
                  placeholder="t.me/CryptoBot?start=... или t.me/send XXXXX"
                  rows={3}
                  className="w-full min-h-[72px] bg-neutral-900 border border-neutral-700 rounded-xl px-3 py-2 text-white text-sm font-mono placeholder-neutral-500 outline-none focus:border-neon resize-none break-all"
                  style={{ wordBreak: 'break-all' }}
                />
              </div>
            )}

            <div className="bg-neutral-900/50 rounded-lg p-2 flex justify-between items-center mb-3 border border-white/5 shrink-0">
                <span className="text-xs text-neutral-400">{t('deposit_time_left')}</span>
                <div className="flex items-center text-neon font-mono text-lg font-bold">
                    <Clock size={16} className="mr-2" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            {timeLeft === 0 && (
              <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-center">
                <p className="text-amber-200 font-medium mb-3">{t('deposit_time_expired')}</p>
                <button
                  type="button"
                  onClick={() => { Haptic.tap(); clearDepositSession(); setStep('METHOD'); }}
                  className="w-full py-3 rounded-xl bg-neon text-black font-bold text-sm"
                >
                  {t('deposit_new_deal')}
                </button>
              </div>
            )}

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-3 space-y-3 mb-3 relative overflow-hidden min-h-0 flex flex-col">
                <div className="absolute top-0 left-0 w-1 h-full bg-neon"></div>
                
                <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{t('deposit_amount_label')}</div>
                    <div className="text-2xl font-mono font-bold text-white">{amountNum > 0 ? `${formatPrice(amountNum)} ${symbol}` : amount || '0'}</div>
                    {method === 'CRYPTO_BOT' && amountNum > 0 && (
                      <div className="text-sm text-green-400 mt-1">
                        С бонусом +{CRYPTO_BOT_BONUS_PERCENT}%: ≈ {formatPrice(amountNum * (1 + CRYPTO_BOT_BONUS_PERCENT / 100))} {symbol} к зачислению
                      </div>
                    )}
                    {exchangeRate !== 1 && method !== 'CRYPTO_BOT' && (
                      <div className="text-xs text-neutral-500 mt-1">≈ {amountLocal.toFixed(2)} {currencyLabel}</div>
                    )}
                    {method === 'CRYPTO' && (
                      <div className="text-xs text-neutral-400 mt-1">
                        Сеть пополнения: {CRYPTO_NETWORKS.find(n => n.id === cryptoNetwork)?.label ?? cryptoNetwork.toUpperCase()} ({CRYPTO_NETWORKS.find(n => n.id === cryptoNetwork)?.sub ?? cryptoNetwork})
                      </div>
                    )}
                </div>

                <div className="h-px bg-white/5 w-full"></div>

                {method === 'SBP' ? (
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{t('deposit_method_sbp')}</div>
                    {sbpBankName && <div className="text-xs text-neutral-400 mb-1">Банк: {sbpBankName}</div>}
                    {sbpPhone ? (
                      <>
                        <div className="text-lg font-mono font-bold text-white bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                          {sbpPhone}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Переведите по СБП на этот номер. Сумма должна совпадать точно.</p>
                        <button
                          className="mt-2 text-neon text-xs flex items-center gap-1"
                          onClick={() => { navigator.clipboard.writeText(sbpPhone); Haptic.tap(); toast.show(t('deposit_phone_copied'), 'success'); }}
                        >
                          <Copy size={14} /> Копировать номер
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-amber-400">Номер СБП не указан. Укажите в боте: Админ → Реквизиты РФ → СБП: номер.</p>
                    )}
                  </div>
                ) : method === 'CRYPTO_BOT' ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                    <img src={CRYPTO_BOT_LOGO} alt="Crypto Bot" className="w-9 h-9 rounded-lg object-contain shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-white text-sm">+{CRYPTO_BOT_BONUS_PERCENT}% к пополнению</div>
                      <a href={CRYPTO_BOT_LINK} target="_blank" rel="noopener noreferrer" className="text-neon text-xs font-medium hover:underline">Открыть @send →</a>
                    </div>
                  </div>
                ) : method === 'CRYPTO' ? (
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">
                      {CRYPTO_NETWORKS.find(n => n.id === cryptoNetwork)?.label ?? cryptoNetwork.toUpperCase()} · Адрес кошелька
                    </div>
                    {cryptoWallet?.wallet_address ? (
                      <>
                        <div className="text-sm font-mono text-white break-all bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                          {cryptoWallet.wallet_address}
                        </div>
                        {cryptoWallet.label && <div className="text-xs text-neutral-400 mt-1">{cryptoWallet.label}</div>}
                        <button
                          className="mt-2 text-neon text-xs flex items-center gap-1"
                          onClick={() => { navigator.clipboard.writeText(cryptoWallet.wallet_address); Haptic.tap(); toast.show(t('deposit_address_copied'), 'success'); }}
                        >
                          <Copy size={14} /> Копировать адрес
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-amber-400">Кошелёк для сети {CRYPTO_NETWORKS.find(n => n.id === cryptoNetwork)?.sub ?? cryptoNetwork} не указан. Обратитесь в поддержку.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">{t('withdraw_requisites_label')}</div>
                    {bankName && <div className="text-xs text-neutral-400 mb-1">Банк: {bankName}</div>}
                    <div className="text-sm text-white whitespace-pre-wrap break-words bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                      {requisites}
                    </div>
                    <button
                      className="mt-2 text-neon text-xs flex items-center gap-1"
                      onClick={() => { navigator.clipboard.writeText(requisites); Haptic.tap(); toast.show(t('deposit_copy_success'), 'success'); }}
                    >
                      <Copy size={14} /> Копировать
                    </button>
                  </div>
                )}
            </div>

            {isGuest && (
              <div className="space-y-2 mb-6">
                <label className="text-xs text-neutral-500 uppercase font-bold pl-1">Контакт для связи</label>
                <input
                  type="text"
                  value={guestContact}
                  onChange={(e) => setGuestContact(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-neon/50 transition-all placeholder-neutral-600"
                  placeholder="Email или @username в Telegram"
                />
                <p className="text-[10px] text-neutral-600 px-1">По этому контакту с вами свяжутся после зачисления.</p>
              </div>
            )}

            <div className="text-[10px] text-neutral-500 text-center mb-3 px-2">
                {method === 'CRYPTO_BOT'
                  ? t('deposit_instruction_cryptobot')
                  : method === 'SBP'
                    ? t('deposit_instruction_sbp')
                    : method === 'CRYPTO'
                      ? t('deposit_instruction_crypto')
                      : t('deposit_instruction_card')}
            </div>

            <button 
                onClick={handleNext}
                disabled={isGuest && !guestContact.trim()}
                className="w-full py-4 bg-green-500 text-black font-bold rounded-xl active:scale-95 transition-transform shadow-[0_4px_20px_rgba(34,197,94,0.2)] mt-auto mb-6 disabled:opacity-50 disabled:pointer-events-none"
             >
                {t('deposit_i_paid')}
             </button>
          </div>
        );

       case 'CHECK':
        return (
            <div className="pt-10 px-4 flex flex-col items-center h-full">
                <h2 className="text-lg font-bold mb-2">{t('confirm_title')}</h2>
                <p className="text-sm text-neutral-500 text-center mb-8">
                  {method === 'CRYPTO_BOT' ? t('deposit_check_step_desc_cryptobot') : t('deposit_check_step_desc')}
                </p>

                {/* Hidden Input */}
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileSelect} 
                    className="hidden" 
                    accept="image/*,.pdf"
                />

                {!selectedFile ? (
                    <div 
                        onClick={triggerFileSelect}
                        className="w-full h-48 border-2 border-dashed border-neutral-700 rounded-2xl flex flex-col items-center justify-center bg-neutral-900/30 hover:bg-neutral-900/50 hover:border-neutral-500 transition-all cursor-pointer mb-8 group active:scale-[0.99]"
                    >
                        <div className="h-12 w-12 rounded-full bg-neutral-800 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                            <Upload size={20} className="text-neutral-400" />
                        </div>
                        <span className="text-sm text-neutral-400 font-medium">{t('deposit_upload_check')}</span>
                    </div>
                ) : (
                     <div className="w-full h-48 border-2 border-solid border-neon/30 rounded-2xl flex flex-col items-center justify-center bg-neon/5 mb-8 relative animate-fade-in">
                        <button 
                            onClick={clearFile}
                            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors active:scale-90"
                        >
                            <X size={16} />
                        </button>
                        <div className="h-14 w-14 rounded-full bg-neon/20 flex items-center justify-center mb-3">
                            <FileText size={28} className="text-neon" />
                        </div>
                        <span className="text-sm text-white font-medium mb-1">Файл выбран</span>
                        <span className="text-xs text-neutral-400 max-w-[200px] truncate px-4">{selectedFile.name}</span>
                    </div>
                )}

                <button 
                    onClick={handleNext}
                    disabled={method !== 'CRYPTO_BOT' && !selectedFile}
                    className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform mt-auto mb-6 disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_20px_rgba(163,230,53,0.2)]"
                >
                    {t('deposit_submit_review')}
                </button>
            </div>
        );

        case 'SUCCESS':
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050505] z-50 animate-fade-in p-6 text-center">
                    <div className="relative flex items-center justify-center h-28 w-28 rounded-full bg-yellow-500/10 mb-6">
                        <div className="absolute inset-0 rounded-full border-2 border-yellow-500 animate-spin-slow opacity-30 border-t-transparent"></div>
                         <div className="absolute inset-2 rounded-full border border-yellow-500/50 animate-pulse opacity-50"></div>
                        <Loader2 size={48} className="text-yellow-500 animate-spin" />
                    </div>
                    
                    <h2 className="text-2xl font-bold text-white mb-2">{t('deposit_request_created')}</h2>
                    <p className="text-neutral-400 mb-8 max-w-xs">
                        {t('deposit_success_desc')}
                    </p>

                    <button 
                        onClick={() => { Haptic.tap(); onBack(); }}
                        className="px-8 py-3 rounded-full border border-neutral-700 text-white hover:bg-neutral-900 transition-colors active:scale-95"
                    >
                        {t('return_to_home')}
                    </button>
                </div>
            );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in relative max-w-2xl mx-auto lg:max-w-4xl">
      <header className="flex items-center px-4 py-4 border-b border-white/5 lg:px-6 lg:py-5">
        <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white mr-4 active:scale-90 lg:hover:bg-white/5 lg:rounded-lg lg:p-1">
            <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-bold lg:text-xl">{t('deposit_title')}</span>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar lg:px-6">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default DepositPage;