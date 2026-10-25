import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import MapView from '../components/MapView.jsx';

const FILTERS = ['all', 'healthy', 'at_risk', 'failing', 'no_check'];
const LAYERS = ['ndvi', 'ndwi', 'topography', 'tidal'];
const filterKey = (value) => ({ all: 'filterAll', healthy: 'filterHealthy', at_risk: 'filterAtRisk', failing: 'filterFailing', no_check: 'filterNoCheck' }[value]);

function Metric({ label, value, note, tone = '' }) {
  return <article className={`ops-metric ${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export default function Home() {
  const { lang, t } = useLang();
  const [plots, setPlots] = useState([]);
  const [speciesMap, setSpeciesMap] = useState({});
  const [siteMap, setSiteMap] = useState({});
  const [stats, setStats] = useState({});
  const [filter, setFilter] = useState('all');
  const [layers, setLayers] = useState({ ndvi: true, ndwi: false, topography: false, tidal: false });
  const [layerOpacity, setLayerOpacity] = useState(55);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const [plotSnap, speciesSnap, siteSnap, statsSnap] = await Promise.all([
          getDocs(collection(db, 'plots')),
          getDocs(collection(db, 'species')),
          getDocs(collection(db, 'sites')),
          getDoc(doc(db, 'stats', 'summary')),
        ]);
        setPlots(plotSnap.docs.map((item) => ({ id: item.id, ...item.data() })));
        setSpeciesMap(Object.fromEntries(speciesSnap.docs.map((item) => [item.id, { id: item.id, ...item.data() }])));
        setSiteMap(Object.fromEntries(siteSnap.docs.map((item) => [item.id, { id: item.id, ...item.data() }])));
        if (statsSnap.exists()) setStats(statsSnap.data());
      } catch (error) {
        console.error(error);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [reloadKey]);

  const atRisk = useMemo(() => plots.filter((plot) => ['at_risk', 'failing'].includes(plot.status)).length, [plots]);
  const lastUpdate = new Intl.DateTimeFormat(lang === 'ms' ? 'ms-MY' : 'en-MY', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date());

  return (
    <div className="operations-page">
      <header className="operations-hero">
        <div>
          <p className="eyebrow">{t('operations.eyebrow')}</p>
          <h1>{t('operations.title')}</h1>
          <p>{t('operations.subtitle')}</p>
        </div>
        <div className="hero-actions">
          <Link className="button button-secondary" to="/report-incident">{t('nav.reportIncident')}</Link>
          <Link className="button button-primary" to="/add-plot">{t('operations.logPlanting')}</Link>
        </div>
      </header>

      <section className="ops-metrics" aria-label={t('operations.projectHealth')}>
        <Metric label={t('home.totalSeedlings')} value={(stats.totalSeedlings ?? 0).toLocaleString()} note={`${stats.totalPlots ?? 0} ${t('operations.activePlots')}`} />
        <Metric label={t('home.survivalRate')} value={`${Math.round(stats.overallSurvivalRate ?? 0)}%`} note={t('operations.latestChecks')} />
        <Metric label={t('operations.hectares')} value="8.4 ha" note={t('operations.demoEstimate')} />
        <Metric label={t('operations.ndviFlags')} value={atRisk} note={t('operations.needsReview')} tone={atRisk ? 'metric-alert' : ''} />
        <Metric label={t('home.estimatedCO2')} value={`${Number(stats.totalCO2eLow ?? 0).toFixed(1)}–${Number(stats.totalCO2eHigh ?? 0).toFixed(1)} t`} note={t('operations.estimatedRange')} />
      </section>

      <section className="map-workspace">
        <div className="map-heading">
          <div><p className="eyebrow">{t('operations.webgis')}</p><h2>{t('operations.sharedMap')}</h2></div>
          <div className="map-freshness"><span />{t('operations.updated')} {lastUpdate}</div>
        </div>
        <div className="map-layout">
          <aside className="layer-panel">
            <div className="panel-heading"><h3>{t('operations.layers')}</h3><span>{t('operations.demoData')}</span></div>
            {LAYERS.map((layer) => (
              <label className="layer-toggle" key={layer}>
                <input type="checkbox" checked={layers[layer]} onChange={() => setLayers((current) => ({ ...current, [layer]: !current[layer] }))} />
                <span className={`layer-swatch ${layer}`} />
                <span><strong>{t(`operations.layer.${layer}`)}</strong><small>{t(`operations.layer.${layer}Note`)}</small></span>
              </label>
            ))}
            <label className="opacity-slider" htmlFor="layer-opacity">
              <span>{t('operations.opacity')} <strong>{layerOpacity}%</strong></span>
              <input id="layer-opacity" type="range" min="15" max="85" value={layerOpacity} onChange={(event) => setLayerOpacity(Number(event.target.value))} />
            </label>
            <div className="map-legend-scale"><span>{t('operations.stressed')}</span><div /><span>{t('operations.healthy')}</span></div>
            <p className="data-caveat">{t('operations.remoteCaveat')}</p>
          </aside>

          <div className="map-stage">
            <div className="filter-pills" role="group" aria-label={t('home.filterLabel')}>
              {FILTERS.map((value) => <button type="button" key={value} aria-pressed={filter === value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{t(`home.${filterKey(value)}`)}</button>)}
            </div>
            <div className="map-canvas" aria-label={t('home.mapLabel')}>
              {loading && <div className="map-state" aria-live="polite"><span className="spinner" />{t('common.loading')}</div>}
              {!loading && loadError && <div className="map-state map-state-error" role="alert"><p>{t('common.error')}</p><button type="button" className="btn-secondary" onClick={() => setReloadKey((value) => value + 1)}>{t('common.retry')}</button></div>}
              {!loading && !loadError && <MapView plots={plots} speciesMap={speciesMap} siteMap={siteMap} filter={filter} layers={layers} layerOpacity={layerOpacity / 100} />}
            </div>
          </div>

          <aside className="priority-panel">
            <div className="panel-heading"><h3>{t('operations.fieldPriority')}</h3><span>{atRisk} {t('operations.flags')}</span></div>
            {plots.filter((plot) => ['failing', 'at_risk'].includes(plot.status)).slice(0, 3).map((plot, index) => (
              <Link to={`/plot/${plot.id}`} className="priority-item" key={plot.id}>
                <span className={`risk-dot ${plot.status}`} />
                <span><strong>{t('operations.plot')} {plot.id.replace('plot-', '')}</strong><small>{plot.status === 'failing' ? t('operations.rapidDecline') : t('operations.monitor')}</small></span>
                <b>{Math.round(plot.survivalRate)}%</b>
              </Link>
            ))}
            {!loading && atRisk === 0 && <p className="priority-empty">{t('common.noResults')}</p>}
            <Link to="/intelligence" className="panel-link">{t('operations.openAnalytics')} <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </section>

      <section className="journey-section" aria-labelledby="journey-title">
        <div className="journey-intro"><p className="eyebrow">{t('operations.workflow')}</p><h2 id="journey-title">{t('operations.taglinePlant')}<br/><em>{t('operations.taglineTrack')}</em><br/>{t('operations.taglineProve')}</h2></div>
        <ol className="journey-grid">
          {[1,2,3,4].map((step) => <li key={step}><span>0{step}</span><h3>{t(`howItWorks.step${step}.title`)}</h3><p>{t(`howItWorks.step${step}.body`)}</p></li>)}
        </ol>
      </section>
    </div>
  );
}
