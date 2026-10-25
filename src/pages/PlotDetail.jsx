/**
 * PlotDetail.jsx
 * --------------
 * Displays detailed information for a single mangrove plot.
 *
 * Sections:
 *   - Hero photo
 *   - Species name (local + scientific), planted date, seedling count
 *   - Coloured status badge
 *   - Survival rate progress bar
 *   - Estimated carbon range with disclaimer
 *   - "Add Survival Check" CTA
 *   - Observation timeline (date, counts, thumbnail, notes, verified badge)
 *   - Coordinator/admin "Verify" button on unverified observations
 */

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  doc,
  getDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  orderBy,
} from 'firebase/firestore';

import { db } from '../firebase.js';
import { STATUS_COLOURS, getStatus } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';

export default function PlotDetail() {
  const { plotId } = useParams();
  const { user, userProfile } = useAuth();
  const { t } = useLang();

  const [plot, setPlot] = useState(null);
  const [species, setSpecies] = useState(null);
  const [observations, setObservations] = useState([]);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch plot, species, observations ──
  useEffect(() => {
    async function load() {
      try {
        // Plot
        const plotSnap = await getDoc(doc(db, 'plots', plotId));
        if (!plotSnap.exists()) {
          setLoading(false);
          return;
        }
        const plotData = { id: plotSnap.id, ...plotSnap.data() };
        setPlot(plotData);

        if (plotData.siteId) {
          const siteSnap = await getDoc(doc(db, 'sites', plotData.siteId));
          if (siteSnap.exists()) setSite({ id: siteSnap.id, ...siteSnap.data() });
        }

        // Species
        if (plotData.species) {
          const specSnap = await getDoc(doc(db, 'species', plotData.species));
          if (specSnap.exists()) {
            setSpecies({ id: specSnap.id, ...specSnap.data() });
          }
        }

        // Observations
        const obsQuery = query(
          collection(db, 'plots', plotId, 'observations'),
          orderBy('date', 'desc'),
        );
        const obsSnap = await getDocs(obsQuery);
        setObservations(
          obsSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      } catch (err) {
        console.error('PlotDetail – load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [plotId]);

  // ── Verify handler (coordinator / admin) ──
  const handleVerify = async (obsId) => {
    try {
      await updateDoc(
        doc(db, 'plots', plotId, 'observations', obsId),
        {
          verified: true,
          verifiedBy: user.uid,
        },
      );
      setObservations((prev) =>
        prev.map((o) =>
          o.id === obsId ? { ...o, verified: true } : o,
        ),
      );
    } catch (err) {
      console.error('Verify error:', err);
    }
  };

  // ── Loading / not found ──
  if (loading) {
    return (
      <div className="plot-detail-page">
        <div className="page-state" aria-live="polite">{t('loading') || 'Loading…'}</div>
      </div>
    );
  }
  if (!plot) {
    return (
      <div className="plot-detail-page">
        <div className="page-state page-state-error" role="alert">{t('plotNotFound') || 'Plot not found.'}</div>
      </div>
    );
  }

  const status = getStatus(plot.survivalRate);
  const statusColour = STATUS_COLOURS[status] || STATUS_COLOURS.no_check;
  const plantedDate = plot.plantedAt?.toDate
    ? plot.plantedAt.toDate().toLocaleDateString()
    : '';

  // Determine if user is coordinator or admin (stored on their profile)
  const userRole = userProfile?.role;
  const canVerify = userRole === 'admin' || (userRole === 'coordinator' && site?.coordinatorUid === user?.uid);

  return (
    <article className="plot-detail-page">
      {/* ── Hero photo ── */}
      {plot.photoUrl && (
        <img src={plot.photoUrl} alt={species?.localName || t('plotDetail.title')} className="plot-detail-hero" />
      )}

      {/* ── Species + basic info ── */}
      <header className="plot-detail-header">
        <p className="section-kicker">{site?.name || t('plotDetail.title')}</p>
        <h1>
          {species?.localName || species?.scientificName || t('unknownSpecies') || 'Unknown species'}
        </h1>
        {species?.scientificName && (
          <p className="plot-scientific-name">{species.scientificName}</p>
        )}
        <p className="plot-detail-meta">
          {t('planted') || 'Planted'}: {plantedDate} &nbsp;·&nbsp;{' '}
          {plot.seedlingsPlanted} {t('seedlings') || 'seedlings'}
        </p>
      </header>

      {/* ── Status badge ── */}
      <section className="plot-detail-section plot-status-row" aria-label={t('plotDetail.status')}>
        <span
          className={`status-label status-${status}`}
        >
          {t(`status.${status === 'at_risk' ? 'atRisk' : status === 'no_check' ? 'noCheck' : status}`)}
        </span>
      </section>

      {/* ── Survival bar ── */}
      <section className="plot-detail-section plot-metric-section">
        <div className="plot-metric-heading"><h2>{t('survivalRate') || 'Survival Rate'}</h2><strong>{plot.survivalRate != null ? `${Math.round(plot.survivalRate)}%` : '—'}</strong></div>
        <div className="survival-track" role="img" aria-label={`${t('survivalRate')}: ${plot.survivalRate != null ? `${Math.round(plot.survivalRate)}%` : t('noData')}`}>
          <div
            className="survival-fill"
            style={{ width: `${plot.survivalRate ?? 0}%`, backgroundColor: statusColour }}
          />
        </div>
      </section>

      {/* ── Carbon estimate ── */}
      <section className="plot-detail-section carbon-summary">
        <h2>{t('estimatedCarbon') || 'Estimated Carbon Sequestration'}</h2>
        <p className="carbon-range tabular-nums">
          {plot.estimatedCarbonLow != null
            ? `${Number(plot.estimatedCarbonLow).toFixed(3)} – ${Number(plot.estimatedCarbonHigh).toFixed(3)} tCO₂e`
            : t('noData') || 'No data'}
        </p>
        <p className="carbon-disclaimer">
          {t('carbon.note')}
        </p>
      </section>

      {/* ── Add Survival Check CTA ── */}
      {user && userProfile?.role !== 'partner' && (
        <Link to={`/plot/${plotId}/check`} className="button button-primary plot-check-cta">
          {t('addSurvivalCheck') || 'Add Survival Check'}
        </Link>
      )}

      {/* ── Observation timeline ── */}
      <section className="plot-detail-section observation-section">
        <h2>{t('observations') || 'Observations'}</h2>

        {observations.length === 0 && (
          <div className="page-state page-state-compact"><p>{t('noObservations') || 'No observations yet.'}</p></div>
        )}

        {observations.map((obs) => {
          const obsDate = obs.date?.toDate
            ? obs.date.toDate().toLocaleDateString()
            : '';
          return (
            <article key={obs.id} className="observation-card">
              <div className="observation-header">
                <time>{obsDate}</time>
                {obs.verified ? (
                  <span className="verification-label is-verified">{t('verified') || 'Verified'}</span>
                ) : (
                  <span className="verification-label">
                    {t('notVerified') || 'Not verified'}
                  </span>
                )}
              </div>

              <div className="observation-counts tabular-nums">
                <span className="count-alive">
                  {t('alive') || 'Alive'}: {obs.aliveCount}
                </span>
                <span className="count-dead">
                  {t('dead') || 'Dead'}: {obs.deadCount}
                </span>
              </div>

              {obs.photoUrl && (
                <img src={obs.photoUrl} alt={`${t('observations')} — ${obsDate}`} className="observation-photo" />
              )}

              {obs.notes && <p className="observation-notes">{obs.notes}</p>}

              <dl className="audit-line">
                <div><dt>{t('audit.submittedBy')}</dt><dd>{obs.submittedBy || t('audit.unknown')}</dd></div>
                {obs.checkIn && (
                  <div>
                    <dt>{t('audit.checkIn')}</dt>
                    <dd>{obs.checkIn.simulated ? t('audit.demoCheckIn') : `${obs.checkIn.distanceMetres} m`}</dd>
                  </div>
                )}
                {obs.verified && obs.verifiedBy && <div><dt>{t('audit.verifiedBy')}</dt><dd>{obs.verifiedBy}</dd></div>}
              </dl>

              {/* Verify button for coordinator/admin */}
              {canVerify && !obs.verified && (
                <button
                  onClick={() => handleVerify(obs.id)}
                  className="btn-secondary verify-button"
                >
                  {t('verify') || 'Verify'}
                </button>
              )}
            </article>
          );
        })}
      </section>
    </article>
  );
}

// ─────────────────────────── styles ───────────────────────────
const styles = {
  page: {
    width: 'min(760px, calc(100% - 24px))',
    margin: '24px auto 48px',
    padding: 0,
    backgroundColor: '#fff',
    border: '1px solid #d7ddd8',
    borderRadius: 8,
    overflow: 'hidden',
  },
  loadingText: {
    textAlign: 'center',
    padding: 40,
    color: '#173f32',
  },

  /* Hero */
  hero: {
    width: '100%',
    maxHeight: 260,
    objectFit: 'cover',
  },

  /* Sections */
  section: {
    padding: '12px 16px',
  },
  speciesName: {
    color: '#173f32',
    margin: 0,
    fontSize: 20,
  },
  sciName: {
    fontStyle: 'italic',
    color: '#666',
    margin: '2px 0 0',
    fontSize: 14,
  },
  meta: {
    color: '#555',
    fontSize: 13,
    marginTop: 6,
  },

  /* Badge */
  badge: {
    display: 'inline-block',
    padding: '5px 16px',
    borderRadius: 20,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  /* Survival bar */
  label: {
    fontWeight: 600,
    color: '#173f32',
    fontSize: 14,
    display: 'block',
    marginBottom: 4,
  },
  barBg: {
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ddd',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 7,
    transition: 'width 0.4s ease',
  },
  barLabel: {
    fontSize: 13,
    color: '#555',
    marginTop: 2,
    display: 'inline-block',
  },

  /* Carbon */
  carbonRange: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1B5E20',
    margin: '4px 0',
  },
  disclaimer: {
    fontSize: 11,
    color: '#888',
    fontStyle: 'italic',
    margin: 0,
  },

  /* CTA */
  ctaBtn: {
    display: 'block',
    textAlign: 'center',
    margin: '8px 16px',
    padding: '14px 0',
    borderRadius: 10,
    backgroundColor: '#173f32',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    textDecoration: 'none',
    letterSpacing: 0.5,
  },

  /* Timeline */
  timelineTitle: {
    color: '#173f32',
    borderBottom: '2px solid #E8F5E9',
    paddingBottom: 6,
    marginBottom: 12,
    fontSize: 17,
  },
  emptyText: {
    color: '#888',
    fontSize: 14,
  },
  obsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    border: '1px solid #E8F5E9',
    boxShadow: 'none',
  },
  obsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  obsDate: {
    fontSize: 13,
    color: '#555',
    fontWeight: 600,
  },
  verifiedBadge: {
    fontSize: 12,
    color: '#2f684a',
    fontWeight: 700,
  },
  unverifiedLabel: {
    fontSize: 12,
    color: '#999',
  },
  obsCounts: {
    fontSize: 14,
    marginBottom: 6,
  },
  obsThumb: {
    width: '100%',
    maxHeight: 140,
    objectFit: 'cover',
    borderRadius: 6,
    marginBottom: 6,
  },
  obsNotes: {
    fontSize: 13,
    color: '#444',
    margin: '4px 0 0',
  },
  verifyBtn: {
    marginTop: 6,
    padding: '6px 18px',
    border: '1px solid #4CAF50',
    borderRadius: 6,
    backgroundColor: '#e4ece6',
    color: '#173f32',
    fontWeight: 600,
    fontSize: 13,
    cursor: 'pointer',
  },
};
