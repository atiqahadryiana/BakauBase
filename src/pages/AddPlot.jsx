/**
 * AddPlot.jsx
 * -----------
 * Form to register a new mangrove planting plot.
 *
 * Features:
 *   - Inline MapView (250 px) for click-to-set location.
 *   - "Use GPS" geolocation button.
 *   - Camera / gallery photo input with client-side compression.
 *   - Species & site dropdowns fetched from Firestore.
 *   - Online → upload photo to Storage, write document, update stats.
 *   - Offline → enqueue for later sync.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import { db, storage } from '../firebase.js';
import { PHOTO_MAX_WIDTH, PHOTO_QUALITY } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { compressImage } from '../utils/imageCompressor.js';
import { enqueue, notifyQueueChanged } from '../utils/offlineQueue.js';
import { updateStats } from '../utils/statsUpdater.js';
import MapView from '../components/MapView.jsx';

export default function AddPlot() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLang();

  // ── Form state ──
  const [location, setLocation] = useState(null); // {lat, lng}
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [speciesList, setSpeciesList] = useState([]);
  const [sitesList, setSitesList] = useState([]);
  const [speciesId, setSpeciesId] = useState('');
  const [siteId, setSiteId] = useState('');
  const [seedlings, setSeedlings] = useState(1);
  const [plantedDate, setPlantedDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Fetch species & sites on mount ──
  useEffect(() => {
    async function load() {
      try {
        const specSnap = await getDocs(collection(db, 'species'));
        setSpeciesList(
          specSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );

        const siteSnap = await getDocs(collection(db, 'sites'));
        setSitesList(
          siteSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        );
      } catch (err) {
        console.error('AddPlot – load error:', err);
      }
    }
    load();
  }, []);

  // ── Map click handler ──
  const handleMapClick = ({ lat, lng }) => {
    setLocation({ lat, lng });
  };

  // ── GPS button ──
  const handleGPS = () => {
    if (!navigator.geolocation) {
      setError(t('gpsUnsupported') || 'Geolocation not supported');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.error('GPS error:', err);
        setError(t('gpsError') || 'Could not get GPS position');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  // ── Photo selection + compression ──
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, PHOTO_MAX_WIDTH, PHOTO_QUALITY);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('Photo compression error:', err);
      // Fall back to original file
      setPhotoBlob(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!location) {
      setError(t('errLocation') || 'Please set a location on the map or use GPS.');
      return;
    }
    if (!photoBlob) {
      setError(t('errPhoto') || 'Please take or select a photo.');
      return;
    }
    if (!speciesId) {
      setError(t('errSpecies') || 'Please select a species.');
      return;
    }
    if (seedlings < 1) {
      setError(t('errSeedlings') || 'At least 1 seedling is required.');
      return;
    }

    setSubmitting(true);

    const clientId = uuidv4();
    const basePlotData = {
      siteId: siteId || null,
      location: { lat: location.lat, lng: location.lng },
      species: speciesId,
      seedlingsPlanted: Number(seedlings),
      plantedAt: plantedDate,
      createdBy: currentUser.uid,
      status: 'no_check',
      survivalRate: null,
      estimatedCarbonLow: 0,
      estimatedCarbonHigh: 0,
      photoUrl: '',
    };

    // Browser-local prototype storage works with or without a connection.
    const isOnline = true;

    try {
      if (isOnline) {
        // Upload photo
        const storageRef = ref(storage, `plots/${clientId}/photo.jpg`);
        await uploadBytes(storageRef, photoBlob, {
          contentType: 'image/jpeg',
        });
        const photoUrl = await getDownloadURL(storageRef);
        // Write plot document
        await setDoc(doc(db, 'plots', clientId), {
          ...basePlotData,
          plantedAt: Timestamp.fromDate(new Date(`${plantedDate}T12:00:00`)),
          createdAt: Timestamp.now(),
          photoUrl,
        });

        // Refresh global stats
        await updateStats();
      } else {
        // Offline – enqueue for later sync
        await enqueue('plot', clientId, basePlotData, photoBlob);
        notifyQueueChanged();
        alert(t('savedOffline') || 'Saved offline – will sync when online.');
      }

      navigate('/');
    } catch (err) {
      console.error('AddPlot submit error:', err);
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="field-page field-page-narrow">
      <header className="field-page-heading">
        <p className="section-kicker">{t('operations.logPlanting')}</p>
        <h1>{t('addPlotTitle') || 'Add New Plot'}</h1>
      </header>

      <form onSubmit={handleSubmit} className="field-form">
        {/* ── Map picker ── */}
        <fieldset className="location-fieldset">
        <legend>{t('selectLocation') || 'Select Location'}</legend>
        <p className="field-help">{t('incident.locationHelp')}</p>
        <div className="field-map">
          <MapView
            plots={[]}
            onMapClick={handleMapClick}
            selectedLocation={location}
            style={{ height: 250 }}
          />
          {/* Show selected marker via overlay info */}
        </div>
        <div className="location-actions">
        <button type="button" onClick={handleGPS} className="btn-secondary">
          {t('useGPS') || 'Use GPS'}
        </button>
        {location && <output className="location-readout">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</output>}
        </div>
        </fieldset>

        {/* ── Photo ── */}
        <div className="form-group">
        <label htmlFor="plot-photo">{t('photo') || 'Photo'} <span aria-hidden="true">*</span></label>
        <input
          id="plot-photo"
          type="file"
          accept="image/*"
          capture="environment"
          required
          onChange={handlePhotoChange}
        />
        {photoPreview && (
          <img
            src={photoPreview}
            alt={t('incident.photoPreview')}
            className="field-photo-preview"
          />
        )}
        </div>

        {/* ── Species ── */}
        <div className="form-grid-two">
        <div className="form-group">
        <label htmlFor="plot-species">{t('species') || 'Species'} <span aria-hidden="true">*</span></label>
        <select
          id="plot-species"
          required
          value={speciesId}
          onChange={(e) => setSpeciesId(e.target.value)}
        >
          <option value="">{t('selectSpecies') || '-- Select species --'}</option>
          {speciesList.map((sp) => (
            <option key={sp.id} value={sp.id}>
              {sp.localName || sp.scientificName || sp.id}
            </option>
          ))}
        </select>
        </div>

        {/* ── Seedlings ── */}
        <div className="form-group">
        <label htmlFor="plot-seedlings">{t('seedlingsPlanted') || 'Seedlings Planted'} <span aria-hidden="true">*</span></label>
        <input
          id="plot-seedlings"
          type="number"
          inputMode="numeric"
          min={1}
          required
          value={seedlings}
          onChange={(e) => setSeedlings(e.target.value)}
        />
        </div>
        </div>

        {/* ── Planting date ── */}
        <div className="form-grid-two">
        <div className="form-group">
        <label htmlFor="plot-date">{t('plantedDate') || 'Planting Date'} <span aria-hidden="true">*</span></label>
        <input
          id="plot-date"
          type="date"
          required
          value={plantedDate}
          onChange={(e) => setPlantedDate(e.target.value)}
        />
        </div>

        {/* ── Site (optional) ── */}
        <div className="form-group">
        <label htmlFor="plot-site">{t('site') || 'Site (optional)'}</label>
        <select
          id="plot-site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
        >
          <option value="">{t('noSite') || '-- None --'}</option>
          {sitesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name || s.id}
            </option>
          ))}
        </select>
        </div>
        </div>

        {/* ── Error ── */}
        {error && <p role="alert" className="form-error">{error}</p>}

        {/* ── Submit ── */}
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary form-submit"
        >
          {submitting
            ? t('submitting') || 'Submitting…'
            : t('submit') || 'Submit'}
        </button>
      </form>
    </div>
  );
}

