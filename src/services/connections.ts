import {
  addDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Connection } from '../types';

/**
 * Log a manual connection (user tapped "Log catch-up").
 */
export async function logManualConnection(
  currentUserId: string,
  friendId: string
): Promise<void> {
  const userIds: [string, string] =
    currentUserId < friendId
      ? [currentUserId, friendId]
      : [friendId, currentUserId];

  // Add connection record
  await addDoc(collection(db, 'connections'), {
    userIds,
    timestamp: serverTimestamp(),
    type: 'manual',
    reportedBy: currentUserId,
  });

  // Denormalize to both friend subcollections
  const now = Timestamp.now();
  await updateDoc(
    doc(db, 'users', currentUserId, 'friends', friendId),
    {
      lastConnectionAt: now,
      connectionCount: increment(1),
    }
  );
  await updateDoc(
    doc(db, 'users', friendId, 'friends', currentUserId),
    {
      lastConnectionAt: now,
      connectionCount: increment(1),
    }
  );
}

/**
 * Get connection history between two users.
 */
export async function getConnectionHistory(
  userId1: string,
  userId2: string,
  maxResults: number = 20
): Promise<Connection[]> {
  const orderedIds: [string, string] =
    userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const q = query(
    collection(db, 'connections'),
    where('userIds', '==', orderedIds),
    orderBy('timestamp', 'desc'),
    limit(maxResults)
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userIds: data.userIds,
      timestamp: data.timestamp?.toDate() || new Date(),
      type: data.type,
      reportedBy: data.reportedBy,
    };
  });
}
