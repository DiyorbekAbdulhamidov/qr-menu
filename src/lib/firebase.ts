import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCPDQcDA3zTlIevfibrSAnt9Ey-xVM1AAI",
  authDomain: "toybron-38387.firebaseapp.com",
  projectId: "toybron-38387",
  storageBucket: "toybron-38387.firebasestorage.app",
  messagingSenderId: "106327073127",
  appId: "1:106327073127:web:9fab4db194f1cdfb8dcfc2",
  measurementId: "G-2L6HGZSLJF"
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Analytics only on client side
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((yes) => yes && (analytics = getAnalytics(app)));
}

export { app, auth, db, storage, analytics };