import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  documentId,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Availability, AvailableFriend } from '../types';

export async function setAvailable(
  userId: string,
  durationMinutes: number
): Promise<void> {
  try {
    const now = new Date();
    const availableUntil = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await setDoc(doc(db, 'availability', userId), {
      isAvailable: true,
      availableUntil: Timestamp.fromDate(availableUntil),
      startedAt: Timestamp.fromDate(now),
      inConversation: false,
      inConversationWith: null,
    });
  } catch (error) {
    throw new Error('Failed to go online. Please try again.');
  }
}

export async function setUnavailable(userId: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'availability', userId));
    if (snap.exists()) {
      await deleteDoc(doc(db, 'availability', userId));
    }
  } catch (error) {
    throw new Error('Failed to go offline. Please try again.');
  }
}

export async function getMyAvailability(
  userId: string
): Promise<Availability | null> {
  const snap = await getDoc(doc(db, 'availability', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  const availableUntil = data.availableUntil.toDate();

  // If expired, clean up
  if (availableUntil <= new Date()) {
    await deleteDoc(doc(db, 'availability', userId));
    return null;
  }

  return parseAvailabilityDoc(userId, data);
}

export function subscribeToMyAvailability(
  userId: string,
  callback: (availability: Availability | null) => void
): () => void {
  return onSnapshot(doc(db, 'availability', userId), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    const availableUntil = data.availableUntil.toDate();

    if (availableUntil <= new Date()) {
      callback(null);
      return;
    }

    callback(parseAvailabilityDoc(userId, data));
  });
}

export async function getAvailableFriends(
  friendIds: string[]
): Promise<AvailableFriend[]> {
  if (friendIds.length === 0) return [];

  const now = new Date();
  const results: AvailableFriend[] = [];

  // Firestore 'in' queries support max 30 items, batch if needed
  const batches: string[][] = [];
  for (let i = 0; i < friendIds.length; i += 30) {
    batches.push(friendIds.slice(i, i + 30));
  }

  for (const batch of batches) {
    const q = query(
      collection(db, 'availability'),
      where(documentId(), 'in', batch)
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      const availableUntil = data.availableUntil.toDate();
      if (availableUntil > now) {
        results.push({
          userId: d.id,
          displayName: '',
          username: '',
          photoUrl: null,
          availableUntil,
          startedAt: data.startedAt.toDate(),
          inConversation: data.inConversation || false,
        });
      }
    }
  }

  return results;
}

export function subscribeToAvailableFriends(
  friendIds: string[],
  callback: (available: Map<string, Availability>) => void
): () => void {
  if (friendIds.length === 0) {
    callback(new Map());
    return () => {};
  }

  const unsubscribes: (() => void)[] = [];
  const availabilityMap = new Map<string, Availability>();

  // Firestore 'in' queries support max 30
  const batches: string[][] = [];
  for (let i = 0; i < friendIds.length; i += 30) {
    batches.push(friendIds.slice(i, i + 30));
  }

  for (const batch of batches) {
    const q = query(
      collection(db, 'availability'),
      where(documentId(), 'in', batch)
    );
    const unsub = onSnapshot(q, (snap) => {
      const now = new Date();
      // Clear entries for this batch
      for (const id of batch) {
        availabilityMap.delete(id);
      }
      for (const d of snap.docs) {
        const data = d.data();
        const availableUntil = data.availableUntil.toDate();
        if (availableUntil > now) {
          availabilityMap.set(d.id, parseAvailabilityDoc(d.id, data));
        }
      }
      callback(new Map(availabilityMap));
    });
    unsubscribes.push(unsub);
  }

  return () => unsubscribes.forEach((u) => u());
}

/**
 * Toggle "In a conversation" status on the user's availability doc.
 */
export async function setInConversation(
  userId: string,
  inConversation: boolean,
  withUserId?: string | null
): Promise<void> {
  await setDoc(
    doc(db, 'availability', userId),
    {
      inConversation,
      inConversationWith: withUserId || null,
    },
    { merge: true }
  );
}

function parseAvailabilityDoc(userId: string, data: DocumentData): Availability {
  const availability: Availability = {
    userId,
    isAvailable: true,
    availableUntil: data.availableUntil.toDate(),
    startedAt: data.startedAt.toDate(),
    inConversation: data.inConversation || false,
    inConversationWith: data.inConversationWith || null,
  };

  // Parse tier fields if present (Phase 3)
  if (data.tierRevealTimes) {
    availability.tierRevealTimes = {};
    for (const [tier, ts] of Object.entries(data.tierRevealTimes)) {
      availability.tierRevealTimes[Number(tier)] = (ts as any).toDate();
    }
  }

  if (data.friendTiers) {
    availability.friendTiers = data.friendTiers;
  }

  return availability;
}
