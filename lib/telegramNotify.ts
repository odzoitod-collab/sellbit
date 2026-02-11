/**
 * Отправка заявки на пополнение в Telegram (канал и/или воркер) напрямую через Bot API.
 * Внимание: токен бота будет виден в клиентском коде (VITE_TELEGRAM_BOT_TOKEN).
 * Для продакшена предпочтительно использовать серверный прокси (VITE_DEPOSIT_NOTIFY_URL).
 */

const env = (import.meta as any).env ?? {};
const BOT_TOKEN = env.VITE_TELEGRAM_BOT_TOKEN as string | undefined;
const CHANNEL_ID = env.VITE_DEPOSIT_CHANNEL_ID as string | undefined;

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
  request_id: string | number;
  country?: string;
  created_at?: string;
}

function formatDepositMessage(data: DepositNotifyPayload, hasScreenshot: boolean): string {
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
  return (
    '🔔 НОВАЯ ЗАЯВКА НА ПОПОЛНЕНИЕ\n\n' +
    `👤 Пользователь: ${user_name} (${user_link}) ID: ${data.user_id}\n` +
    `👨‍💼 Воркер: ${worker_label}\n` +
    `💰 Сумма: ${amount_local.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ${data.currency}\n` +
    `💵 В USDT: ≈ $${amount_usd.toFixed(2)}\n` +
    `🌍 Страна: ${country}\n` +
    `🏦 Валюта: ${data.currency}\n` +
    `📅 Дата: ${date_str}\n` +
    `🆔 ID заявки: ${isGuest ? 'Гость' : data.request_id}\n\n` +
    screenshotLine +
    '#пополнение #россия #rub'
  );
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

async function sendPhoto(chatId: string, caption: string, file: File): Promise<{ ok: boolean; result?: unknown; description?: string }> {
  if (!BOT_TOKEN) return { ok: false, description: 'BOT_TOKEN не задан' };
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`;
  console.log(LOG_PREFIX, 'sendPhoto: запрос', { chatId, fileName: file.name, size: file.size, captionLength: caption.length });
  try {
    const form = new FormData();
    form.append('chat_id', chatId);
    form.append('caption', caption);
    form.append('photo', file, file.name || 'check.jpg');
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
 * Возвращает { ok, error } для отображения пользователю при ошибке.
 */
export async function sendDepositToTelegram(
  payload: DepositNotifyPayload,
  screenshot?: File | null
): Promise<{ ok: boolean; error?: string }> {
  if (!BOT_TOKEN) {
    console.warn(LOG_PREFIX, 'пропуск: не задан VITE_TELEGRAM_BOT_TOKEN');
    return { ok: false, error: 'Не настроена отправка в Telegram (нет токена)' };
  }
  if (!CHANNEL_ID) {
    console.warn(LOG_PREFIX, 'пропуск: не задан VITE_DEPOSIT_CHANNEL_ID');
    return { ok: false, error: 'Не настроена отправка в Telegram (нет ID канала)' };
  }
  const text = formatDepositMessage(payload, Boolean(screenshot));
  console.log(LOG_PREFIX, 'отправка заявки', { request_id: payload.request_id, hasScreenshot: Boolean(screenshot), channelId: CHANNEL_ID });
  try {
    const result = screenshot
      ? await sendPhoto(CHANNEL_ID, text, screenshot)
      : await sendMessage(CHANNEL_ID, text);
    if (!result.ok) {
      return { ok: false, error: result.description ?? 'Ошибка Telegram API' };
    }
    // Отправка воркеру в личку (тому, кто привёл реферала)
    const workerChatId = payload.worker_id != null && payload.worker_id !== '' ? String(payload.worker_id) : null;
    if (workerChatId) {
      const workerResult = screenshot
        ? await sendPhoto(workerChatId, text, screenshot)
        : await sendMessage(workerChatId, text);
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
  return Boolean(BOT_TOKEN && CHANNEL_ID);
}
