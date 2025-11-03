import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD2ZyNo4wtHRTUFDKnGMGHf5PdiP7o7_tE",
  authDomain: "eventusm-hub.firebaseapp.com",
  projectId: "eventusm-hub",
  storageBucket: "eventusm-hub.firebasestorage.app",
  messagingSenderId: "736547595867",
  appId: "1:736547595867:web:021cd9560caa1ecd5f817e",
  measurementId: "G-K49XKX3M3E"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
