import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDoF6Uuunb7dl1bfmqPSbzZNZqWZYNYwEI",
  authDomain: "try-on-c05f0.firebaseapp.com",
  projectId: "try-on-c05f0",
  storageBucket: "try-on-c05f0.firebasestorage.app",
  messagingSenderId: "681286310762",
  appId: "1:681286310762:web:f183b38d64d211357c6313"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);