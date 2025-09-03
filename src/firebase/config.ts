// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Your real Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCsRVCXRzKv-XEkEj69AtP8mSRrZ-oKHwA",
  authDomain: "scaler-school-of-business.firebaseapp.com",
  projectId: "scaler-school-of-business",
  storageBucket: "scaler-school-of-business.firebasestorage.app",
  messagingSenderId: "286110199202",
  appId: "1:286110199202:web:b2324625b61ce7c109d6fb",
  measurementId: "G-PYWB8K7WXF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Configure Google Auth Provider - Remove domain restriction to allow both domains
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
  // Remove hd restriction since you need both @scaler.com and @ssb.scaler.com
});

export default app;