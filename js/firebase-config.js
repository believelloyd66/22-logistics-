
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

// 22 LOGISTICS FIREBASE CONFIGURATION
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "logistics-38de2.firebaseapp.com",
    projectId: "logistics-38de2",
    storageBucket: "logistics-38de2.firebasestorage.app",
    messagingSenderId: "430957810732",
    appId: "1:430957810732:web:6f75bb1bcf37f716b6ed89"
};

// INITIALISE FIREBASE
const app = initializeApp(firebaseConfig);

// FIRESTORE DATABASE
export const db = getFirestore(app);

// AUTHENTICATION
export const auth = getAuth(app);
