import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User } from '../types.ts';

// Initialize Firebase client
const app = initializeApp(firebaseConfig);

// CRITICAL: Initialize Firestore with the specific databaseId as specified in instructions
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firebase client is currently offline. Local cache in use.");
    }
    return false;
  }
}

export async function loginWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;
    if (!fbUser) return null;

    const email = fbUser.email || '';
    const name = fbUser.displayName || email.split('@')[0] || 'Користувач';
    const isAdmin = email.toLowerCase() === 'lipinsky2033@gmail.com';
    const photoURL = fbUser.photoURL || '';

    const appUser: User = {
      id: fbUser.uid,
      email,
      name,
      isAdmin,
      avatar: isAdmin ? '👑' : '👨‍💻',
      photoURL
    };

    // Synchronize user profile into Firestore
    try {
      const userRef = doc(db, 'users', fbUser.uid);
      await setDoc(userRef, {
        id: fbUser.uid,
        email,
        name,
        isAdmin,
        avatar: appUser.avatar,
        photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn("Could not sync user profile to Firestore:", fsErr);
    }

    return appUser;
  } catch (error: any) {
    console.error("Google Auth error:", error);
    throw error;
  }
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeToAuthState(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      callback(null);
      return;
    }

    const email = fbUser.email || '';
    const isAdmin = email.toLowerCase() === 'lipinsky2033@gmail.com';
    let avatar = isAdmin ? '👑' : '👨‍💻';
    let name = fbUser.displayName || email.split('@')[0] || 'Користувач';
    let photoURL = fbUser.photoURL || '';

    // Check if user has saved custom avatar or name in Firestore
    try {
      const userDoc = await getDoc(doc(db, 'users', fbUser.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.avatar) avatar = data.avatar;
        if (data.name) name = data.name;
        if (data.photoURL) photoURL = data.photoURL;
      }
    } catch (e) {
      // Ignore network errors on background fetch
    }

    const appUser: User = {
      id: fbUser.uid,
      email,
      name,
      isAdmin,
      avatar,
      photoURL
    };

    callback(appUser);
  });
}

export async function saveProjectMetadataToFirestore(
  projectId: string, 
  ownerId: string, 
  name: string, 
  filesCount: number
): Promise<void> {
  try {
    const cleanId = projectId.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 120);
    const projRef = doc(db, 'projects', cleanId);
    const now = new Date().toISOString();
    await setDoc(projRef, {
      id: cleanId,
      ownerId,
      name: name.slice(0, 120),
      filesCount,
      updatedAt: now,
      createdAt: now
    }, { merge: true });
  } catch (err) {
    console.warn("Could not save project to Firestore:", err);
  }
}

export async function getUserProjectsFromFirestore(userId: string) {
  try {
    const q = query(collection(db, 'projects'), where('ownerId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data());
  } catch (err) {
    console.warn("Could not fetch user projects from Firestore:", err);
    return [];
  }
}

