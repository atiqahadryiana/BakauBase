/**
 * Dashboard.jsx – Public dashboard for BakauBase.
 *
 * Viewable WITHOUT sign-in. Reads aggregated stats from
 * Firestore document  stats/summary  and renders:
 *  - Summary cards (total plots, seedlings, survival rate, CO2e range)
 *  - Bar chart: survival rate by site
 *  - Line chart: cumulative seedlings planted over time
 *  - Breakdown table by site
 *  - "No data" message when the document is empty
 *
 * All UI strings through t() for i18n.
 */

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { resetPrototypeData } from '../demo/firestore.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import { STATUS_THRESHOLDS } from '../config.js';
import { MALAYSIA_MANGROVE_SITES, TOURISM_MALAYSIA_MANGROVE_GUIDE } from '../data/malaysiaMangroveSites.js';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend as ChartLegend,
  Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  ChartLegend,
  Filler,
);

/* ───────── colour tokens ───────── */
const DEEP_GREEN  = '#173f32';
const LEAF_GREEN  = '#3f7557';
const LIGHT_GREEN = '#e4ece6';

/* ───────── inline styles ───────── */
const styles = {
  page: {
    width: 'min(1280px, 100%)',
    margin: '0 auto',
    padding: 'clamp(1rem, 3vw, 2rem)',
  },
  heading: {
    fontSize: 'clamp(2.35rem, 5vw, 4rem)',
    fontWeight: 600,
    lineHeight: 0.98,
    color: DEEP_GREEN,
    marginBottom: '0.25rem',
  },
  subheading: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '1.5rem',
  },
  note: {
    fontSize: '0.8rem',
    color: '#38463f',
    marginBottom: '1.5rem',
    padding: '0.75rem 0.9rem',
    background: LIGHT_GREEN,
    borderRadius: '8px',
    border: '1px solid #a8b89a',
  },
  chartBox: {
    background: '#fff',
    borderRadius: '10px',
    padding: '1.25rem',
    border: '1px solid #d7ddd8',
    marginBottom: '1.5rem',
  },
  chartTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    color: DEEP_GREEN,
    marginBottom: '0.75rem',
  },
  headingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '1rem',
    marginBottom: '1.5rem',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.9rem',
  },
  th: {
    textAlign: 'left',
    padding: '0.6rem 0.75rem',
    background: '#f1f4ef',
    color: DEEP_GREEN,
    fontWeight: 600,
  },
  td: {
    padding: '0.6rem 0.75rem',
    borderBottom: '1px solid #e0e0e0',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
    gap: '1.5rem',
    marginBottom: '1.5rem',
  },
};

