import React, { useMemo, useState } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from 'chart.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import { MALAYSIA_MANGROVES } from '../data/malaysiaMangroves.js';
import speciesImages from '../data/speciesImages.json';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

const alerts = [
  { plot: 'Plot 005', kind: 'NDVI', severity: 'high', change: '−18%', date: '08 Oct 2026' },
  { plot: 'Plot 008', kind: 'Coastline', severity: 'medium', change: '−2.4 m', date: '06 Oct 2026' },
  { plot: 'Plot 002', kind: 'NDWI', severity: 'medium', change: '+11%', date: '02 Oct 2026' },
];

export default function Intelligence() {
  const { t } = useLang();
  const [salinity, setSalinity] = useState(18);
  const [swipe, setSwipe] = useState(52);
  const [speciesSearch, setSpeciesSearch] = useState('');
  const [speciesGroup, setSpeciesGroup] = useState('all');
  const [showAllSpecies, setShowAllSpecies] = useState(false);
  const recommendation = salinity >= 25 ? 'Avicennia marina' : salinity >= 15 ? 'Rhizophora apiculata' : 'Sonneratia alba';
  const trendData = useMemo(() => ({
    labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      { label: 'NDVI', data: [.68,.71,.69,.64,.58,.55], borderColor: '#5B7B4A', backgroundColor: '#5B7B4A', tension: .35 },
      { label: 'Rainfall (scaled)', data: [.42,.5,.75,.82,.61,.47], borderColor: '#7FA08A', backgroundColor: '#7FA08A', borderDash: [5,5], tension: .35 },
    ],
  }), []);
  const filteredSpecies = useMemo(() => {
    const query = speciesSearch.trim().toLowerCase();
    return MALAYSIA_MANGROVES.filter((item) => {
      const matchesGroup = speciesGroup === 'all' || item.group === speciesGroup;
      const matchesSearch = !query || [item.scientificName, item.commonName, item.localName, item.family]
        .some((value) => value.toLowerCase().includes(query));
      return matchesGroup && matchesSearch;
    });
  }, [speciesGroup, speciesSearch]);
  const visibleSpecies = showAllSpecies || speciesSearch || speciesGroup !== 'all'
    ? filteredSpecies
    : filteredSpecies.slice(0, 12);

  return (
    <div className="intelligence-page">
      <header className="module-heading"><div><p className="eyebrow">{t('intelligence.eyebrow')}</p><h1>{t('intelligence.title')}</h1><p>{t('intelligence.subtitle')}</p></div><span className="data-source-badge">Sentinel-2 · Landsat 8 · CHIRPS</span></header>

      <div className="intel-grid">
        <section className="intel-card trend-card">
          <div className="card-heading"><div><span className="card-kicker">{t('intelligence.plotHealth')}</span><h2>Plot 005 · Matang, Perak</h2></div><span className="severity high">{t('intelligence.highRisk')}</span></div>
          <div className="chart-frame" role="img" aria-label={`${t('intelligence.plotHealth')}: NDVI 0.68 to 0.55 from May to October`}><Line data={trendData} options={{ responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:8}}}, scales:{y:{min:0,max:1,grid:{color:'#E4E8E0'}},x:{grid:{display:false}}} }} /></div>
          <p className="chart-note">{t('intelligence.chartNote')}</p>
        </section>

        <section className="intel-card alerts-card">
          <div className="card-heading"><div><span className="card-kicker">{t('intelligence.earlyWarning')}</span><h2>{t('intelligence.activeAlerts')}</h2></div><b>{alerts.length}</b></div>
          <div className="alert-list">{alerts.map((alert) => <article key={`${alert.plot}-${alert.kind}`}><span className={`severity-mark ${alert.severity}`} /><div><strong>{alert.plot}</strong><small>{alert.kind} · {alert.date}</small></div><b>{alert.change}</b></article>)}</div>
          <p className="chart-note">{t('intelligence.chartNote')}</p>
        </section>

        <section className="intel-card comparison-card">
          <div className="card-heading"><div><span className="card-kicker">{t('intelligence.changeDetection')}</span><h2>{t('intelligence.swipeTitle')}</h2></div><span className="demo-chip">{t('operations.demoData')}</span></div>
          <div className="satellite-comparison" style={{ '--swipe': `${swipe}%` }}>
            <div className="satellite-before"><span>2019 · Landsat 8</span></div>
            <div className="satellite-after"><span>2026 · Sentinel-2</span></div>
            <div className="swipe-line" />
          </div>
          <label className="comparison-control" htmlFor="comparison-swipe"><span>{t('intelligence.dragCompare')}</span><input id="comparison-swipe" type="range" min="8" max="92" value={swipe} onChange={(e) => setSwipe(e.target.value)} /></label>
        </section>

        <section className="intel-card salinity-card">
          <div className="card-heading"><div><span className="card-kicker">{t('intelligence.fieldTool')}</span><h2>{t('intelligence.salinityTitle')}</h2></div></div>
          <label htmlFor="salinity">{t('intelligence.salinity')} <strong>{salinity} ppt</strong></label>
          <input id="salinity" type="range" min="0" max="40" value={salinity} onChange={(e) => setSalinity(Number(e.target.value))} />
          <div className="recommendation"><span>{t('intelligence.recommended')}</span><strong><i>{recommendation}</i></strong><p>{t('intelligence.recommendationReason')}</p></div>
          <p className="data-caveat">{t('intelligence.salinityCaveat')}</p>
        </section>
      </div>

      <section className="species-directory">
        <div className="species-hero">
          <div className="section-heading"><div><p className="eyebrow">{t('intelligence.fieldGuide')}</p><h2>{t('intelligence.speciesTitle')}</h2><p className="directory-summary">{t('intelligence.speciesSummary')}</p></div><div className="directory-count"><strong>{filteredSpecies.length}</strong><span>{t('intelligence.records')}</span></div></div>
        </div>
        <div className="species-controls">
          <label className="search-field"><span className="sr-only">{t('intelligence.searchSpecies')}</span><input type="search" value={speciesSearch} onChange={(event) => setSpeciesSearch(event.target.value)} placeholder={t('intelligence.searchSpecies')} /></label>
          <div className="species-filter" role="group" aria-label={t('intelligence.filterSpecies')}>{['all','true','associate'].map((group) => <button type="button" key={group} className={speciesGroup === group ? 'active' : ''} aria-pressed={speciesGroup === group} onClick={() => setSpeciesGroup(group)}>{t(`intelligence.groups.${group}`)}</button>)}</div>
        </div>
        <div className="species-grid">{visibleSpecies.map((item) => {
          const photo = speciesImages[item.id];
          return <article key={item.id}>
          <figure className="species-card-photo">
            {photo
              ? <a href={photo.sourceUrl} target="_blank" rel="noreferrer" title={`${photo.attribution} · ${photo.licence}`}>
                  <img src={photo.src} width="640" height="420" loading="lazy" decoding="async" alt={`${item.localName} (${item.scientificName})`} />
                </a>
              : <div className="species-photo-missing"><span>{t('intelligence.photoUnavailable')}</span></div>}
            {photo && <figcaption><a href={photo.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${t('intelligence.photoSource')}: ${photo.attribution}, ${photo.licence}`} title={`${photo.attribution} · ${photo.licence}`}>{photo.attribution} · {photo.licence}</a></figcaption>}
          </figure>
          <div><span className="species-type">{t(`intelligence.groups.${item.group}`)}</span><h3>{item.localName}</h3><p><i>{item.scientificName}</i></p><dl><div><dt>{t('intelligence.commonName')}</dt><dd>{item.commonName}</dd></div><div><dt>{t('intelligence.family')}</dt><dd>{item.family}</dd></div></dl></div>
        </article>})}</div>
        {filteredSpecies.length === 0 && <p className="species-empty">{t('intelligence.noSpecies')}</p>}
        {!showAllSpecies && !speciesSearch && speciesGroup === 'all' && <button className="show-all-species" type="button" onClick={() => setShowAllSpecies(true)}>{t('intelligence.showAll')} ({MALAYSIA_MANGROVES.length})</button>}
        <p className="species-source">{t('intelligence.speciesSource')} <a href="https://www.mybis.gov.my/pb/3015" target="_blank" rel="noreferrer">MyBIS, 2018</a>. {t('intelligence.taxonomyNote')} {t('intelligence.speciesPhotoNote')}</p>
      </section>
    </div>
  );
}
