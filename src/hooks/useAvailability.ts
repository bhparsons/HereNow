import { useEffect, useState, useCallback, useRef } from 'react';
import {
  subscribeToMyAvailability,
  subscribeToAvailableFriends,
  setAvailable,
  setUnavailable,
  setInConversation,
} from '../services/availability';
import { getUserProfile } from '../services/users';
import { Availability, AvailableFriend, FriendRecord } from '../types';
import { computePriority, assignTiers } from '../utils/priority';

export function useMyAvailability(userId: string | undefined) {
  const [availability, setAvailabilityState] = useState<Availability | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    if (!userId) return;
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
    async (durationMinutes: number) => {
      if (!userId) return;
      await setAvailable(userId, durationMinutes);
    },
    [userId]
  );

  const goUnavailable = useCallback(async () => {
    if (!userId) return;
    await setUnavailable(userId);
  }, [userId]);

  const toggleInConversation = useCallback(
    async (inConversation: boolean) => {
      if (!userId) return;
      await setInConversation(userId, inConversation);
    },
    [userId]
  );

  return {
    isAvailable: !!availability,
    availability,
    timeRemaining,
    goAvailable,
    goUnavailable,
    toggleInConversation,
  };
}

export function useAvailableFriends(
  friendIds: string[],
  friendRecords?: FriendRecord[]
) {
  const [availableFriends, setAvailableFriends] = useState<AvailableFriend[]>([]);
  const [loading, setLoading] = useState(true);
  const friendRecordsRef = useRef(friendRecords);
  friendRecordsRef.current = friendRecords;

  useEffect(() => {
    if (friendIds.length === 0) {
      setAvailableFriends([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToAvailableFriends(
      friendIds,
      async (availabilityMap) => {
        const friends: AvailableFriend[] = [];
        const now = new Date();

        for (const [uid, avail] of availabilityMap) {
          // Phase 3: Tier-based filtering
          // If this availability has tier info for us, check reveal time
          if (avail.tierRevealTimes && avail.friendTiers) {
            const myTier = avail.friendTiers[uid]; // Our tier in their list
            if (myTier && avail.tierRevealTimes[myTier]) {
              const revealTime = avail.tierRevealTimes[myTier];
              if (revealTime > now) {
                // Not yet revealed for our tier, skip for now
                continue;
              }
            }
          }

          const profile = await getUserProfile(uid);
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
      }
    );

    return unsubscribe;
  }, [friendIds.join(',')]);

  // Set up timers to re-render when tier reveal times pass
  useEffect(() => {
    if (availableFriends.length === 0) return;
    // Force re-render periodically to catch newly revealed tiers
    const interval = setInterval(() => {
      setAvailableFriends((prev) => [...prev]);
    }, 10000); // Check every 10s
    return () => clearInterval(interval);
  }, [availableFriends.length]);

  return { availableFriends, loading };
}
