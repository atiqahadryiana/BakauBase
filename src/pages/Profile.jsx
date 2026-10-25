import React, { useEffect, useState } from 'react';
import { useLang } from '../contexts/LanguageContext.jsx';
import { LANGUAGES } from '../i18n/i18n.js';
import { getPendingCount } from '../utils/offlineQueue.js';
import { resetPrototypeData } from '../demo/firestore.js';

export default function Profile() {
  const { lang, setLang, t } = useLang();
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    const refreshConnection = () => setOnline(navigator.onLine);
    const refreshQueue = () => getPendingCount().then(setPending).catch(() => {});
    refreshQueue();
    window.addEventListener('online', refreshConnection);
    window.addEventListener('offline', refreshConnection);
    window.addEventListener('bakaubase-queue-changed', refreshQueue);
    const timer = setInterval(refreshQueue, 5000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', refreshConnection);
      window.removeEventListener('offline', refreshConnection);
      window.removeEventListener('bakaubase-queue-changed', refreshQueue);
    };
  }, []);

  return (
    <div className="settings-page">
      <header className="field-page-heading">
        <p className="section-kicker">BakauBase</p>
        <h1>{t('profile.settings')}</h1>
        <p>{t('prototypeMode')}</p>
      </header>
      <section className="settings-section" aria-labelledby="language-heading">
        <h2 id="language-heading">{t('profile.language')}</h2>
        <div className="settings-actions">
          {LANGUAGES.map(({ code, label }) => (
            <button key={code} type="button" className={lang === code ? 'btn-primary' : 'btn-secondary'} aria-pressed={lang === code} onClick={() => setLang(code)}>{label}</button>
          ))}
        </div>
      </section>
      <section className="settings-section" aria-labelledby="sync-heading">
        <h2 id="sync-heading">{t('profile.syncStatus')}</h2>
        <dl className="settings-list">
          <div><dt>{t('connection')}</dt><dd><span className={`connection-dot ${online ? 'is-online' : ''}`} aria-hidden="true" />{online ? t('common.online') : t('common.offline')}</dd></div>
          <div><dt>{t('pendingSync')}</dt><dd className="tabular-nums">{pending}</dd></div>
        </dl>
        <button type="button" className="btn-danger" onClick={() => {
          if (window.confirm(t('resetConfirm'))) {
            resetPrototypeData();
            window.location.assign('/');
          }
        }}>{t('resetDemo')}</button>
      </section>
    </div>
  );
}
