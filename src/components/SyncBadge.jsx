/**
 * SyncBadge.jsx
 * ─────────────
 * Displays a small badge indicating the number of offline items
 * waiting to be synced. Polls every 5 seconds and hides when
 * the queue is empty.
 */

import React, { useState, useEffect } from 'react';
import { getPendingCount } from '../utils/offlineQueue.js';
import { useLang } from '../contexts/LanguageContext.jsx';

/* ── styles ──────────────────────────────────────────────────────── */
const styles = {
  wrapper: {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44,
    cursor: 'default',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    borderRadius: 12,
    background: '#FFF8E1',
    color: '#1B5E20',
    fontSize: '0.78rem',
    fontWeight: 700,
    lineHeight: 1,
    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
  },
  icon: {
    fontSize: '1rem',
  },
};

const POLL_INTERVAL = 5000; // ms

export default function SyncBadge() {
  const { t } = useLang();
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Initial fetch
    let active = true;

    const fetchCount = async () => {
      try {
        const n = await getPendingCount();
        if (active) setCount(n);
      } catch {
        /* silently ignore – offline queue may be unavailable */
      }
    };

    fetchCount();
    window.addEventListener('bakaubase-queue-changed', fetchCount);

    const interval = setInterval(fetchCount, POLL_INTERVAL);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener('bakaubase-queue-changed', fetchCount);
    };
  }, []);

  if (count === 0) return null;

  return (
    <span
      style={styles.wrapper}
      title={t('pending_sync') || `${count} item(s) pending sync`}
      aria-label={`${count} items pending sync`}
    >
      <span style={styles.badge}>
        {/* Cloud-upload icon (SVG for crispness) */}
        <svg
          style={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 16V8" />
          <path d="M9 11l3-3 3 3" />
          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25" />
        </svg>
        {count}
      </span>
    </span>
  );
}
