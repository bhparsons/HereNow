import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  collection,
  where,
  getDocs,
  documentId,
  serverTimestamp,
  limit as firestoreLimit,
} from 'firebase/firestore';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { User } from '../types';

export async function createUserProfile(
  uid: string,
  data: { displayName: string; username: string; photoUrl: string | null; email?: string; phone?: string }
): Promise<void> {
  const profile: Record<string, any> = {
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    isPublic: true,
    createdAt: serverTimestamp(),
  };
  if (data.email) profile.email = data.email;
  if (data.phone) profile.phone = data.phone;

  // Check for referral tracking
  try {
    const invitedBy = await AsyncStorage.getItem('invitedByUsername');
    if (invitedBy) {
      profile.invitedBy = invitedBy;
      await AsyncStorage.removeItem('invitedByUsername');
    }
  } catch {}

  await setDoc(doc(db, 'users', uid), profile);
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
    email: data.email,
    phone: data.phone,
    invitedBy: data.invitedBy,
    contactMethods: data.contactMethods,
  };
}

/**
 * Fetch multiple user profiles in batches of 30 (Firestore `in` query limit).
 */
export async function getUserProfiles(uids: string[]): Promise<Map<string, User>> {
  const profiles = new Map<string, User>();
  if (uids.length === 0) return profiles;

  // Firestore `in` queries are limited to 30 values
  const BATCH_SIZE = 30;
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);
    const q = query(collection(db, 'users'), where(documentId(), 'in', batch));
    const snap = await getDocs(q);
    for (const userDoc of snap.docs) {
      const data = userDoc.data();
      profiles.set(userDoc.id, {
        uid: userDoc.id,
        displayName: data.displayName,
        username: data.username,
        photoUrl: data.photoUrl,
        isPublic: data.isPublic ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        pushToken: data.pushToken,
        contactMethods: data.contactMethods,
      });
    }
  }

  return profiles;
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'username' | 'photoUrl' | 'pushToken' | 'isPublic' | 'availabilityNotificationsEnabled' | 'contactMethods' | 'email' | 'phone'>>
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
    email: data.email,
    phone: data.phone,
    contactMethods: data.contactMethods,
  };
}

export async function searchUsersByPrefix(prefix: string): Promise<User[]> {
  if (!prefix) return [];
  const q = query(
    collection(db, 'users'),
    where('username', '>=', prefix),
    where('username', '<', prefix + '\uf8ff'),
    firestoreLimit(10)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((userDoc) => {
      const data = userDoc.data();
      return {
        uid: userDoc.id,
        displayName: data.displayName,
        username: data.username,
        photoUrl: data.photoUrl,
        isPublic: data.isPublic ?? true,
        createdAt: data.createdAt?.toDate() || new Date(),
        contactMethods: data.contactMethods,
      } as User;
    })
    .filter((user) => user.isPublic !== false);
}

/**
 * Upload a profile photo to Firebase Storage and return the download URL.
 */
export async function uploadProfilePhoto(
  userId: string,
  uri: string
): Promise<string> {
  const storage = getStorage();
  const storageRef = ref(storage, `profile-photos/${userId}`);

  // Fetch the image from the local URI and convert to a blob
  const response = await fetch(uri);
  const blob = await response.blob();

  await uploadBytes(storageRef, blob);
  const downloadUrl = await getDownloadURL(storageRef);
  return downloadUrl;
}
