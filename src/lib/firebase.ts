import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBABWF29S4833y4ti2LdqN6jYgmoEgcwDw",
  authDomain: "test-eventhub-bf990.firebaseapp.com",
  projectId: "test-eventhub-bf990",
  storageBucket: "test-eventhub-bf990.firebasestorage.app",
  messagingSenderId: "789952313630",
  appId: "1:789952313630:web:2b411efe6d78f65002710f",
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
