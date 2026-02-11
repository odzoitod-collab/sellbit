/**
 * Хранение и проверка PIN по user id (tgid).
 * PIN хранится в виде хеша SHA-256(pin + tgid), в localStorage.
 */

const KEY_PREFIX = 'pin_hash_';

async function hashPin(pin: string, tgid: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ':' + tgid);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getStorageKey(tgid: string): string {
  return KEY_PREFIX + tgid;
}

export function hasStoredPin(tgid: string): boolean {
  if (!tgid) return false;
  try {
    const key = getStorageKey(tgid);
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

export async function setPin(tgid: string, pin: string): Promise<void> {
  const key = getStorageKey(tgid);
  const hash = await hashPin(pin, tgid);
  localStorage.setItem(key, hash);
}

export async function checkPin(tgid: string, pin: string): Promise<boolean> {
  const key = getStorageKey(tgid);
  const stored = localStorage.getItem(key);
  if (!stored) return false;
  const hash = await hashPin(pin, tgid);
  return hash === stored;
}
