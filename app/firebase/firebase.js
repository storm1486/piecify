import { initializeApp } from "firebase/app";
import { getStorage } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics"; // Import if you're using analytics
import { getAuth } from "firebase/auth"; // Import Firebase Auth

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Add this line
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const storage = getStorage(app);
const db = getFirestore(app);
const auth = getAuth(app); // Initialize Firebase Authentication
const analytics = typeof window !== "undefined" ? getAnalytics(app) : null; // Initialize analytics if it's running in the browser

export { storage, db, auth, analytics };
