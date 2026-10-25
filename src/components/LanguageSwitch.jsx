/**
 * LanguageSwitch.jsx
 * ──────────────────
 * An explicit segmented control for English and Bahasa Malaysia.
 */

import React from 'react';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function LanguageSwitch() {
  const { lang, setLang, t } = useLang();
  const options = [
    { code: 'en', short: 'EN', label: t('languageSwitcher.english') },
    { code: 'ms', short: 'BM', label: t('languageSwitcher.malay') },
  ];

  return (
    <div className="language-switch" role="group" aria-label={t('languageSwitcher.label')}>
      {options.map((option) => (
        <button
          key={option.code}
          type="button"
          className={lang === option.code ? 'active' : ''}
          aria-pressed={lang === option.code}
          aria-label={option.label}
          title={option.label}
          onClick={() => setLang(option.code)}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}
