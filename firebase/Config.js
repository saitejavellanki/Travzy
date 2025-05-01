// @/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration (import from your config file)
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

// Initialize Firebase services
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// For web apps - will be ignored in React Native
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

// Authentication functions
export const signUp = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase sign-up error:", error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email already in use. Try logging in instead.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Please choose a stronger password.');
    } else {
      throw new Error('Failed to create account. Please try again.');
    }
  }
};

export const signIn = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    console.error("Firebase sign-in error:", error);
    
    // Provide user-friendly error messages
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (error.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else {
      throw new Error('Login failed. Please check your credentials and try again');
    }
  }
};

export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error("Firebase password reset error:", error);
    
    if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email');
    } else {
      throw new Error('Failed to send password reset email. Please try again.');
    }
  }
};

export const logOut = async () => {
  try {
    await signOut(auth);
    return true;
  } catch (error) {
    console.error("Firebase sign-out error:", error);
    throw new Error('Failed to sign out. Please try again.');
  }
};

export const getCurrentUser = () => {
  return new Promise((resolve, reject) => {
    const unsubscribe = auth.onAuthStateChanged(
      (user) => {
        unsubscribe(); // Stop listening after first response
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
};

export { app, auth, db, storage };