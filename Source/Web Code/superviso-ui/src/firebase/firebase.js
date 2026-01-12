
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";


const firebaseConfig = {
  apiKey: "AIzaSyAY69bNa1mf35lpvTks5Y7RBcmkwMcEg6A",
  authDomain: "fir-b847c.firebaseapp.com",
  databaseURL: "https://fir-b847c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "fir-b847c",
  storageBucket: "fir-b847c.firebasestorage.app",
  messagingSenderId: "116012585471",
  appId: "1:116012585471:web:41f8029b349733d20517ca",
  measurementId: "G-BHJPF9SDSX"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);


export const db = getFirestore(app);

export const db_rt = getDatabase(app);




export default app;