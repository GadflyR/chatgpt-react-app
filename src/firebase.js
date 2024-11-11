import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore"; // Import Firestore

const firebaseConfig = {
  apiKey: "AIzaSyAAGIP_4XZsfasjzU7q8N4wWte8QMVWZew",
  authDomain: "chatgpt-react-app-1009c.firebaseapp.com",
  projectId: "chatgpt-react-app-1009c",
  storageBucket: "chatgpt-react-app-1009c.firebasestorage.app",
  messagingSenderId: "817139883426",
  appId: "1:817139883426:web:e8b5b091c241951f2a26fb",
  measurementId: "G-MRK98X0333"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app); // Initialize Firestore

export { auth, db };
