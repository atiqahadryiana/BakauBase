import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Navigate, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { LanguageProvider, useLang } from './contexts/LanguageContext';
import Header from './components/Header';
import Home from './pages/Home';
import { syncOfflineItems } from './hooks/useOfflineSync';
import './App.css';

const AddPlot = lazy(() => import('./pages/AddPlot'));
const PlotDetail = lazy(() => import('./pages/PlotDetail'));
const AddObservation = lazy(() => import('./pages/AddObservation'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));
const IncidentReport = lazy(() => import('./pages/IncidentReport'));
const Intelligence = lazy(() => import('./pages/Intelligence'));

function OfflineNotice() {
  const { t } = useLang();
  return <div className="offline-banner" role="status">{t('offlineLocal')}</div>;
}

function AppShell() {
  const { t } = useLang();
  const location = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const mainRef = useRef(null);

  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      // Attempt to sync offline items when coming back online
      syncOfflineItems().catch(console.error);
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    if (navigator.onLine) syncOfflineItems().catch(console.error);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  return (
        <div className="app">
          <a className="skip-link" href="#main-content">{t('common.skipToContent')}</a>
          <Header />
          {!isOnline && <OfflineNotice />}
          <main id="main-content" className="main-content" ref={mainRef} tabIndex="-1">
            <Suspense fallback={<div className="page-state" aria-live="polite"><span className="spinner" />{t('common.loading')}</div>}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/intelligence" element={<Intelligence />} />
              <Route path="/plot/:plotId" element={<PlotDetail />} />
              <Route path="/add-plot" element={<AddPlot />} />
              <Route path="/report-incident" element={<IncidentReport />} />
              <Route path="/plot/:plotId/check" element={<AddObservation />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/admin" element={<Admin />} />
              {/* Prototype mode has no authentication. Clear legacy auth URLs. */}
              <Route path="/signin" element={<Navigate to="/" replace />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
            </Suspense>
          </main>
        </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppShell />
      </LanguageProvider>
    </AuthProvider>
  );
}
