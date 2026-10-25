import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';
import SyncBadge from './SyncBadge.jsx';

const icons = {
  map: <><path d="M3 6.5 9 3l6 3.5L21 3v14.5L15 21l-6-3.5L3 21Z"/><path d="M9 3v14.5M15 6.5V21"/></>,
  analytics: <><path d="M4 19V9M10 19V5M16 19v-7M22 19H2"/></>,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5Z"/></>,
  alert: <><path d="M12 3 2.8 19h18.4Z"/><path d="M12 9v4M12 16.5v.1"/></>,
  add: <><path d="M12 3v18M3 12h18"/></>,
  settings: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/></>,
};

function Icon({ name }) {
  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>;
}

export default function Header() {
  const { t } = useLang();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [open]);

  const links = [
    { to: '/', label: t('nav.home'), icon: 'map' },
    { to: '/intelligence', label: t('nav.intelligence'), icon: 'analytics' },
    { to: '/dashboard', label: t('nav.dashboard'), icon: 'book' },
    { to: '/report-incident', label: t('nav.reportIncident'), icon: 'alert' },
    { to: '/add-plot', label: t('nav.addPlot'), icon: 'add' },
  ];

  const Brand = ({ desktop = false }) => (
    <Link
      className={`brand-lockup ${desktop ? 'desktop-brand' : ''}`}
      to="/"
      aria-label="BakauBase — Plant it. Track it. Prove it."
    >
      <img className="brand-logo" src="/bakaubase-logo.png" alt="" />
      <small className="brand-tagline">Plant it. Track it. Prove it.</small>
    </Link>
  );

  return (
    <>
      <div className="mobile-appbar">
        <Brand />
        <button className="menu-button" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={open ? 'M5 5l14 14M19 5 5 19' : 'M4 7h16M4 12h16M4 17h16'} /></svg>
        </button>
      </div>

      <aside className={`app-sidebar ${open ? 'is-open' : ''}`}>
        <Brand desktop />
        <div className="sidebar-label">{t('nav.workspace')}</div>
        <nav className="module-nav" aria-label={t('nav.primary')}>
          {links.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={(item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)) ? 'active' : ''}
              aria-current={(item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)) ? 'page' : undefined}
            >
              <Icon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="prototype-status"><span />{t('nav.demoMode')}</div>
        <Link className="sidebar-settings" to="/profile"><Icon name="settings" />{t('nav.profile')}</Link>
        <div className="sidebar-tools"><LanguageSwitch /><SyncBadge /></div>
      </aside>
      {open && <button type="button" className="sidebar-scrim" onClick={() => setOpen(false)} aria-label={t('nav.closeMenu')} />}
    </>
  );
}
