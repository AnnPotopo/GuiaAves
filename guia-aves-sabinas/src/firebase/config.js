import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: "AIzaSyC2UNjl2dW0v_JH7-ScMUTnLkl64_7rsvM",
    authDomain: "librostools.firebaseapp.com",
    projectId: "librostools",
    storageBucket: "librostools.firebasestorage.app",
    messagingSenderId: "442055444824",
    appId: "1:442055444824:web:1722e67e11497edd2afd2d",
    measurementId: "G-M7MQHHR58B"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const analytics = getAnalytics(app);