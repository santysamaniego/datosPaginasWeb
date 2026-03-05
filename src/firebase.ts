import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { Contact, User } from './types';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAcFOznBL7kBGjQAFkdffdSkDpq9dKkwos",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "datospaginasweb.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "datospaginasweb",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "datospaginasweb.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "371692313280",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:371692313280:web:60e9b7f8d8afa393f8eb25",
  measurementId: import.meta.env.VITE_MEASUREMENT_ID || "G-W94747WSN6"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CONTACTS_COLLECTION = 'contacts';
const USERS_COLLECTION = 'users';

export const userService = {
  getOrCreateUser: async (email: string): Promise<User> => {
    const userRef = doc(db, USERS_COLLECTION, email);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { id: email, ...userDoc.data() } as User;
    } else {
  // Default to CoAdmin for new users, except maybe a specific admin email
        const isAdmin = email === 'ssamaniego065@gmail.com';
        const newUser: Omit<User, 'id'> = {
          email,
          role: isAdmin ? 'Admin' : 'CoAdmin',
          canSeeAll: isAdmin
        };
        await setDoc(userRef, newUser);
        return { id: email, ...newUser } as User;
      }
  },

  updateUserPermission: async (email: string, canSeeAll: boolean) => {
    const userRef = doc(db, USERS_COLLECTION, email);
    await updateDoc(userRef, { canSeeAll });
  },

  subscribeToUsers: (callback: (users: User[]) => void) => {
    return onSnapshot(collection(db, USERS_COLLECTION), (snapshot) => {
      const users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as User[];
      callback(users);
    });
  }
};

export const contactService = {
  subscribeToContacts: (callback: (contacts: Contact[]) => void) => {
    const q = query(collection(db, CONTACTS_COLLECTION), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      const contacts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Contact[];
      callback(contacts);
    });
  },

  addContact: async (contact: Omit<Contact, 'id' | 'createdAt'>, createdBy: string) => {
    const newContact = {
      ...contact,
      createdAt: Date.now(),
      createdBy
    };
    await addDoc(collection(db, CONTACTS_COLLECTION), newContact);
  },

  updateContact: async (id: string, contact: Partial<Contact>) => {
    const contactRef = doc(db, CONTACTS_COLLECTION, id);
    await updateDoc(contactRef, contact);
  },

  deleteContact: async (id: string) => {
    const contactRef = doc(db, CONTACTS_COLLECTION, id);
    await deleteDoc(contactRef);
  }
};