export default function Dashboard() {
  const { t } = useLang();

  const [stats, setStats]     = useState(null);
  const [plots, setPlots]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* ── Fetch stats/summary from Firestore ── */
  useEffect(() => {
    (async () => {
      try {
        const [snap, plotSnap] = await Promise.all([
          getDoc(doc(db, 'stats', 'summary')),
          getDocs(collection(db, 'plots')),
        ]);
        if (snap.exists()) {
          setStats(snap.data());
        }
        setPlots(plotSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
      } catch (err) {
        console.error('Dashboard: failed to load stats', err);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ── Loading state ── */
  if (loading) {
    return (
      <div style={styles.page} className="dashboard-page dashboard-state" aria-busy="true" aria-live="polite">
        <span className="sr-only">{t('loading')}</span>
        <div className="dashboard-skeleton dashboard-skeleton-heading" />
        <div className="dashboard-skeleton-grid">
          <div className="dashboard-skeleton dashboard-skeleton-hero" />
          <div className="dashboard-skeleton dashboard-skeleton-support" />
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={styles.page} className="dashboard-page dashboard-state">
        <div className="dashboard-empty-state" role="alert">
          <span className="dashboard-empty-mark" aria-hidden="true">!</span>
          <h1>{t('dashboard')}</h1>
          <p>{t('noDataYet')}</p>
          <button type="button" className="btn-primary" onClick={() => window.location.reload()}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  /* ── No data state ── */
  const isEmpty =
    !stats ||
    (!stats.totalPlots && !stats.totalSeedlings && !stats.sites?.length);

  if (isEmpty) {
    return (
      <div style={styles.page} className="dashboard-page dashboard-state">
        <div className="dashboard-empty-state">
          <svg viewBox="0 0 96 96" aria-hidden="true"><path d="M48 81V38M48 49c-15-1-24-8-27-21 15-1 24 6 27 21ZM48 61c15-1 24-8 27-21-15-1-24 6-27 21Z"/><path d="M28 82h40"/></svg>
          <h1>{t('dashboard')}</h1>
          <p>{t('noDataYet')}</p>
          <button type="button" className="btn-primary" onClick={() => { resetPrototypeData(); window.location.reload(); }}>{t('resetDemo')}</button>
        </div>
      </div>
    );
  }

  /* ── Derived values ── */
  const sites           = stats.sites || [];
  const totalPlots      = stats.totalPlots ?? 0;
  const totalSeedlings  = stats.totalSeedlings ?? 0;
  const survivalRate    = stats.overallSurvivalRate ?? 0;
  const co2eMin         = stats.totalCO2eLow ?? stats.totalCO2eMin ?? 0;
  const co2eMax         = stats.totalCO2eHigh ?? stats.totalCO2eMax ?? 0;
  const incidentCount   = stats.incidentCount ?? 0;
  const recentIncidents = stats.recentIncidents || [];
  const timeline        = stats.timeline || []; // [{ date, cumulative }]
  const totalAlive      = stats.totalAlive ?? 0;
  const monitoredPlots  = plots.filter((plot) => plot.survivalRate !== null && plot.survivalRate !== undefined).length;
  const plantedSpecies  = new Set(plots.map((plot) => plot.species).filter(Boolean)).size;
  const monitoringCoverage = totalPlots ? Math.round((monitoredPlots / totalPlots) * 100) : 0;
  const statusOrder = ['healthy', 'at_risk', 'failing', 'no_check'];
  const statusCounts = statusOrder.reduce((counts, status) => ({
    ...counts,
    [status]: plots.filter((plot) => (plot.status || 'no_check') === status).length,
  }), {});
  const priorityPlots = statusCounts.at_risk + statusCounts.failing;
  const recentUnresolved = recentIncidents.filter((incident) => incident.status !== 'resolved').length;

  /* ── Bar chart: survival by site ── */
  const chartSites = [...sites].sort((a, b) => (b.survivalRate ?? 0) - (a.survivalRate ?? 0));
  const barData = {
    labels: chartSites.map((s) => s.name),
    datasets: [
      {
        label: t('survivalRate'),
        data: chartSites.map((s) => s.survivalRate ?? 0),
        backgroundColor: LEAF_GREEN,
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  };
  const barOpts = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        ticks: { callback: (v) => `${v}%` },
        grid: { color: '#edf0ec' },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  /* ── Line chart: cumulative seedlings ── */
  const lineData = {
    labels: timeline.map((pt) => pt.date),
    datasets: [
      {
        label: t('cumulativeSeedlings'),
        data: timeline.map((pt) => pt.cumulative),
        borderColor: DEEP_GREEN,
        backgroundColor: `${LIGHT_GREEN}80`,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointBackgroundColor: DEEP_GREEN,
      },
    ],
  };
  const lineOpts = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f0f0f0' },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const download = (name, type, content) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    const rows = [['plot_id','site_id','species_id','seedlings','survival_rate','status','latitude','longitude']];
    plots.forEach((plot) => rows.push([plot.id, plot.siteId || '', plot.species || '', plot.seedlingsPlanted || 0, plot.survivalRate ?? '', plot.status || '', plot.location?.lat ?? '', plot.location?.lng ?? '']));
    download('bakaubase-plots.csv', 'text/csv;charset=utf-8', rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"','""')}"`).join(',')).join('\n'));
  };

  const exportGeoJson = () => download('bakaubase-plots.geojson', 'application/geo+json', JSON.stringify({
    type: 'FeatureCollection',
    features: plots.filter((plot) => plot.location).map((plot) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [plot.location.lng, plot.location.lat] }, properties: { id: plot.id, siteId: plot.siteId, species: plot.species, seedlingsPlanted: plot.seedlingsPlanted, survivalRate: plot.survivalRate, status: plot.status } })),
  }, null, 2));

  return (
    <div style={styles.page} className="dashboard-page">
      <div style={styles.headingRow} className="report-heading dashboard-header">
        <div>
          <p className="report-eyebrow">{t('report.publicImpact')}</p>
          <h1 style={styles.heading}>{t('dashboard')}</h1>
          <p style={styles.subheading}>{t('dashboardSubtitle')}</p>
        </div>
        <div className="export-actions">
          <button type="button" className="btn-secondary" onClick={exportCsv}>{t('report.downloadCsv')}</button>
          <button type="button" className="btn-secondary" onClick={exportGeoJson}>{t('report.downloadGeoJson')}</button>
          <button type="button" className="btn-primary print-button" onClick={() => window.print()}>{t('report.downloadPdf')}</button>
        </div>
      </div>

      <section className="dashboard-kpis" aria-label={t('dashboardInsights.scopeTitle')}>
        <article className="dashboard-hero-metric">
          <span>{t('overallSurvival')}</span>
          <strong>{survivalRate.toFixed(1)}%</strong>
          <div className="dashboard-hero-track" aria-hidden="true"><span style={{ width: `${Math.min(100, survivalRate)}%` }} /></div>
          <small>{monitoredPlots}/{totalPlots} {t('dashboardInsights.plotsChecked')} · {monitoringCoverage}% {t('dashboardInsights.coverage')}</small>
        </article>
        <div className="dashboard-support-metrics">
          <SummaryCard label={t('totalSeedlings')} value={totalSeedlings.toLocaleString()} />
          <SummaryCard label={t('totalPlots')} value={totalPlots.toLocaleString()} />
          <SummaryCard label={t('totalCO2e')} value={`${co2eMin.toFixed(3)}–${co2eMax.toFixed(3)}`} unit="tCO₂e" />
          <SummaryCard label={t('incident.openReports')} value={incidentCount.toLocaleString()} alert={incidentCount > 0} />
        </div>
      </section>

      <section className="dashboard-context" aria-labelledby="dashboard-context-title">
        <div className="dashboard-context-heading">
          <div>
            <p className="section-kicker">{t('dashboardInsights.scopeKicker')}</p>
            <h2 id="dashboard-context-title">{t('dashboardInsights.scopeTitle')}</h2>
          </div>
          <span className="prototype-data-label">{t('dashboardInsights.prototypeData')}</span>
        </div>
        <div className="dashboard-scope-grid">
          <article><strong>{sites.length}</strong><span>{t('dashboardInsights.sitesRepresented')}</span><small>{t('dashboardInsights.sitesNote')}</small></article>
          <article><strong>{plantedSpecies}</strong><span>{t('dashboardInsights.speciesPlanted')}</span><small>{t('dashboardInsights.speciesNote')}</small></article>
          <article><strong>{monitoredPlots}/{totalPlots}</strong><span>{t('dashboardInsights.plotsChecked')}</span><small>{monitoringCoverage}% {t('dashboardInsights.coverage')}</small></article>
          <article><strong>{totalAlive.toLocaleString()}</strong><span>{t('dashboardInsights.survivingSeedlings')}</span><small>{t('dashboardInsights.latestCounts')}</small></article>
        </div>
      </section>

      <section className="real-sites-panel" aria-labelledby="real-sites-title">
        <div className="real-sites-heading">
          <div><p className="section-kicker">{t('realSites.kicker')}</p><h2 id="real-sites-title">{t('realSites.title')}</h2><p>{t('realSites.intro')}</p></div>
          <a href={TOURISM_MALAYSIA_MANGROVE_GUIDE} target="_blank" rel="noreferrer">{t('realSites.tourismGuide')} ↗</a>
        </div>
        <div className="real-sites-grid">
          {MALAYSIA_MANGROVE_SITES.map((site) => (
            <article key={site.id}>
              <span>{site.state}</span>
              <h3>{site.name}</h3>
              <p>{t(site.descriptionKey)}</p>
              <code>{site.location.lat.toFixed(4)}, {site.location.lng.toFixed(4)}</code>
              <div><a href={`https://www.openstreetmap.org/?mlat=${site.location.lat}&mlon=${site.location.lng}#map=14/${site.location.lat}/${site.location.lng}`} target="_blank" rel="noreferrer">{t('realSites.viewMap')}</a><a href={site.sourceUrl} target="_blank" rel="noreferrer">{t('realSites.siteSource')}</a></div>
            </article>
          ))}
        </div>
        <p className="real-sites-note">{t('realSites.dataNote')}</p>
      </section>

      <section className="dashboard-action-grid" aria-label={t('dashboardInsights.actionOverview')}>
        <div className="plot-health-panel">
          <div className="dashboard-panel-heading">
            <div><p className="section-kicker">{t('dashboardInsights.healthKicker')}</p><h2>{t('dashboardInsights.healthTitle')}</h2></div>
            <span>{totalPlots} {t('plots')}</span>
          </div>
          <div className="plot-health-list">
            {statusOrder.map((status) => {
              const count = statusCounts[status];
              const percentage = totalPlots ? (count / totalPlots) * 100 : 0;
              const threshold = status === 'healthy'
                ? `≥ ${STATUS_THRESHOLDS.HEALTHY_MIN}%`
                : status === 'at_risk'
                  ? `${STATUS_THRESHOLDS.AT_RISK_MIN}–${STATUS_THRESHOLDS.HEALTHY_MIN - 1}%`
                  : status === 'failing'
                    ? `< ${STATUS_THRESHOLDS.AT_RISK_MIN}%`
                    : t('dashboardInsights.noCheckThreshold');
              return <div className={`plot-health-row status-${status}`} key={status}>
                <div><span>{t(`dashboardInsights.status.${status}`)}</span><small>{threshold}</small><strong>{count}</strong></div>
                <div className="plot-health-track" aria-label={`${t(`dashboardInsights.status.${status}`)}: ${count}`}><span style={{ width: `${percentage}%` }} /></div>
              </div>;
            })}
          </div>
        </div>

        <div className="attention-panel">
          <div className="dashboard-panel-heading"><div><p className="section-kicker">{t('dashboardInsights.attentionKicker')}</p><h2>{t('dashboardInsights.attentionTitle')}</h2></div></div>
          <div className="attention-list">
            <article><strong>{priorityPlots}</strong><div><h3>{t('dashboardInsights.priorityPlots')}</h3><p>{t('dashboardInsights.priorityPlotsNote')}</p></div></article>
            <article><strong>{statusCounts.no_check}</strong><div><h3>{t('dashboardInsights.checksDue')}</h3><p>{t('dashboardInsights.checksDueNote')}</p></div></article>
            <article><strong>{recentUnresolved}</strong><div><h3>{t('dashboardInsights.unresolvedReports')}</h3><p>{t('dashboardInsights.unresolvedReportsNote')}</p></div></article>
          </div>
          <Link className="dashboard-map-link" to="/">{t('dashboardInsights.openMap')} →</Link>
        </div>
      </section>

      <details className="dashboard-methodology">
        <summary><span>{t('dashboardInsights.methodTitle')}</span><small>{t('dashboardInsights.methodSummary')}</small></summary>
        <div className="method-grid">
          <article><h3>{t('dashboardInsights.plantingTotals')}</h3><p>{t('dashboardInsights.plantingTotalsBody')}</p></article>
          <article><h3>{t('dashboardInsights.survivalMethod')}</h3><p>{t('dashboardInsights.survivalMethodBody')}</p></article>
          <article><h3>{t('dashboardInsights.carbonMethod')}</h3><p>{t('dashboardInsights.carbonMethodBody')}</p></article>
          <article><h3>{t('dashboardInsights.evidenceMethod')}</h3><p>{t('dashboardInsights.evidenceMethodBody')}</p></article>
          <article><h3>{t('dashboardInsights.satelliteMethod')}</h3><p>{t('dashboardInsights.satelliteMethodBody')}</p></article>
        </div>
      </details>

      <section className="policy-panel" aria-labelledby="policy-title">
        <div className="policy-intro">
          <p className="section-kicker">{t('policy.kicker')}</p>
          <h2 id="policy-title">{t('policy.title')}</h2>
          <p>{t('policy.intro')}</p>
        </div>
        <div className="policy-grid">
          <article><span>SDG 13</span><h3>{t('policy.sdg13Title')}</h3><p>{t('policy.sdg13Body')}</p></article>
          <article><span>SDG 14</span><h3>{t('policy.sdg14Title')}</h3><p>{t('policy.sdg14Body')}</p></article>
          <article><span>SDG 15</span><h3>{t('policy.sdg15Title')}</h3><p>{t('policy.sdg15Body')}</p></article>
          <article><span>NPBD 2022–2030</span><h3>{t('policy.npbdTitle')}</h3><p>{t('policy.npbdBody')}</p></article>
        </div>
        <p className="policy-note">{t('policy.note')}</p>
      </section>

      {/* ── CO₂ note ── */}
      <div style={styles.note}>
        {t('co2Note')}
      </div>

      {recentIncidents.length > 0 && (
        <section className="incident-summary" aria-labelledby="incident-summary-title">
          <div className="incident-summary-heading">
            <div>
              <p className="section-kicker">{t('incident.kicker')}</p>
              <h2 id="incident-summary-title">{t('incident.recent')}</h2>
            </div>
            <Link className="btn btn-secondary" to="/report-incident">{t('nav.reportIncident')}</Link>
          </div>
          <div className="incident-list">
            {recentIncidents.map((incident) => {
              const date = incident.createdAt?.toDate ? incident.createdAt.toDate() : new Date(incident.createdAt);
              return (
                <article key={incident.id}>
                  <div><strong>{t(`incident.types.${incident.type}`)}</strong><span>{date.toLocaleDateString()}</span></div>
                  <p>{t(`incident.severities.${incident.severity}`)} · {t(`incident.statuses.${incident.status}`)}</p>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Charts ── */}
      <div style={styles.chartsGrid} className="dashboard-charts">
        {sites.length > 0 && (
          <section style={styles.chartBox} className="dashboard-chart-panel" aria-labelledby="survival-chart-title">
            <div style={styles.chartTitle} id="survival-chart-title">{t('survivalBySite')}</div>
            <div style={{ height: '280px' }} role="img" aria-label={t('survivalBySite')}>
              <Bar data={barData} options={barOpts} />
            </div>
          </section>
        )}

        {timeline.length > 0 && (
          <section style={styles.chartBox} className="dashboard-chart-panel" aria-labelledby="seedlings-chart-title">
            <div style={styles.chartTitle} id="seedlings-chart-title">{t('cumulativeSeedlings')}</div>
            <div style={{ height: '280px' }} role="img" aria-label={t('cumulativeSeedlings')}>
              <Line data={lineData} options={lineOpts} />
            </div>
          </section>
        )}
      </div>

      {/* ── Site breakdown table ── */}
      {sites.length > 0 && (
        <div style={styles.chartBox}>
          <div style={styles.chartTitle}>{t('siteBreakdown')}</div>
          <div className="dashboard-table-wrap" tabIndex="0">
            <table style={styles.table} className="dashboard-table">
              <thead>
                <tr>
                  <th style={styles.th}>{t('siteName')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>{t('plots')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>{t('seedlings')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>{t('alive')}</th>
                  <th style={{ ...styles.th, textAlign: 'right' }}>{t('survivalRate')}</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((s) => (
                  <tr key={s.name}>
                    <td style={styles.td}>{s.name}</td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {(s.plots ?? 0).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {(s.seedlings ?? 0).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {(s.alive ?? 0).toLocaleString()}
                    </td>
                    <td style={{ ...styles.td, textAlign: 'right' }}>
                      {(s.survivalRate ?? 0).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <footer className="report-footer">
        {t('report.generatedBy')} · {new Intl.DateTimeFormat(undefined, { dateStyle: 'long' }).format(new Date())}
      </footer>
    </div>
  );
}

/* ── Small summary card component ── */
function SummaryCard({ label, value, unit, alert = false }) {
  return (
    <article className={`dashboard-support-metric${alert ? ' is-alert' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {unit && <small>{unit}</small>}
    </article>
  );
}
