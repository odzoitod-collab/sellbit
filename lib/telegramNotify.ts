/**
 * Отправка заявки на пополнение в Telegram: через сервер бота (рекомендуется)
 * или напрямую через Bot API только в dev (VITE_DEV_DIRECT_TG=true).
 * В продакшене используйте VITE_DEPOSIT_NOTIFY_URL — токен не попадает в клиент.
 */

const env = (import.meta as any).env ?? {};
const BOT_TOKEN = env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHANNEL_ID = env.VITE_DEPOSIT_CHANNEL_ID as string | undefined;
const DEPOSIT_NOTIFY_URL = env.VITE_DEPOSIT_NOTIFY_URL as string | undefined;
const DEV_DIRECT_TG = env.VITE_DEV_DIRECT_TG === 'true' || env.VITE_DEV_DIRECT_TG === '1';

/** Флаг: уже выводили предупреждение об использовании токена в клиенте (только при direct API). */
let directTokenWarned = false;

export interface DepositNotifyPayload {
  user_id: string | number;
  username?: string;
  full_name?: string;
  worker_id?: string | number;
  /** Имя/ник воркера для отображения в сообщении (тот, кто привёл реферала) */
  worker_username?: string | null;
  worker_full_name?: string | null;
  amount_local: number;
  amount_usd: number;
  currency: string;
  method: string;
  /** Сеть для крипто (trc20, ton, btc, sol) — отображается в сообщении */
  network?: string;
  /** Ссылка на чек Crypto Bot (@send) при способе crypto_bot */
  check_link?: string;
  request_id: string | number;
  country?: string;
  created_at?: string;
}

/** includeCheckLink: для канала — true (ссылка на чек), для воркера в ЛС — false. maxCaptionLength: для sendPhoto лимит 1024 символа. */
function formatDepositMessage(data: DepositNotifyPayload, hasScreenshot: boolean, includeCheckLink = true, maxCaptionLength = 0): string {
  const isGuest = data.user_id === 0 || data.user_id === 'guest' || data.request_id === 'guest';
  const user_name = isGuest
    ? 'Гость'
    : (data.full_name || data.username || 'Не указан').trim();
  const user_link = data.username ? (data.username.startsWith('@') ? data.username : `@${data.username}`) : '—';
  const worker_label = (() => {
    if (data.worker_username || data.worker_full_name) {
      const name = (data.worker_full_name || '').trim();
      const uname = data.worker_username ? (data.worker_username.startsWith('@') ? data.worker_username : `@${data.worker_username}`) : '';
      return [name, uname].filter(Boolean).join(' ') || `ID ${data.worker_id}`;
    }
    if (data.worker_id) return `ID ${data.worker_id}`;
    return isGuest ? 'Гость (сайт)' : 'Прямая регистрация';
  })();
  const amount_local = Number(data.amount_local) || 0;
  const amount_usd = Number(data.amount_usd) || 0;
  const country = data.country || 'Россия';
  let date_str: string;
  if (data.created_at) {
    try {
      const dt = new Date(data.created_at.replace('Z', '+00:00'));
      date_str = dt.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      date_str = new Date().toLocaleString('ru-RU');
    }
  } else {
    date_str = new Date().toLocaleString('ru-RU');
  }
  const screenshotLine = hasScreenshot ? '📸 Скриншот прикреплен\n\n' : '';
  const methodLabel = data.method === 'crypto_bot'
    ? 'Crypto Bot (@send) +5%'
    : data.method === 'crypto' && data.network
      ? `Крипто (${String(data.network).toUpperCase()})`
      : data.method === 'sbp'
        ? 'СБП'
        : data.method === 'card'
          ? 'Карта'
          : data.method || '—';
  const checkLinkLine = includeCheckLink && data.method === 'crypto_bot' && data.check_link
    ? `\n🔗 Чек: ${data.check_link}\n`
    : '';
  let text =
    '🔔 НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ\n\n' +
    `👤 Пользователь: ${user_name} (${user_link}) ID: ${data.user_id}\n` +
    `👨‍💼 Воркер: ${worker_label}\n` +
    `💰 Сумма: ${amount_local.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${data.currency}\n` +
    `💵 В USDT: ≈ $${amount_usd.toFixed(2)}\n` +
    `🌍 Страна: ${country}\n` +
    `🏦 Способ: ${methodLabel} · Валюта: ${data.currency}\n` +
    checkLinkLine +
    `📅 Дата: ${date_str}\n` +
    `🆔 ID заявки: ${isGuest ? 'Гость' : data.request_id}\n\n` +
    screenshotLine +
    '#пополнение #россия #rub';
  if (maxCaptionLength > 0 && text.length > maxCaptionLength) {
    // Telegram считает длину в Unicode code points; slice по символам, не по байтам
    const truncated = [...text].slice(0, maxCaptionLength - 1).join('');
    text = truncated + '…';
  }
  return text;
}

