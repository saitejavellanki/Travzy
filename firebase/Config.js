// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBB9UxfdXt5_DqM_o-EQGZDF3lDrSmfTYw",
  authDomain: "travzyy.firebaseapp.com",
  databaseURL: "https://travzyy-default-rtdb.firebaseio.com",
  projectId: "travzyy",
  storageBucket: "travzyy.firebasestorage.app",
  messagingSenderId: "399356874562",
  appId: "1:399356874562:web:2b447680e0c96365b9c2db",
  measurementId: "G-CM9H23P9D7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);