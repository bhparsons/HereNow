import { FriendRecord, FrequencyGoal } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Convert a frequency goal to its interval in milliseconds.
 */
export function goalToMs(goal: FrequencyGoal): number {
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

/**
 * Goal weight: higher-frequency goals get higher weight so that
 * an overdue daily friend ranks above an equally-overdue quarterly friend.
 */
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

/**
 * Compute a numeric priority score for a single friend.
 * Higher score = more urgent / should appear first.
 *
 * Returns -1 for snoozed friends.
 * Returns 0 for friends with no frequency goal.
 */
export function computePriority(friend: FriendRecord, now: Date = new Date()): number {
  // Snoozed friends always at bottom
  if (friend.snoozedUntil && friend.snoozedUntil > now) {
    return -1;
  }

  // No goal = low priority (but above snoozed)
  if (!friend.frequencyGoal) {
    return 0;
  }

  const interval = goalToMs(friend.frequencyGoal);
  const timeSince = friend.lastConnectionAt
    ? now.getTime() - friend.lastConnectionAt.getTime()
    : interval * 2; // Never connected = treat as 2x overdue

  const urgencyRatio = timeSince / interval;
  const weight = goalWeight(friend.frequencyGoal);

  return urgencyRatio * weight;
}

/**
 * Assign friends to tiers (1-4) based on priority scores.
 * Tier 1 = top 25% (highest priority), Tier 4 = bottom 25%.
 *
 * Returns a map of friendId -> tier number.
 */
export function assignTiers(
  friends: FriendRecord[],
  now: Date = new Date()
): Map<string, number> {
  const scored = friends
    .filter((f) => f.status === 'accepted')
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
      tier = 4; // Snoozed always tier 4
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

/**
 * Sort friends by priority (highest first).
 */
export function sortByPriority(
  friends: FriendRecord[],
  now: Date = new Date()
): FriendRecord[] {
  return [...friends].sort(
    (a, b) => computePriority(b, now) - computePriority(a, now)
  );
}
