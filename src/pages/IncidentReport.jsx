import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { db, storage } from '../firebase.js';
import { useLang } from '../contexts/LanguageContext.jsx';
import { compressImage } from '../utils/imageCompressor.js';
import { PHOTO_MAX_WIDTH, PHOTO_QUALITY } from '../config.js';
import { getCurrentPosition } from '../utils/geolocation.js';
import { updateStats } from '../utils/statsUpdater.js';

const DEFAULT_CENTRE = [3.7, 102.3];

function LocationPicker({ location, onChange }) {
  const map = useMap();
  React.useEffect(() => {
    if (location) map.setView([location.lat, location.lng], 15);
  }, [location, map]);
  useMapEvents({ click: (event) => onChange(event.latlng) });
  return location ? (
    <CircleMarker center={[location.lat, location.lng]} radius={10} pathOptions={{ color: '#7a2938', fillOpacity: 0.85 }} />
  ) : null;
}

export default function IncidentReport() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [type, setType] = useState('waste');
  const [severity, setSeverity] = useState('medium');
  const [location, setLocation] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const useGps = async () => {
    setError('');
    try {
      setLocation(await getCurrentPosition());
    } catch {
      setError(t('incident.gpsError'));
    }
  };

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const compressed = await compressImage(file, PHOTO_MAX_WIDTH, PHOTO_QUALITY).catch(() => file);
    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!location) return setError(t('incident.locationRequired'));
    if (!photo) return setError(t('incident.photoRequired'));
    setSaving(true);
    try {
      const id = uuidv4();
      const photoRef = ref(storage, `incidents/${id}/photo.jpg`);
      await uploadBytes(photoRef, photo, { contentType: 'image/jpeg' });
      await setDoc(doc(db, 'incidents', id), {
        type,
        severity,
        location: { lat: location.lat, lng: location.lng },
        gpsAccuracy: location.accuracy ?? null,
        photoUrl: await getDownloadURL(photoRef),
        notes: notes.trim(),
        status: 'reported',
        submittedBy: 'prototype-user',
        createdAt: Timestamp.now(),
      });
      await updateStats();
      navigate('/dashboard');
    } catch (submissionError) {
      setError(submissionError.message || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="field-page">
      <div className="field-page-heading">
        <p className="section-kicker">{t('incident.kicker')}</p>
        <h1>{t('incident.title')}</h1>
        <p>{t('incident.intro')}</p>
      </div>
      <form className="field-form" onSubmit={submit}>
        <div className="form-grid-two">
          <div className="form-group">
            <label htmlFor="incident-type">{t('incident.type')}</label>
            <select id="incident-type" value={type} onChange={(e) => setType(e.target.value)}>
              {['cutting', 'waste', 'oil', 'erosion', 'dyingTrees'].map((value) => (
                <option key={value} value={value}>{t(`incident.types.${value}`)}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="incident-severity">{t('incident.severity')}</label>
            <select id="incident-severity" value={severity} onChange={(e) => setSeverity(e.target.value)}>
              {['low', 'medium', 'high'].map((value) => (
                <option key={value} value={value}>{t(`incident.severities.${value}`)}</option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="location-fieldset">
          <legend>{t('incident.location')}</legend>
          <p className="field-help">{t('incident.locationHelp')}</p>
          <button type="button" className="btn-secondary" onClick={useGps}>{t('incident.useGps')}</button>
          <div className="incident-map" aria-label={t('incident.mapLabel')}>
            <MapContainer center={location ? [location.lat, location.lng] : DEFAULT_CENTRE} zoom={location ? 15 : 6}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <LocationPicker location={location} onChange={(point) => setLocation({ lat: point.lat, lng: point.lng })} />
            </MapContainer>
          </div>
          {location && <p className="location-readout">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</p>}
        </fieldset>

        <div className="form-group">
          <label htmlFor="incident-photo">{t('incident.photo')}</label>
          <input id="incident-photo" type="file" accept="image/*" capture="environment" required onChange={choosePhoto} />
          {preview && <img className="incident-preview" src={preview} alt={t('incident.photoPreview')} />}
        </div>
        <div className="form-group">
          <label htmlFor="incident-notes">{t('incident.notes')}</label>
          <textarea id="incident-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows="4" />
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="btn-primary form-submit" disabled={saving} type="submit">
          {saving ? t('ui.submitting') : t('incident.submit')}
        </button>
      </form>
    </div>
  );
}
