import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "stub-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "stub-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "stub-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "stub-storage-bucket",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "stub-messaging-id",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "stub-app-id"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  ignoreUndefinedProperties: true
});
export const storage = getStorage(app);
export const functions = getFunctions(app, "us-central1");
