import { initializeApp } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// @ts-expect-error -- getReactNativePersistence exists at runtime in RN builds
import { getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Replace these with your Firebase project config
const firebaseConfig = {
  apiKey: 'AIzaSyDlvAFg1sbn8W0ZloZVB79EuTCz3KHXkEQ',
  authDomain: 'herenow-79f9e.firebaseapp.com',
  projectId: 'herenow-79f9e',
  storageBucket: 'herenow-79f9e.firebasestorage.app',
  messagingSenderId: '146322120768',
  appId: '1:146322120768:web:8d32cfa9a022152b553fa5',
};

const app = initializeApp(firebaseConfig);

let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export default app;
