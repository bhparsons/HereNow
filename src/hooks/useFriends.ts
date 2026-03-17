import { useEffect, useState } from 'react';
import { subscribeFriends } from '../services/friends';
import { getUserProfiles } from '../services/users';
import { FriendRecord, User } from '../types';

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    setError(null);
    const unsubscribe = subscribeFriends(userId, async (friendRecords) => {
      try {
        setFriends(friendRecords);

        // Batch fetch profiles (groups of 30 via Firestore `in` query)
        const friendIds = friendRecords.map((fr) => fr.friendId);
        const profiles = await getUserProfiles(friendIds);
        setFriendProfiles(profiles);
        setLoading(false);
      } catch (e: any) {
        setError(e.message || 'Failed to load friends');
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [userId]);

  const acceptedFriends = friends.filter((f) => f.status === 'accepted');
  const pendingReceived = friends.filter((f) => f.status === 'pending_received');
  const pendingSent = friends.filter((f) => f.status === 'pending_sent');

  return {
    friends,
    acceptedFriends,
    pendingReceived,
    pendingSent,
    friendProfiles,
    loading,
    error,
  };
}
