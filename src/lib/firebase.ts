
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "swiftroute-3230b",
  "appId": "1:196006185725:web:7b7be99f2e15ca1af68c94",
  "storageBucket": "swiftroute-3230b.firebasestorage.app",
  "apiKey": "AIzaSyCxZ7fHM0GTfBtkyxaAhotzDw5udr7lFvQ",
  "authDomain": "swiftroute-3230b.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "196006185725"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
