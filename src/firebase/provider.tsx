// DO NOT MODIFY - THIS IS AN AUTO-GENERATED FILE.
// USE THE `genkit-firebase-tools` CLI TO REGENERATE THIS FILE.
'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { initializeApp, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { firebaseConfig } from './config';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

export interface FirebaseContextValue {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  storage: FirebaseStorage;
}

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined
);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [app, setApp] = useState<FirebaseApp>();
  const [auth, setAuth] = useState<Auth>();
  const [firestore, setFirestore] = useState<Firestore>();
  const [storage, setStorage] = useState<FirebaseStorage>();

  useEffect(() => {
    const app = initializeApp(firebaseConfig);
    setApp(app);
    setAuth(getAuth(app));
    setFirestore(getFirestore(app));
    setStorage(getStorage(app));
  }, []);

  const value = useMemo(() => {
    if (!app || !auth || !firestore || !storage) {
      return undefined;
    }
    return {
      app,
      auth,
      firestore,
      storage,
    };
  }, [app, auth, firestore, storage]);

  return (
    <FirebaseContext.Provider value={value}>
      {children}
      <FirebaseErrorListener />
    </FirebaseContext.Provider>
  );
}

export function useFirebaseContext() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebaseContext must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebaseContext().app;
}

export function useFirestore() {
  return useFirebaseContext().firestore;
}

export function useAuth() {
  return useFirebaseContext().auth;
}

export function useStorage() {
  return useFirebaseContext().storage;
}
