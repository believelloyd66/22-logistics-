import { initializeApp } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.2.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyBIW3C0cRDaO5WnOOb2AD0GnQ-JKd1dDzw",
    authDomain: "logistics-38de2.firebaseapp.com",
    databaseURL: "https://logistics-38de2-default-rtdb.firebaseio.com",
    projectId: "logistics-38de2",
    storageBucket: "logistics-38de2.firebasestorage.app",
    messagingSenderId: "430957810732",
    appId: "1:430957810732:web:6f75bb1bcf37f716b6ed89",
    measurementId: "G-VPRJDK7QLH"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
