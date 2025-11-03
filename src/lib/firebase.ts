import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC-Bi4AhIctRyyczObXoqbIcUr-NWCNZv4",
  authDomain: "usmeventhubs.firebaseapp.com",
  projectId: "usmeventhubs",
  storageBucket: "usmeventhubs.appspot.com",
  messagingSenderId: "175002008007",
  appId: "1:175002008007:web:32331f7d5327748d05c1e2",
  measurementId: "G-R48TBW1Z4B"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
