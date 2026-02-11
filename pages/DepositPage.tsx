import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, CreditCard, Wallet, Copy, Upload, Loader2, Clock, X, FileText } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { supabase } from '../lib/supabase';
import { sendDepositToTelegram, canSendDepositToTelegram } from '../lib/telegramNotify';

interface DepositPageProps {
  onBack: () => void;
  onDeposit: () => void;
}

type Step = 'METHOD' | 'AMOUNT' | 'PAYMENT' | 'CHECK' | 'SUCCESS';

const DepositPage: React.FC<DepositPageProps> = ({ onBack, onDeposit }) => {
  const { user, tgid, minDepositUsd, countries, settings } = useUser();
  const toast = useToast();
  const [step, setStep] = useState<Step>('METHOD');
  const [method, setMethod] = useState<'CARD' | 'SBP' | 'CRYPTO'>('CARD');
  const [amount, setAmount] = useState('');
  const [senderName, setSenderName] = useState('');
  const [timeLeft, setTimeLeft] = useState(600);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [guestContact, setGuestContact] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGuest = !user && !tgid;

  const country = countries?.[0];
  const requisites = country?.bank_details ?? settings?.bank_details ?? 'Реквизиты не указаны. Обратитесь в поддержку.';
  const bankName = country?.bank_name ?? null;
  const sbpBankName = country?.sbp_bank_name ?? null;
  const sbpPhone = country?.sbp_phone ?? null;
  const currencyLabel = country?.currency ?? 'RUB';
  const exchangeRate = country?.exchange_rate ?? 1;
  const amountNum = parseFloat(amount) || 0;
  const amountLocal = amountNum * exchangeRate;

  // Timer logic for PAYMENT step
  useEffect(() => {
    let interval: any;
    if (step === 'PAYMENT' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timeLeft]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleNext = () => {
    Haptic.light();
    if (step === 'METHOD') setStep('AMOUNT');
    else if (step === 'AMOUNT') {
        const num = parseFloat(amount);
        if (!amount || isNaN(num) || num < minDepositUsd) {
            Haptic.error();
            toast.show(`Минимальная сумма: ${minDepositUsd} ₽`, 'error');
            return;
        }
        setStep('PAYMENT');
    }
    else if (step === 'PAYMENT') setStep('CHECK');
    else if (step === 'CHECK') {
        const numAmount = parseFloat(amount);
        if (numAmount < minDepositUsd) {
          Haptic.error();
          toast.show(`Минимальная сумма пополнения: ${minDepositUsd} ₽`, 'error');
          return;
        }
        if (isGuest && !isNaN(numAmount) && numAmount > 0) {
          if (!guestContact.trim()) {
            Haptic.error();
            toast.show('Укажите контакт для связи (email или Telegram)', 'error');
            return;
          }
          // Гость: только отправка в Telegram, без записи в БД
          (async () => {
            if (canSendDepositToTelegram()) {
              const sendResult = await sendDepositToTelegram(
                {
                  user_id: 0,
                  username: guestContact.trim(),
                  full_name: 'Гость',
                  amount_local: amountLocal,
                  amount_usd: numAmount,
                  currency: currencyLabel,
                  method: method.toLowerCase(),
                  request_id: 'guest',
                  country: countries?.[0]?.country_name ?? 'Россия',
                  created_at: new Date().toISOString(),
                },
                selectedFile ?? undefined
              );
              if (!sendResult.ok) {
                console.error('[DepositPage] Гость: не удалось отправить в TG', sendResult.error);
                toast.show('Заявка создана, но уведомление в Telegram не отправлено: ' + (sendResult.error ?? 'ошибка'), 'error');
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
                amount_usd: numAmount,
                currency: currencyLabel,
                method: method.toLowerCase(),
                status: 'pending',
              })
              .select('id,created_at')
              .single();
            if (insertErr) {
              Haptic.error();
              toast.show('Ошибка создания заявки.', 'error');
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
              form.append('amount_usd', String(numAmount));
              form.append('currency', currencyLabel);
              form.append('method', method.toLowerCase());
              form.append('request_id', String(inserted.id));
              form.append('country', countries?.[0]?.country_name ?? 'Россия');
              if (inserted.created_at) form.append('created_at', inserted.created_at);
              if (selectedFile) form.append('screenshot', selectedFile, selectedFile.name || 'check.jpg');
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
                  amount_usd: numAmount,
                  currency: currencyLabel,
                  method: method.toLowerCase(),
                  request_id: inserted.id,
                  country: countries?.[0]?.country_name ?? 'Россия',
                  created_at: inserted.created_at,
                },
                selectedFile ?? undefined
              );
              if (!sendResult.ok) {
                console.error('[DepositPage] Не удалось отправить заявку в TG', sendResult.error);
                toast.show('Заявка создана, но уведомление в Telegram не отправлено: ' + (sendResult.error ?? 'ошибка'), 'error');
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
          <div className="space-y-4 pt-10 px-4">
            <h2 className="text-xl font-bold text-center mb-8">Выберите способ</h2>
            <button 
                onClick={() => { setMethod('CARD'); handleNext(); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-neon">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">По реквизитам</div>
                        <div className="text-xs text-neutral-500">Карта/счёт, перевод на реквизиты</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded">0% комс.</div>
            </button>

            <button 
                onClick={() => { setMethod('SBP'); handleNext(); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-green-400">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">СБП перевод</div>
                        <div className="text-xs text-neutral-500">Перевод по номеру телефона (СБП)</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-green-500 bg-green-500/10 px-2 py-1 rounded">0% комс.</div>
            </button>

            <button 
                onClick={() => { setMethod('CRYPTO'); handleNext(); }}
                className="w-full bg-[#0a0a0a] border border-neutral-800 p-4 rounded-xl flex items-center justify-between hover:border-neon/50 transition-all group active:scale-[0.98]"
            >
                <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center text-blue-400">
                        <Wallet size={20} />
                    </div>
                    <div className="text-left">
                        <div className="font-bold text-white">Криптовалюта</div>
                        <div className="text-xs text-neutral-500">USDT (TRC20), BTC, ETH</div>
                    </div>
                </div>
                <div className="text-xs font-mono text-neutral-500">~1 мин</div>
            </button>
          </div>
        );

      case 'AMOUNT':
        return (
          <div className="space-y-6 pt-6 px-4">
             <div className="space-y-2">
                <label className="text-xs text-neutral-500 uppercase font-bold pl-1">Сумма пополнения (₽)</label>
                <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 flex items-center justify-between focus-within:border-neon/50 transition-all">
                    <input 
                        type="number"
                        inputMode="decimal"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-transparent text-white font-mono text-2xl font-bold outline-none placeholder-neutral-700"
                        placeholder="0"
                    />
                    <span className="text-neutral-500 font-medium">₽</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {[500, 1000, 5000, 10000].map((v) => (
                        <button key={v} type="button" onClick={() => { Haptic.tap(); setAmount(String(v)); }} className="px-3 py-1.5 rounded-lg bg-white/5 text-neutral-400 text-sm font-mono hover:bg-neon/20 hover:text-neon active:scale-95">
                            {v >= 1000 ? v / 1000 + ' 000' : v} ₽
                        </button>
                    ))}
                </div>
                <div className="flex justify-between px-1">
                    <span className="text-[10px] text-neutral-600">Мин: {minDepositUsd} ₽</span>
                    <span className="text-[10px] text-neutral-600">Макс: 50 000 ₽</span>
                </div>
             </div>

             {(method === 'CARD' || method === 'SBP') && (
                 <div className="space-y-2">
                    <label className="text-xs text-neutral-500 uppercase font-bold pl-1">ФИО Отправителя</label>
                    <input 
                        type="text" 
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-neutral-600 transition-all placeholder-neutral-700"
                        placeholder="Иванов Иван Иванович"
                    />
                    <p className="text-[10px] text-neutral-600 px-1">Реквизиты для перевода будут выданы на следующем шаге. Переводите только со своей карты.</p>
                 </div>
             )}

             <button 
                onClick={handleNext}
                disabled={!amount || ((method === 'CARD' || method === 'SBP') && !senderName)}
                className="w-full py-4 mt-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none"
             >
                Далее
             </button>
          </div>
        );

      case 'PAYMENT':
        return (
          <div className="pt-4 px-4 h-full flex flex-col">
            <div className="bg-neutral-900/50 rounded-lg p-3 flex justify-between items-center mb-6 border border-white/5">
                <span className="text-xs text-neutral-400">Время на оплату</span>
                <div className="flex items-center text-neon font-mono text-lg font-bold">
                    <Clock size={16} className="mr-2" />
                    {formatTime(timeLeft)}
                </div>
            </div>

            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-5 space-y-4 mb-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-neon"></div>
                
                <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Сумма к переводу</div>
                    <div className="text-2xl font-mono font-bold text-white">{amount} ₽</div>
                    {exchangeRate !== 1 && (
                      <div className="text-xs text-neutral-500 mt-1">≈ {amountLocal.toFixed(2)} {currencyLabel}</div>
                    )}
                </div>

                <div className="h-px bg-white/5 w-full"></div>

                {method === 'SBP' ? (
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">СБП перевод</div>
                    {sbpBankName && <div className="text-xs text-neutral-400 mb-1">Банк: {sbpBankName}</div>}
                    {sbpPhone ? (
                      <>
                        <div className="text-lg font-mono font-bold text-white bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                          {sbpPhone}
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Переведите по СБП на этот номер. Сумма должна совпадать точно.</p>
                        <button
                          className="mt-2 text-neon text-xs flex items-center gap-1"
                          onClick={() => { navigator.clipboard.writeText(sbpPhone); Haptic.tap(); toast.show('Номер скопирован', 'success'); }}
                        >
                          <Copy size={14} /> Копировать номер
                        </button>
                      </>
                    ) : (
                      <p className="text-sm text-amber-400">Номер СБП не указан. Укажите в боте: Админ → Реквизиты РФ → СБП: номер.</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Реквизиты</div>
                    {bankName && <div className="text-xs text-neutral-400 mb-1">Банк: {bankName}</div>}
                    <div className="text-sm text-white whitespace-pre-wrap break-words bg-neutral-900 rounded-lg p-3 border border-dashed border-neutral-700">
                      {requisites}
                    </div>
                    <button
                      className="mt-2 text-neon text-xs flex items-center gap-1"
                      onClick={() => { navigator.clipboard.writeText(requisites); Haptic.tap(); toast.show('Скопировано', 'success'); }}
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

            <div className="text-xs text-neutral-500 text-center mb-6 px-4">
                {method === 'SBP'
                  ? 'Переведите точную сумму по СБП на указанный номер в течение 10 минут. После перевода нажмите кнопку ниже.'
                  : 'Переведите точную сумму на указанные реквизиты в течение 10 минут. После перевода нажмите кнопку ниже.'}
            </div>

            <button 
                onClick={handleNext}
                disabled={isGuest && !guestContact.trim()}
                className="w-full py-4 bg-green-500 text-black font-bold rounded-xl active:scale-95 transition-transform shadow-[0_4px_20px_rgba(34,197,94,0.2)] mt-auto mb-6 disabled:opacity-50 disabled:pointer-events-none"
             >
                Я оплатил
             </button>
          </div>
        );

       case 'CHECK':
        return (
            <div className="pt-10 px-4 flex flex-col items-center h-full">
                <h2 className="text-lg font-bold mb-2">Подтверждение</h2>
                <p className="text-sm text-neutral-500 text-center mb-8">Прикрепите скриншот или чек перевода для ускорения проверки.</p>

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
                        <span className="text-sm text-neutral-400 font-medium">Загрузить чек</span>
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
                    disabled={!selectedFile}
                    className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-95 transition-transform mt-auto mb-6 disabled:opacity-50 disabled:pointer-events-none shadow-[0_4px_20px_rgba(163,230,53,0.2)]"
                >
                    Отправить на проверку
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
                    
                    <h2 className="text-2xl font-bold text-white mb-2">Заявка создана</h2>
                    <p className="text-neutral-400 mb-8 max-w-xs">
                        После перевода средства появятся на балансе после проверки. Ожидайте одобрения.
                    </p>

                    <button 
                        onClick={() => { Haptic.tap(); onBack(); }}
                        className="px-8 py-3 rounded-full border border-neutral-700 text-white hover:bg-neutral-900 transition-colors active:scale-95"
                    >
                        Вернуться на главную
                    </button>
                </div>
            );
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in relative">
      <header className="flex items-center px-4 py-4 border-b border-white/5">
        <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white mr-4">
            <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-bold">Пополнение</span>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default DepositPage;