import { initializeApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: 'highschool-schedule-bui.firebaseapp.com',
  projectId: 'highschool-schedule-bui',
  storageBucket: 'highschool-schedule-bui.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase (prevent duplicate initialization)
let app: any;
let auth: Auth;
let db: Firestore;
let isDemoMode = false;

try {
  if (getApps().length === 0) {
    if (firebaseConfig.apiKey && firebaseConfig.apiKey !== 'mock_key') {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
    } else {
      console.log("%c 🟢 DEVELOPER PREVIEW: Running in Local Demo Mode", "color: #22c55e; font-weight: bold; font-size: 14px;");
      console.info("Firebase API keys are missing. Initializing mock data for immediate exploration.");
      isDemoMode = true;
      app = null as any;
      auth = { currentUser: null } as unknown as Auth;
      db = null as unknown as Firestore;
    }
  } else {
    app = getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase initialization failed:", error);
  isDemoMode = true;
  auth = { currentUser: null } as unknown as Auth;
  db = null as unknown as Firestore;
}

export { app, auth, db, isDemoMode };
