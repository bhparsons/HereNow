import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User } from '../types';

export async function createUserProfile(
  uid: string,
  data: { displayName: string; username: string; photoUrl: string | null }
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    isPublic: true,
    createdAt: serverTimestamp(),
  });
}

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    isPublic: data.isPublic ?? true,
    createdAt: data.createdAt?.toDate() || new Date(),
    pushToken: data.pushToken,
  };
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'username' | 'photoUrl' | 'pushToken' | 'isPublic'>>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
}

export async function isUsernameTaken(username: string, excludeUid?: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (excludeUid) {
    return snap.docs.some((d) => d.id !== excludeUid);
  }
  return true;
}

export async function findUserByUsername(
  username: string,
  respectPrivacy = true
): Promise<User | null> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const userDoc = snap.docs[0];
  const data = userDoc.data();
  const isPublic = data.isPublic ?? true;
  if (respectPrivacy && !isPublic) return null;
  return {
    uid: userDoc.id,
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    isPublic,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}
