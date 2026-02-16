import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'sellbit_web_user_id';

interface WebAuthContextValue {
  webUserId: number | null;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, fullName: string, referrerId: number) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const WebAuthContext = createContext<WebAuthContextValue | null>(null);

export function WebAuthProvider({ children }: { children: React.ReactNode }) {
  const [webUserId, setWebUserId] = useState<number | null>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) return parseInt(s, 10);
    } catch {}
    return null;
  });

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.rpc('login_web_user', { p_email: email, p_password: password });
    if (error || !data) return { ok: false, error: 'Неверный email или пароль' };
    const u = data as { user_id?: number };
    if (u?.user_id) {
      setWebUserId(u.user_id);
      localStorage.setItem(STORAGE_KEY, String(u.user_id));
      return { ok: true };
    }
    return { ok: false, error: 'Неверный email или пароль' };
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, referrerId: number) => {
    const { data, error } = await supabase.rpc('register_web_user', {
      p_email: email,
      p_password: password,
      p_full_name: fullName,
      p_referrer_id: referrerId,
    });
    if (error) return { ok: false, error: error.message || 'Ошибка регистрации' };
    const d = data as { error?: string; user_id?: number };
    if (d?.error === 'EMAIL_EXISTS') return { ok: false, error: 'Этот email уже зарегистрирован' };
    if (d?.user_id) {
      setWebUserId(d.user_id);
      localStorage.setItem(STORAGE_KEY, String(d.user_id));
      return { ok: true };
    }
    return { ok: false, error: 'Ошибка регистрации' };
  }, []);

  const logout = useCallback(() => {
    setWebUserId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: WebAuthContextValue = { webUserId, login, register, logout };
  return <WebAuthContext.Provider value={value}>{children}</WebAuthContext.Provider>;
}

export function useWebAuth() {
  const ctx = useContext(WebAuthContext);
  if (!ctx) throw new Error('useWebAuth must be used within WebAuthProvider');
  return ctx;
}
