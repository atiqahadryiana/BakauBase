import React from 'react';
import { Link } from 'react-router-dom';
import { STATUS_COLOURS, getStatus } from '../config.js';
import { useLang } from '../contexts/LanguageContext.jsx';

function formatDate(value) {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
}

function statusKey(status) {
  return status === 'at_risk' ? 'atRisk' : status === 'no_check' ? 'noCheck' : status;
}

export default function PlotCard({ plot, speciesMap = {}, site }) {
  const { t } = useLang();
  const species = speciesMap[plot.species];
  const status = getStatus(plot.survivalRate);
  const rate = plot.survivalRate == null ? '—' : `${Math.round(plot.survivalRate)}%`;
  const carbon = plot.estimatedCarbonLow == null
    ? '—'
    : `${Number(plot.estimatedCarbonLow).toFixed(3)}–${Number(plot.estimatedCarbonHigh).toFixed(3)} tCO₂e`;

  return (
    <article className="plot-popup" style={{ '--status-colour': STATUS_COLOURS[status] }}>
      <div className="plot-popup-accent" />
      <div className="plot-popup-body">
        <h3>{species?.localName || species?.scientificName || t('plotDetail.unknownSpecies')}</h3>
        {site && <p className="plot-popup-location"><strong>{site.name}</strong><span>{site.state}</span></p>}
        <p className="muted">{t('plotDetail.planted')}: {formatDate(plot.plantedAt)}</p>
        <dl className="compact-list">
          <div><dt>{t('plotDetail.seedlings')}</dt><dd>{plot.seedlingsPlanted}</dd></div>
          <div><dt>{t('plotDetail.survival')}</dt><dd>{rate}</dd></div>
          <div><dt>{t('plotDetail.estimatedCarbon')}</dt><dd>{carbon}</dd></div>
          <div><dt>{t('plotDetail.status')}</dt><dd><span className={`badge badge-${status.replace('_', '-')}`}>{t(`status.${statusKey(status)}`)}</span></dd></div>
        </dl>
        <p className="microcopy">{t('carbon.note')}</p>
        {site?.sourceUrl && <a className="plot-place-source" href={site.sourceUrl} target="_blank" rel="noreferrer">{t('realSites.verifiedPlace')} ↗</a>}
      </div>
      <div className="plot-popup-actions">
        <Link className="btn btn-primary" to={`/plot/${plot.id}`}>{t('common.viewDetails')}</Link>
        <Link className="btn btn-secondary" to={`/plot/${plot.id}/check`}>{t('plotDetail.addCheck')}</Link>
      </div>
    </article>
  );
}
