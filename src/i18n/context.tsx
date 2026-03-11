'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import en from './locales/en.json';
import zh from './locales/zh.json';

export type Locale = 'en' | 'zh';

const messages: Record<Locale, Record<string, unknown>> = { en, zh };

const STORAGE_KEY = 'clawsetup_locale';

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

function detectDefaultLocale(): Locale {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'en' || stored === 'zh') return stored;
    const browserLang = navigator.language;
    if (browserLang.startsWith('zh')) return 'zh';
  }
  return 'en';
}

type I18nContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLocaleState(detectDefaultLocale());
    setMounted(true);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
  }, []);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    let value = getNestedValue(messages[locale], key)
      ?? getNestedValue(messages.en, key)
      ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
      }
    }
    return value;
  }, [locale]);

  // Avoid hydration mismatch: render children after mount
  if (!mounted) {
    return (
      <I18nContext.Provider value={{ locale: 'en', setLocale, t: (key) => getNestedValue(messages.en, key) ?? key }}>
        {children}
      </I18nContext.Provider>
    );
  }

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}

export function useT() {
  return useI18n().t;
}