// ─────────────────────────── styles ───────────────────────────
const styles = {
  page: {
    maxWidth: 680,
    margin: '0 auto',
    padding: '24px 16px 48px',
  },
  heading: {
    color: '#173f32',
    marginBottom: 20,
    fontSize: 28,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    padding: 20,
    background: '#fff',
    border: '1px solid #d7ddd8',
    borderRadius: 8,
  },
  label: {
    fontWeight: 600,
    color: '#173f32',
    fontSize: 14,
    marginTop: 4,
  },
  mapWrap: {
    height: 250,
    borderRadius: 6,
    overflow: 'hidden',
    border: '1px solid #aab5ad',
  },
  coordText: {
    fontSize: 13,
    color: '#555',
    margin: '2px 0',
  },
  gpsBtn: {
    alignSelf: 'flex-start',
    padding: '8px 18px',
    border: '1px solid #4CAF50',
    borderRadius: 6,
    backgroundColor: '#e4ece6',
    color: '#173f32',
    fontWeight: 600,
    fontSize: 15,
    cursor: 'pointer',
  },
  fileInput: {
    fontSize: 16,
  },
  preview: {
    width: '100%',
    maxHeight: 200,
    objectFit: 'cover',
    borderRadius: 8,
    border: '1px solid #ccc',
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
    backgroundColor: '#fff',
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
  },
  error: {
    color: '#800000',
    fontWeight: 600,
    fontSize: 14,
    backgroundColor: '#fce4e4',
    padding: '8px 12px',
    borderRadius: 8,
  },
  submitBtn: {
    marginTop: 8,
    padding: '14px 0',
    border: 'none',
    borderRadius: 6,
    backgroundColor: '#173f32',
    color: '#fff',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: 0.5,
  },
};
