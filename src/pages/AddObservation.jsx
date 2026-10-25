/**
 * AddObservation.jsx
 * ------------------
 * Form to record a survival check (observation) for a given plot.
 *
 * Workflow:
 *   1. Fetch the parent plot to get seedlingsPlanted.
 *   2. Collect alive count, dead count, photo, notes, date.
 *   3. Validate alive + dead ≤ seedlingsPlanted.
 *   4. On submit:
 *      - Online: upload photo, save observation, recalculate plot stats.
 *      - Offline: enqueue for later sync.
 *   5. Navigate back to plot detail.
 */

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

import { db, storage } from '../firebase.js';
import { getStatus, PHOTO_MAX_WIDTH, PHOTO_QUALITY } from '../config.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useLang } from '../contexts/LanguageContext.jsx';
import { compressImage } from '../utils/imageCompressor.js';
import { estimateCarbon, getAgeYears } from '../utils/carbonEstimator.js';
import { enqueue, notifyQueueChanged } from '../utils/offlineQueue.js';
import { updateStats } from '../utils/statsUpdater.js';
import { CHECK_IN_RADIUS_METRES, distanceInMetres, getCurrentPosition } from '../utils/geolocation.js';

export default function AddObservation() {
  const { plotId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { t } = useLang();

  // ── Plot reference data ──
  const [plot, setPlot] = useState(null);
  const [speciesData, setSpeciesData] = useState(null);

  // ── Form state ──
  const [aliveCount, setAliveCount] = useState(0);
  const [deadCount, setDeadCount] = useState(0);
  const [photoBlob, setPhotoBlob] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [previousPhoto, setPreviousPhoto] = useState('');
  const [overlayOpacity, setOverlayOpacity] = useState(45);
  const [checkIn, setCheckIn] = useState(null);
  const [locating, setLocating] = useState(false);
  const [notes, setNotes] = useState('');
  const [obsDate, setObsDate] = useState(
    () => new Date().toISOString().split('T')[0],
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // ── Load plot + species on mount ──
  useEffect(() => {
    async function load() {
      try {
        const plotSnap = await getDoc(doc(db, 'plots', plotId));
        if (plotSnap.exists()) {
          const data = { id: plotSnap.id, ...plotSnap.data() };
          setPlot(data);

          const previousSnap = await getDocs(query(
            collection(db, 'plots', plotId, 'observations'),
            orderBy('date', 'desc'),
          ));
          const latestWithPhoto = previousSnap.docs
            .map((item) => item.data())
            .find((item) => item.photoUrl);
          setPreviousPhoto(latestWithPhoto?.photoUrl || data.photoUrl || '');

          // Fetch species for carbon factors
          if (data.species) {
            const specSnap = await getDoc(doc(db, 'species', data.species));
            if (specSnap.exists()) {
              setSpeciesData({ id: specSnap.id, ...specSnap.data() });
            }
          }
        }
      } catch (err) {
        console.error('AddObservation – load error:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [plotId]);

  // ── Photo handler ──
  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, PHOTO_MAX_WIDTH, PHOTO_QUALITY);
      setPhotoBlob(compressed);
      setPhotoPreview(URL.createObjectURL(compressed));
    } catch (err) {
      console.error('Photo compression error:', err);
      setPhotoBlob(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const captureCheckIn = async () => {
    setError('');
    setLocating(true);
    try {
      const position = await getCurrentPosition();
      setCheckIn({ ...position, distance: distanceInMetres(position, plot.location) });
    } catch {
      setError(t('checkIn.gpsError'));
    } finally {
      setLocating(false);
    }
  };

  const simulatePlotLocation = () => {
    setError('');
    setCheckIn({ ...plot.location, accuracy: 5, distance: 0, simulated: true });
  };

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!plot) return;

    const alive = Number(aliveCount);
    const dead = Number(deadCount);

    // Validation
    if (alive + dead > plot.seedlingsPlanted) {
      setError(
        t('errCountExceeds') ||
          `Alive + Dead (${alive + dead}) cannot exceed seedlings planted (${plot.seedlingsPlanted}).`,
      );
      return;
    }

    if (!photoBlob) {
      setError(t('errPhoto') || 'Please take or select a photo.');
      return;
    }

    if (!checkIn) {
      setError(t('checkIn.required'));
      return;
    }
    if (checkIn.distance > CHECK_IN_RADIUS_METRES) {
      setError(t('checkIn.tooFar'));
      return;
    }

    setSubmitting(true);

    const obsId = uuidv4();
    const baseObsData = {
      plotId,
      date: obsDate,
      aliveCount: alive,
      deadCount: dead,
      photoUrl: '',
      notes: notes.trim(),
      submittedBy: currentUser.uid,
      verified: false,
      checkIn: {
        location: { lat: checkIn.lat, lng: checkIn.lng },
        distanceMetres: Math.round(checkIn.distance),
        accuracyMetres: checkIn.accuracy ?? null,
        simulated: Boolean(checkIn.simulated),
      },
    };

    // Browser-local prototype storage works with or without a connection.
    const isOnline = true;

    try {
      if (isOnline) {
        // Upload photo
        const storageRef = ref(
          storage,
          `plots/${plotId}/observations/${obsId}/photo.jpg`,
        );
        await uploadBytes(storageRef, photoBlob, {
          contentType: 'image/jpeg',
        });
        const photoUrl = await getDownloadURL(storageRef);
        // Save observation
        const { plotId: ignoredPlotId, ...observationFields } = baseObsData;
        await setDoc(
          doc(db, 'plots', plotId, 'observations', obsId),
          {
            ...observationFields,
            date: Timestamp.fromDate(new Date(`${obsDate}T12:00:00`)),
            createdAt: Timestamp.now(),
            photoUrl,
          },
        );

        // Recalculate plot-level stats
        const survivalRate =
          (alive / plot.seedlingsPlanted) * 100;
        const status = getStatus(survivalRate);

        // Carbon re-estimation based on alive count
        const plantedDate = plot.plantedAt?.toDate
          ? plot.plantedAt.toDate()
          : new Date();
        const ageYears = getAgeYears(plantedDate);
        const carbon = estimateCarbon(alive, speciesData?.carbonFactors, ageYears);

        await updateDoc(doc(db, 'plots', plotId), {
          survivalRate,
          status,
          estimatedCarbonLow: carbon.co2eLow,
          estimatedCarbonHigh: carbon.co2eHigh,
        });

        // Refresh global stats
        await updateStats();
      } else {
        // Offline fallback
        await enqueue('observation', obsId, baseObsData, photoBlob);
        notifyQueueChanged();
        alert(t('savedOffline') || 'Saved offline – will sync when online.');
      }

      navigate(`/plot/${plotId}`);
    } catch (err) {
      console.error('AddObservation submit error:', err);
      setError(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="field-page field-page-narrow">
        <div className="page-state" aria-live="polite">{t('loading') || 'Loading…'}</div>
      </div>
    );
  }
  if (!plot) {
    return (
      <div className="field-page field-page-narrow">
        <div className="page-state page-state-error" role="alert">{t('plotNotFound') || 'Plot not found.'}</div>
      </div>
    );
  }

  return (
    <div className="field-page field-page-narrow">
      <header className="field-page-heading">
        <p className="section-kicker">{t('operations.plot')} {plotId}</p>
        <h1>{t('addSurvivalCheck') || 'Add Survival Check'}</h1>
        <p>{t('seedlingsPlanted') || 'Seedlings planted'}: <strong className="tabular-nums">{plot.seedlingsPlanted}</strong></p>
      </header>

      <form onSubmit={handleSubmit} className="field-form">
        <fieldset className="checkin-panel">
          <legend>{t('checkIn.title')}</legend>
          <p>{t('checkIn.help')}</p>
          <div className="checkin-actions">
            <button type="button" className="btn-secondary" onClick={captureCheckIn} disabled={locating}>
              {locating ? t('checkIn.locating') : t('checkIn.useGps')}
            </button>
            <button type="button" className="demo-link" onClick={simulatePlotLocation}>{t('checkIn.simulate')}</button>
          </div>
          {checkIn && (
            <p className={checkIn.distance <= CHECK_IN_RADIUS_METRES ? 'checkin-pass' : 'checkin-fail'} role="status">
              {checkIn.distance <= CHECK_IN_RADIUS_METRES
                ? t('checkIn.withinRange')
                : `${Math.round(checkIn.distance)} m — ${t('checkIn.outsideRange')}`}
            </p>
          )}
        </fieldset>
        {/* ── Alive count ── */}
        <div className="form-grid-two">
        <div className="form-group">
        <label htmlFor="check-alive">{t('aliveCount') || 'Alive Count'} <span aria-hidden="true">*</span></label>
        <input
          id="check-alive"
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={aliveCount}
          onChange={(e) => setAliveCount(e.target.value)}
        />
        </div>

        {/* ── Dead count ── */}
        <div className="form-group">
        <label htmlFor="check-dead">{t('deadCount') || 'Dead Count'} <span aria-hidden="true">*</span></label>
        <input
          id="check-dead"
          type="number"
          inputMode="numeric"
          min={0}
          required
          value={deadCount}
          onChange={(e) => setDeadCount(e.target.value)}
        />
        </div>
        </div>

        {/* ── Photo ── */}
        <div className="form-group">
        <label htmlFor="check-photo">{t('photo') || 'Photo'} <span aria-hidden="true">*</span></label>
        <input
          id="check-photo"
          type="file"
          accept="image/*"
          capture="environment"
          required
          onChange={handlePhotoChange}
        />
        {previousPhoto && <p className="field-help">{t('sameSpot.help')}</p>}
        {(photoPreview || previousPhoto) && (
          <div className="photo-alignment">
            {photoPreview ? <img src={photoPreview} alt={t('sameSpot.newPhoto')} /> : <div className="photo-placeholder">{t('sameSpot.takePhoto')}</div>}
            {previousPhoto && <img className="ghost-photo" src={previousPhoto} alt={t('sameSpot.previousPhoto')} style={{ opacity: overlayOpacity / 100 }} />}
          </div>
        )}
        {previousPhoto && (
          <label className="opacity-control" htmlFor="overlay-opacity">
            {t('sameSpot.overlay')}
            <input id="overlay-opacity" type="range" min="0" max="80" value={overlayOpacity} onChange={(e) => setOverlayOpacity(e.target.value)} />
          </label>
        )}
        </div>

        {/* ── Notes ── */}
        <div className="form-group">
        <label htmlFor="check-notes">{t('notes') || 'Notes'}</label>
        <textarea
          id="check-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t('notesPlaceholder') || 'Any additional observations…'}
        />
        </div>

        {/* ── Date ── */}
        <div className="form-group">
        <label htmlFor="check-date">{t('date') || 'Date'} <span aria-hidden="true">*</span></label>
        <input
          id="check-date"
          type="date"
          required
          value={obsDate}
          onChange={(e) => setObsDate(e.target.value)}
        />
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
  loadingText: {
    textAlign: 'center',
    padding: 40,
    color: '#173f32',
  },
  heading: {
    color: '#1B5E20',
    marginBottom: 4,
    fontSize: 28,
  },
  subtext: {
    color: '#555',
    fontSize: 14,
    marginBottom: 12,
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
    fontSize: 16,
    marginTop: 4,
  },
  input: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 16,
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
  textarea: {
    padding: '10px 12px',
    borderRadius: 8,
    border: '1px solid #ccc',
    fontSize: 14,
    resize: 'vertical',
    fontFamily: 'inherit',
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
