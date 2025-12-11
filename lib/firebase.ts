
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// ------------------------------------------------------------------
// FIREBASE CONFIGURATION
// ------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDor_60oq0OHGtA7iRBtHYkCCrvXl5rdfw",
  authDomain: "mindflow-9335f.firebaseapp.com",
  projectId: "mindflow-9335f",
  storageBucket: "mindflow-9335f.firebasestorage.app",
  messagingSenderId: "692513852890",
  appId: "1:692513852890:web:47764a4767b1b8a16844e3",
  measurementId: "G-1FGBFFT41E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Enable Offline Persistence
// This ensures the app works offline and syncs automatically when connection is restored.
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.log('Persistence failed: Multiple tabs open.');
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.log('Persistence not supported by browser.');
    }
});

export { app, auth, db, googleProvider };
