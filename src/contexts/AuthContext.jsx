import React, { createContext, useContext } from 'react';

// Prototype mode deliberately has no login. Records use this stable local
// identity so queued retries remain deterministic and easy to recognise.
export const PROTOTYPE_USER = Object.freeze({
  uid: 'prototype-user',
  displayName: 'Prototype User',
  email: '',
});

export const PROTOTYPE_PROFILE = Object.freeze({
  name: 'Prototype User',
  role: 'admin',
  organisation: 'BakauBase Demo',
  language: 'en',
});

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

export function AuthProvider({ children }) {
  const value = {
    user: PROTOTYPE_USER,
    currentUser: PROTOTYPE_USER,
    userProfile: PROTOTYPE_PROFILE,
    loading: false,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
