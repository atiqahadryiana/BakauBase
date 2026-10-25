/**
 * Legend.jsx
 * ─────────
 * A compact map legend displaying each plot status colour and its label.
 * Designed to float over the bottom-right corner of the Leaflet map.
 *
 * Uses STATUS_COLOURS from config and t() from LanguageContext.
 */

import React from 'react';
import { STATUS, STATUS_COLOURS } from '../config.js';
import { useLang } from '../contexts/LanguageContext.jsx';

/* ── styles ──────────────────────────────────────────────────────── */
const sx = {
  card: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    zIndex: 800,
    background: '#fff',
    borderRadius: 6,
    border: '1px solid #cbd3cd',
    padding: '10px 14px',
    boxShadow: '0 1px 2px rgba(23,63,50,0.12)',
    minWidth: 140,
    pointerEvents: 'auto',
    fontFamily: "'Segoe UI', Roboto, sans-serif",
  },
  title: {
    margin: 0,
    marginBottom: 6,
    fontSize: '0.78rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#1B5E20',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '3px 0',
  },
  swatch: {
    width: 14,
    height: 14,
    borderRadius: 4,
    flexShrink: 0,
    border: '1px solid rgba(0,0,0,0.1)',
  },
  label: {
    fontSize: '0.82rem',
    color: '#333',
    lineHeight: 1.3,
  },
};

/* ── component ───────────────────────────────────────────────────── */
export default function Legend() {
  const { t } = useLang();

  // Build legend entries from the STATUS enum
  const entries = Object.values(STATUS).map((statusKey) => ({
    colour: STATUS_COLOURS[statusKey] || '#999',
    label: t(`status.${statusKey === 'at_risk' ? 'atRisk' : statusKey === 'no_check' ? 'noCheck' : statusKey}`),
  }));

  return (
    <div style={sx.card} aria-label={t('legend')}>
      <h4 style={sx.title}>{t('legend')}</h4>
      {entries.map((entry) => (
        <div key={entry.label} style={sx.row}>
          <span
            style={{ ...sx.swatch, background: entry.colour }}
            aria-hidden="true"
          />
          <span style={sx.label}>{entry.label}</span>
        </div>
      ))}
    </div>
  );
}
