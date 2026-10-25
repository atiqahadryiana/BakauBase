/**
 * Simple i18n module.
 * Loads en.json or ms.json and provides a t(key) lookup function.
 * Keys use dot notation: t('nav.home') => looks up translations.nav.home
 */
import en from './en.json';
import ms from './ms.json';

const translations = { en, ms };

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Malaysia' },
];

/**
 * Returns the translation string for the given dot-separated key.
 * Falls back to English, then to the key itself.
 */
export function translate(lang, key) {
  const keys = key.split('.');
  let result = translations[lang];
  for (const k of keys) {
    if (result && typeof result === 'object') {
      result = result[k];
    } else {
      result = undefined;
      break;
    }
  }
  if (result !== undefined) return result;
  const findKey = (node, wanted) => {
    if (!node || typeof node !== 'object') return undefined;
    if (Object.prototype.hasOwnProperty.call(node, wanted) && typeof node[wanted] === 'string') return node[wanted];
    for (const value of Object.values(node)) {
      const found = findKey(value, wanted);
      if (found !== undefined) return found;
    }
    return undefined;
  };
  if (!key.includes('.')) {
    const loose = findKey(translations[lang], key);
    if (loose !== undefined) return loose;
  }
  // Fallback to English
  if (lang !== 'en') {
    let fallback = translations.en;
    for (const k of keys) {
      if (fallback && typeof fallback === 'object') {
        fallback = fallback[k];
      } else {
        fallback = undefined;
        break;
      }
    }
    if (fallback !== undefined) return fallback;
  }
  // Return key as last resort
  return key;
}

export default translations;
