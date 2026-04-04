import { initializeApp, FirebaseApp, getApps } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getDatabase, Database } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Check if Firebase is configured (API key is the minimum requirement)
const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && 
  firebaseConfig.authDomain && 
  firebaseConfig.projectId &&
  firebaseConfig.databaseURL
);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let database: Database | null = null;

if (isFirebaseConfigured) {
  try {
    // Initialize Firebase only if not already initialized
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    database = getDatabase(app);
    
    console.log('✅ Firebase initialized successfully');
    console.log('🔥 Project:', firebaseConfig.projectId);
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.error('❌ Firebase não configurado! Configure as variáveis de ambiente:');
  console.error('   - NEXT_PUBLIC_FIREBASE_API_KEY');
  console.error('   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.error('   - NEXT_PUBLIC_FIREBASE_DATABASE_URL');
  console.error('   - NEXT_PUBLIC_FIREBASE_PROJECT_ID');
}

export { app, auth, database, isFirebaseConfigured };
