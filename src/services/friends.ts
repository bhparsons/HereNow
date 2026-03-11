import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { FriendRecord, FrequencyGoal } from '../types';

export async function sendFriendRequest(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  // Check not already friends or pending
  const existing = await getDoc(
    doc(db, 'users', currentUserId, 'friends', targetUserId)
  );
  if (existing.exists()) {
    throw new Error('Friend request already exists');
  }

  // Set on sender side
  await setDoc(doc(db, 'users', currentUserId, 'friends', targetUserId), {
    status: 'pending_sent',
    createdAt: serverTimestamp(),
    lastConnectionAt: null,
    connectionCount: 0,
    frequencyGoal: null,
    snoozedUntil: null,
  });

  // Set on receiver side
  await setDoc(doc(db, 'users', targetUserId, 'friends', currentUserId), {
    status: 'pending_received',
    createdAt: serverTimestamp(),
    lastConnectionAt: null,
    connectionCount: 0,
    frequencyGoal: null,
    snoozedUntil: null,
  });
}

export async function acceptFriendRequest(
  currentUserId: string,
  friendId: string
): Promise<void> {
  await setDoc(
    doc(db, 'users', currentUserId, 'friends', friendId),
    { status: 'accepted' },
    { merge: true }
  );
  await setDoc(
    doc(db, 'users', friendId, 'friends', currentUserId),
    { status: 'accepted' },
    { merge: true }
  );
}

export async function declineFriendRequest(
  currentUserId: string,
  friendId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', currentUserId, 'friends', friendId));
  await deleteDoc(doc(db, 'users', friendId, 'friends', currentUserId));
}

export async function removeFriend(
  currentUserId: string,
  friendId: string
): Promise<void> {
  await deleteDoc(doc(db, 'users', currentUserId, 'friends', friendId));
  await deleteDoc(doc(db, 'users', friendId, 'friends', currentUserId));
}

export async function getFriends(userId: string): Promise<FriendRecord[]> {
  const snap = await getDocs(collection(db, 'users', userId, 'friends'));
  return snap.docs.map((d) => parseFriendDoc(d.id, d.data()));
}

export function subscribeFriends(
  userId: string,
  callback: (friends: FriendRecord[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, 'friends'),
    (snap: QuerySnapshot<DocumentData>) => {
      const friends: FriendRecord[] = snap.docs.map((d) =>
        parseFriendDoc(d.id, d.data())
      );
      callback(friends);
    }
  );
}

/**
 * Set a frequency goal for a friend.
 */
export async function setFrequencyGoal(
  userId: string,
  friendId: string,
  goal: FrequencyGoal | null
): Promise<void> {
  await setDoc(
    doc(db, 'users', userId, 'friends', friendId),
    { frequencyGoal: goal },
    { merge: true }
  );
}

/**
 * Snooze a friend until a given date.
 */
export async function snoozeFriend(
  userId: string,
  friendId: string,
  untilDate: Date
): Promise<void> {
  await setDoc(
    doc(db, 'users', userId, 'friends', friendId),
    { snoozedUntil: Timestamp.fromDate(untilDate) },
    { merge: true }
  );
}

/**
 * Remove snooze from a friend.
 */
export async function unsnoozeFriend(
  userId: string,
  friendId: string
): Promise<void> {
  await setDoc(
    doc(db, 'users', userId, 'friends', friendId),
    { snoozedUntil: null },
    { merge: true }
  );
}

function parseFriendDoc(friendId: string, data: DocumentData): FriendRecord {
  return {
    friendId,
    status: data.status as FriendRecord['status'],
    createdAt: data.createdAt?.toDate() || new Date(),
    lastConnectionAt: data.lastConnectionAt?.toDate() || null,
    connectionCount: data.connectionCount || 0,
    frequencyGoal: data.frequencyGoal || null,
    snoozedUntil: data.snoozedUntil?.toDate() || null,
  };
}