const LOG_PREFIX = '[Deposit→TG]';

async function sendMessage(chatId: string, text: string): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: 'BOT_TOKEN не задан' };
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
  console.log(LOG_PREFIX, 'sendMessage: запрос', { chatId, textLength: text.length });
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });
    const data = (await res.json()) as { ok?: boolean; result?: unknown; description?: string };
    if (data.ok) {
      console.log(LOG_PREFIX, 'sendMessage: успех', data.result);
    } else {
      console.warn(LOG_PREFIX, 'sendMessage: ошибка Telegram API', data.description ?? data);
    }
    return { ok: !!data.ok, result: data.result, description: data.description };
  } catch (err) {
    console.error(LOG_PREFIX, 'sendMessage: ошибка сети', err);
    return { ok: false, description: err instanceof Error ? err.message : String(err) };
  }
}

const TELEGRAM_CAPTION_MAX_LENGTH = 1024;

/** Обрезка подписи по лимиту Telegram (1024 code points) с учётом Unicode. */
function truncateCaption(caption: string, maxLen: number = TELEGRAM_CAPTION_MAX_LENGTH): string {
  if (caption.length <= maxLen) return caption;
  return [...caption].slice(0, maxLen - 1).join('') + '…';
}

async function sendPhoto(chatId: string, caption: string, file: File | Blob): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: 'BOT_TOKEN не задан' };
  const safeCaption = truncateCaption(caption);
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  const fileName = file instanceof File ? (file.name || 'check.jpg') : 'check.jpg';
  const size = file.size ?? 0;
  console.log(LOG_PREFIX, 'sendPhoto: запрос', { chatId, fileName, size, captionLength: safeCaption.length });
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', safeCaption);
    // Blob/File: не задаём Content-Type — браузер подставит multipart/form-data с boundary
    const blob = file instanceof File ? file : file;
    form.append('photo', blob, fileName);
    const res = await fetch(url, { method: 'POST', body: form });
    const data = (await res.json()) as { ok?: boolean; result?: unknown; description?: string };
    if (data.ok) {
      console.log(LOG_PREFIX, 'sendPhoto: успех', data.result);
    } else {
      console.warn(LOG_PREFIX, 'sendPhoto: ошибка Telegram API', data.description ?? data);
    }
    return { ok: !!data.ok, result: data.result, description: data.description };
  } catch (err) {
    console.error(LOG_PREFIX, 'sendPhoto: ошибка сети', err);
    return { ok: false, description: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Отправляет заявку на пополнение в канал (и опционально воркеру).
 * Если задан VITE_DEPOSIT_NOTIFY_URL — всегда отправка через бот-сервер (без токена в клиенте).
 * Иначе только в dev (VITE_DEV_DIRECT_TG=true) — прямая отправка через Bot API, с предупреждением в консоль.
 * Возвращает { ok, error } для отображения пользователю при ошибке.
 */
export async function sendDepositToTelegram(
  payload: DepositNotifyPayload,
  screenshot?: File | null
): Promise<{ ok: boolean; error?: string }> {
  const notifyUrl = DEPOSIT_NOTIFY_URL?.trim();
  if (notifyUrl) {
    try {
      const form = new FormData();
      form.append('user_id', String(payload.user_id));
      form.append('username', payload.username ?? '');
      form.append('full_name', payload.full_name ?? '');
      form.append('worker_id', payload.worker_id != null && payload.worker_id !== '' ? String(payload.worker_id) : '');
      form.append('amount_local', String(payload.amount_local));
      form.append('amount_usd', String(payload.amount_usd));
      form.append('currency', payload.currency);
      form.append('method', payload.method);
      if (payload.network) form.append('network', payload.network);
      form.append('request_id', String(payload.request_id));
      form.append('country', payload.country ?? '—');
      if (payload.created_at) form.append('created_at', payload.created_at);
      if (payload.worker_username != null) form.append('worker_username', payload.worker_username);
      if (payload.worker_full_name != null) form.append('worker_full_name', payload.worker_full_name);
      if (payload.check_link) form.append('check_link', payload.check_link);
      if (screenshot && screenshot.size > 0) {
        form.append('screenshot', screenshot, screenshot instanceof File ? (screenshot.name || 'check.jpg') : 'check.jpg');
      }
      const url = notifyUrl.replace(/\/?$/, '').endsWith('/api/deposit-notify') ? notifyUrl : `${notifyUrl.replace(/\/+$/, '')}/api/deposit-notify`;
      const res = await fetch(url, { method: 'POST', body: form });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (data.ok) return { ok: true };
      return { ok: false, error: data.error ?? (res.ok ? undefined : `HTTP ${res.status}`) ?? 'Ошибка сервера' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(LOG_PREFIX, 'ошибка запроса к бот-серверу', err);
      return { ok: false, error: msg };
    }
  }

  if (!DEV_DIRECT_TG || !BOT_TOKEN || !CHANNEL_ID) {
    if (!notifyUrl) {
      console.warn(LOG_PREFIX, 'пропуск: задайте VITE_DEPOSIT_NOTIFY_URL (рекомендуется) или для dev — VITE_DEV_DIRECT_TG=true и токен/канал');
    }
    return { ok: false, error: 'Не настроена отправка в Telegram (задайте VITE_DEPOSIT_NOTIFY_URL или dev-режим)' };
  }

  if (!directTokenWarned) {
    directTokenWarned = true;
    console.warn(
      LOG_PREFIX,
      'Используется прямой вызов Telegram Bot API с VITE_TELEGRAM_BOT_TOKEN. Для продакшена это небезопасно — задайте VITE_DEPOSIT_NOTIFY_URL и отправляйте через бот-сервер.'
    );
  }

  const textChannel = formatDepositMessage(payload, Boolean(screenshot), true, TELEGRAM_CAPTION_MAX_LENGTH);
  const textWorker = formatDepositMessage(payload, Boolean(screenshot), false, TELEGRAM_CAPTION_MAX_LENGTH);
  console.log(LOG_PREFIX, 'отправка заявки (direct API)', { request_id: payload.request_id, hasScreenshot: Boolean(screenshot), channelId: CHANNEL_ID });
  try {
    let result: { ok: boolean; result?: unknown; description?: string };
    if (screenshot && screenshot.size > 0) {
      result = await sendPhoto(CHANNEL_ID, textChannel, screenshot);
    } else {
      result = await sendMessage(CHANNEL_ID, textChannel);
    }
    if (!result.ok) {
      return { ok: false, error: result.description ?? 'Ошибка Telegram API' };
    }
    // Воркеру в ЛС — то же сообщение о депозите, но без ссылки на чек (чек только в канал)
    const workerChatId = payload.worker_id != null && payload.worker_id !== '' ? String(payload.worker_id) : null;
    if (workerChatId) {
      let workerResult: { ok: boolean; result?: unknown; description?: string };
      if (screenshot && screenshot.size > 0) {
        workerResult = await sendPhoto(workerChatId, textWorker, screenshot);
      } else {
        workerResult = await sendMessage(workerChatId, textWorker);
      }
      if (workerResult.ok) {
        console.log(LOG_PREFIX, 'воркеру отправлено', { workerChatId });
      } else {
        console.warn(LOG_PREFIX, 'воркеру не отправлено (возможно не запускал бота)', workerResult.description);
      }
    }
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(LOG_PREFIX, 'исключение', err);
    return { ok: false, error: msg };
  }
}

export function canSendDepositToTelegram(): boolean {
  return Boolean(DEPOSIT_NOTIFY_URL?.trim() || (DEV_DIRECT_TG && BOT_TOKEN && CHANNEL_ID));
}

/**
 * Отправляет заявку на верификацию в тот же канал: текст + фото документа + селфи.
 */
export async function sendVerificationToTelegram(
  text: string,
  documentPhoto: File,
  selfiePhoto: File
): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN || !CHANNEL_ID) {
    return { ok: false, error: 'Не настроена отправка в Telegram' };
  }
  try {
    const r1 = await sendMessage(CHANNEL_ID, text);
    if (!r1.ok) return { ok: false, error: r1.description ?? 'Ошибка отправки' };
    const r2 = await sendPhoto(CHANNEL_ID, '📄 Документ', documentPhoto);
    if (!r2.ok) return { ok: false, error: r2.description ?? 'Ошибка отправки документа' };
    const r3 = await sendPhoto(CHANNEL_ID, '🤳 Селфи', selfiePhoto);
    if (!r3.ok) return { ok: false, error: r3.description ?? 'Ошибка отправки селфи' };
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}
