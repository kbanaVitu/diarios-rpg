import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js';
import { 
  getFirestore,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp, 
  serverTimestamp 
} from 'https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js';

const app = initializeApp(window.firebaseConfig);
const db = getFirestore(app);

export { 
  db,
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  updateDoc,
  deleteDoc,
  Timestamp,
  serverTimestamp
};
