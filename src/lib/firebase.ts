
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  // Note: In a real app, these would be environment variables
  // For demo purposes, we'll use placeholder values
  apiKey: "demo-api-key",
  authDomain: "ekclickpost-demo.firebaseapp.com",
  projectId: "ekclickpost-demo",
  storageBucket: "ekclickpost-demo.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
