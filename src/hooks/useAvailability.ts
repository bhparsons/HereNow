import { useEffect, useState, useCallback, useRef } from 'react';
import {
  subscribeToMyAvailability,
  subscribeToAvailableFriends,
  setAvailable,
  setUnavailable,
  setInConversation,
  updateStatusMessage,
} from '../services/availability';
import { getUserProfiles } from '../services/users';
import { Availability, AvailableFriend, FriendRecord } from '../types';
import { computePriority } from '../utils/priority';

export function useMyAvailability(userId: string | undefined) {
  const [availability, setAvailabilityState] = useState<Availability | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    setError(null);
    const unsubscribe = subscribeToMyAvailability(userId, setAvailabilityState);
    return unsubscribe;
  }, [userId]);

  // Countdown timer
  useEffect(() => {
    if (!availability) {
      setTimeRemaining(0);
      return;
    }

    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor((availability.availableUntil.getTime() - Date.now()) / 1000)
      );
      setTimeRemaining(remaining);
      if (remaining <= 0 && userId) {
        setUnavailable(userId);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [availability, userId]);

  const goAvailable = useCallback(
    async (durationMinutes: number, statusMessage?: string) => {
      if (!userId) return;
      try {
        setError(null);
        await setAvailable(userId, durationMinutes, statusMessage);
      } catch (e: any) {
        setError(e.message || 'Failed to go available');
      }
    },
    [userId]
  );

  const goUnavailable = useCallback(async () => {
    if (!userId) return;
    try {
      setError(null);
      await setUnavailable(userId);
    } catch (e: any) {
      setError(e.message || 'Failed to go unavailable');
    }
  }, [userId]);

  const toggleInConversation = useCallback(
    async (inConversation: boolean) => {
      if (!userId) return;
      try {
        await setInConversation(userId, inConversation);
      } catch (e: any) {
        setError(e.message || 'Failed to update conversation status');
      }
    },
    [userId]
  );

  const updateStatus = useCallback(
    async (statusMessage: string | null) => {
      if (!userId) return;
      await updateStatusMessage(userId, statusMessage);
    },
    [userId]
  );

  return {
    isAvailable: !!availability,
    availability,
    timeRemaining,
    error,
    goAvailable,
    goUnavailable,
    toggleInConversation,
    updateStatus,
  };
}

export function useAvailableFriends(
  friendIds: string[],
  friendRecords?: FriendRecord[]
) {
  const [availableFriends, setAvailableFriends] = useState<AvailableFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const friendRecordsRef = useRef(friendRecords);
  friendRecordsRef.current = friendRecords;

  useEffect(() => {
    if (friendIds.length === 0) {
      setAvailableFriends([]);
      setLoading(false);
      return;
    }

    setError(null);
    const unsubscribe = subscribeToAvailableFriends(
      friendIds,
      async (availabilityMap) => {
        try {
          const friends: AvailableFriend[] = [];
          const uids = Array.from(availabilityMap.keys());
          const profiles = await getUserProfiles(uids);

          for (const [uid, avail] of availabilityMap) {
            // Tier-based filtering (delays set to 0 — effectively a passthrough)
            if (avail.tierRevealTimes && avail.friendTiers) {
              const myTier = avail.friendTiers[uid];
              if (myTier && avail.tierRevealTimes[myTier]) {
                const revealTime = avail.tierRevealTimes[myTier];
                if (revealTime > new Date()) {
                  continue;
                }
              }
            }

            const profile = profiles.get(uid);
            if (profile) {
              friends.push({
                userId: uid,
                displayName: profile.displayName,
                username: profile.username,
                photoUrl: profile.photoUrl,
                contactMethods: profile.contactMethods,
                availableUntil: avail.availableUntil,
                startedAt: avail.startedAt,
                inConversation: avail.inConversation || false,
                statusMessage: avail.statusMessage,
              });
            }
          }

          // Sort by priority if we have friend records, otherwise by time remaining
          const records = friendRecordsRef.current;
          if (records && records.length > 0) {
            friends.sort((a, b) => {
              const recordA = records.find((r) => r.friendId === a.userId);
              const recordB = records.find((r) => r.friendId === b.userId);
              if (!recordA || !recordB) return 0;
              return computePriority(recordB) - computePriority(recordA);
            });
          } else {
            friends.sort(
              (a, b) => b.availableUntil.getTime() - a.availableUntil.getTime()
            );
          }

          setAvailableFriends(friends);
          setLoading(false);
        } catch (e: any) {
          setError(e.message || 'Failed to load available friends');
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, [friendIds.join(',')]);

  return { availableFriends, loading, error };
}
