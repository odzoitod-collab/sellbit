/**
 * Хранение и проверка PIN по user id (tgid или webUserId).
 * PIN хранится в виде хеша SHA-256(pin + userId), в localStorage.
 */

const KEY_PREFIX = 'pin_hash_';

async function hashPin(pin: string, userId: string): Promise<string> {
  const data = new TextEncoder().encode(pin + ':' + userId);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function getStorageKey(userId: string): string {
  return KEY_PREFIX + userId;
}

export function hasStoredPin(userId: string): boolean {
  if (!userId) return false;
  try {
    const key = getStorageKey(userId);
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}

export async function setPin(userId: string, pin: string): Promise<void> {
  const key = getStorageKey(userId);
  const hash = await hashPin(pin, userId);
  localStorage.setItem(key, hash);
}

export async function checkPin(userId: string, pin: string): Promise<boolean> {
  const key = getStorageKey(userId);
  const stored = localStorage.getItem(key);
  if (!stored) return false;
  const hash = await hashPin(pin, userId);
  return hash === stored;
}
