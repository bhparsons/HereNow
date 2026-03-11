import { useEffect, useState } from 'react';
import { subscribeFriends } from '../services/friends';
import { getUserProfile } from '../services/users';
import { FriendRecord, User } from '../types';

export function useFriends(userId: string | undefined) {
  const [friends, setFriends] = useState<FriendRecord[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = subscribeFriends(userId, async (friendRecords) => {
      setFriends(friendRecords);

      // Fetch profiles for all friends
      const profiles = new Map<string, User>();
      await Promise.all(
        friendRecords.map(async (fr) => {
          const profile = await getUserProfile(fr.friendId);
          if (profile) {
            profiles.set(fr.friendId, profile);
          }
        })
      );
      setFriendProfiles(profiles);
      setLoading(false);
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
  };
}
