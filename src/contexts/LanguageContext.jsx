/**
 * LanguageContext.jsx
 * ───────────────────
 * Provides internationalisation state and a t() translation helper.
 *
 * Exposed via useLang():
 *   lang          – current language code ('en' | 'ms')
 *   setLang(code) – switch language and persist to localStorage
 *   t(key)        – shortcut for translate(lang, key)
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { translate, LANGUAGES } from '../i18n/i18n.js';

const STORAGE_KEY = 'bakaubase-lang';
const DEFAULT_LANG = 'en';
const isSupportedLanguage = (code) => LANGUAGES.some((language) => language.code === code);

/* ── context ─────────────────────────────────────────────────────── */
const LanguageContext = createContext(null);

/**
 * Hook for consuming language state anywhere in the component tree.
 */
export function useLang() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within a LanguageProvider');
  return ctx;
}

/* ── provider ────────────────────────────────────────────────────── */
export function LanguageProvider({ children }) {
  // Initialise from localStorage or fall back to 'en'
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isSupportedLanguage(stored)) return stored;
    } catch {
      /* localStorage may be unavailable (e.g. private browsing) */
    }
    return DEFAULT_LANG;
  });

  /**
   * Change language, persisting to localStorage.
   */
  const setLang = useCallback((code) => {
    const normalised = isSupportedLanguage(code) ? code : DEFAULT_LANG;
    setLangState(normalised);
    try {
      localStorage.setItem(STORAGE_KEY, normalised);
    } catch {
      /* swallow storage errors silently */
    }
  }, []);

  // Keep the document language accurate for screen readers and browser tools.
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  /**
   * Translation shortcut: t('someKey') → translate(lang, 'someKey')
   */
  const t = useCallback((key) => translate(lang, key), [lang]);

  /* ── render ───────────────────────────────────────────────────── */
  const value = { lang, setLang, t };

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export default LanguageContext;
