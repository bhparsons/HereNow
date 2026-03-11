/**
 * Server-side priority computation.
 * Mirrors the client-side logic in src/utils/priority.ts.
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

type FrequencyGoal = 'daily' | 'weekly' | 'monthly' | 'quarterly';

interface FriendData {
  friendId: string;
  lastConnectionAt: Date | null;
  connectionCount: number;
  frequencyGoal: FrequencyGoal | null;
  snoozedUntil: Date | null;
}

function goalToMs(goal: FrequencyGoal): number {
  switch (goal) {
    case 'daily':
      return 1 * MS_PER_DAY;
    case 'weekly':
      return 7 * MS_PER_DAY;
    case 'monthly':
      return 30 * MS_PER_DAY;
    case 'quarterly':
      return 90 * MS_PER_DAY;
  }
}

function goalWeight(goal: FrequencyGoal): number {
  switch (goal) {
    case 'daily':
      return 4;
    case 'weekly':
      return 3;
    case 'monthly':
      return 2;
    case 'quarterly':
      return 1;
  }
}

export function computePriority(friend: FriendData, now: Date = new Date()): number {
  if (friend.snoozedUntil && friend.snoozedUntil > now) {
    return -1;
  }

  if (!friend.frequencyGoal) {
    return 0;
  }

  const interval = goalToMs(friend.frequencyGoal);
  const timeSince = friend.lastConnectionAt
    ? now.getTime() - friend.lastConnectionAt.getTime()
    : interval * 2;

  const urgencyRatio = timeSince / interval;
  const weight = goalWeight(friend.frequencyGoal);

  return urgencyRatio * weight;
}

/**
 * Assign friends to tiers (1-4) based on priority scores.
 * Returns a map of friendId -> tier number.
 */
export function assignTiers(friends: FriendData[], now: Date = new Date()): Map<string, number> {
  const scored = friends
    .map((f) => ({
      friendId: f.friendId,
      score: computePriority(f, now),
    }))
    .sort((a, b) => b.score - a.score);

  const tiers = new Map<string, number>();
  const total = scored.length;

  if (total === 0) return tiers;

  scored.forEach((item, index) => {
    const percentile = index / total;
    let tier: number;
    if (item.score === -1) {
      tier = 4;
    } else if (percentile < 0.25) {
      tier = 1;
    } else if (percentile < 0.5) {
      tier = 2;
    } else if (percentile < 0.75) {
      tier = 3;
    } else {
      tier = 4;
    }
    tiers.set(item.friendId, tier);
  });

  return tiers;
}
