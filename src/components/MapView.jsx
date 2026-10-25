/**
 * MapView.jsx
 * -----------
 * Leaflet map component for BakauBase.
 *
 * Props:
 *   plots        – array of plot documents (each must include id, location, survivalRate)
 *   speciesMap   – { speciesId: speciesDoc } lookup
 *   onMapClick   – optional callback({lat, lng}) used by AddPlot page
 *   filter       – optional status string to filter visible plots
 *
 * Displays OpenStreetMap tiles centred on Malaysia with CircleMarkers
 * coloured by survival status and a Legend overlay.
 */

import React, { useEffect, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Polygon,
  Popup,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix missing default marker icons in bundled builds ──
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

import { STATUS_COLOURS, getStatus } from '../config.js';
import Legend from '../components/Legend.jsx';
import PlotCard from '../components/PlotCard.jsx';

// ── Default centre: Malaysia ──
const DEFAULT_CENTER = [4.2, 108.5];
const DEFAULT_ZOOM = 6;

/**
 * Inner component that hooks into Leaflet map events so the parent can
 * receive click coordinates (used on the AddPlot page).
 */
function ClickHandler({ onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick({ lat: e.latlng.lat, lng: e.latlng.lng });
      }
    },
  });
  return null;
}

function FitVisiblePlots({ plots }) {
  const map = useMap();
  useEffect(() => {
    const points = plots
      .filter((plot) => Number.isFinite(plot.location?.lat) && Number.isFinite(plot.location?.lng))
      .map((plot) => [plot.location.lat, plot.location.lng]);
    if (points.length === 1) map.setView(points[0], 11);
    if (points.length > 1) map.fitBounds(points, { padding: [32, 32], maxZoom: 10 });
  }, [map, plots]);
  return null;
}

export default function MapView({
  plots = [],
  speciesMap = {},
  siteMap = {},
  onMapClick,
  filter,
  style,
  selectedLocation,
  layers = {},
  layerOpacity = 0.55,
}) {
  // ── Filter plots by status when a filter is active ──
  const visiblePlots = useMemo(() => {
    if (!filter || filter === 'all') return plots;
    return plots.filter((p) => getStatus(p.survivalRate) === filter);
  }, [plots, filter]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        ...style,
      }}
    >
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
        aria-label="Mangrove planting plots map"
      >
        {/* OpenStreetMap tile layer */}
        {layers.topography ? (
          <TileLayer attribution='Map data &copy; OpenStreetMap, SRTM | Map style &copy; OpenTopoMap' url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png" />
        ) : (
          <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        )}

        {layers.ndvi && visiblePlots.map((plot, index) => {
          const lat = plot.location.lat;
          const lng = plot.location.lng;
          const delta = .018;
          const stressed = getStatus(plot.survivalRate) === 'failing' || getStatus(plot.survivalRate) === 'at_risk';
          return <Polygon key={`ndvi-${plot.id}`} positions={[[lat-delta,lng-delta],[lat+delta,lng-delta],[lat+delta,lng+delta],[lat-delta,lng+delta]]} pathOptions={{ color: stressed ? '#9B5B45' : '#5B7B4A', fillColor: stressed ? '#B76E52' : '#78A15E', fillOpacity: layerOpacity, weight: 0 }} />;
        })}

        {layers.ndwi && visiblePlots.slice(0, 6).map((plot) => {
          const lat = plot.location.lat - .025;
          const lng = plot.location.lng + .018;
          return <Polygon key={`ndwi-${plot.id}`} positions={[[lat-.012,lng-.025],[lat+.01,lng-.018],[lat+.015,lng+.025],[lat-.01,lng+.02]]} pathOptions={{ color: '#5D8290', fillColor: '#7FA08A', fillOpacity: layerOpacity * .8, weight: 1 }} />;
        })}

        {layers.tidal && visiblePlots.slice(0, 4).map((plot) => {
          const lat = plot.location.lat + .035;
          const lng = plot.location.lng - .02;
          return <Polygon key={`tide-${plot.id}`} positions={[[lat-.01,lng-.03],[lat+.01,lng-.02],[lat+.008,lng+.035],[lat-.015,lng+.025]]} pathOptions={{ color: '#53788A', dashArray: '6 6', fillOpacity: 0, weight: 2 }} />;
        })}

        {/* Forward map clicks to parent when handler is provided */}
        {onMapClick && <ClickHandler onClick={onMapClick} />}
        {!onMapClick && <FitVisiblePlots plots={visiblePlots} />}

        {selectedLocation && (
          <CircleMarker
            center={[selectedLocation.lat, selectedLocation.lng]}
            radius={11}
            pathOptions={{ fillColor: '#800000', color: '#fff', weight: 3, fillOpacity: 0.9 }}
          />
        )}

        {/* Plot markers */}
        {visiblePlots.map((plot) => {
          const status = getStatus(plot.survivalRate);
          const colour = STATUS_COLOURS[status] || STATUS_COLOURS.no_check;

          return (
            <CircleMarker
              key={plot.id}
              center={[plot.location.lat, plot.location.lng]}
              radius={10}
              pathOptions={{
                fillColor: colour,
                color: '#1B5E20',
                weight: 1.5,
                fillOpacity: 0.85,
              }}
            >
              <Popup maxWidth={300} minWidth={220}>
                <PlotCard plot={plot} speciesMap={speciesMap} site={siteMap[plot.siteId]} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* Legend overlay – positioned in the bottom-left corner */}
      <div
        style={{
          position: 'absolute',
          bottom: 24,
          left: 12,
          zIndex: 1000,
        }}
      >
          {!onMapClick && <Legend />}
      </div>
    </div>
  );
}
