/**
 * Format a date as a relative "last connected" label.
 * Pass `prefix: true` to get "Connected X ago" style, otherwise just "X ago".
 */
export function formatLastConnected(
  lastConnectionAt: Date | null,
  options?: { prefix?: boolean }
): string {
  if (!lastConnectionAt) return options?.prefix ? '' : 'Never';
  const diff = Date.now() - lastConnectionAt.getTime();
  const minutes = Math.floor(diff / (60 * 1000));
  const hours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const prefix = options?.prefix ? 'Connected ' : '';

  if (minutes < 1) return options?.prefix ? 'Connected just now' : 'Just now';
  if (minutes < 60) return `${prefix}${minutes}m ago`;
  if (hours < 24) return `${prefix}${hours}h ago`;
  if (days === 0) return options?.prefix ? 'Connected today' : 'Today';
  if (days === 1) return options?.prefix ? 'Connected yesterday' : 'Yesterday';
  if (days < 7) return `${prefix}${days}d ago`;
  if (days < 30) return `${prefix}${Math.floor(days / 7)}w ago`;
  return `${prefix}${Math.floor(days / 30)}mo ago`;
}

export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'expired';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Format elapsed time since a start date as "Online for Xm" or "Online for Xh Ym".
 */
export function formatElapsedTime(startedAt: Date): string {
  const elapsed = Math.max(0, Math.floor((Date.now() - startedAt.getTime()) / 1000));
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);

  if (hours > 0) {
    return `Online for ${hours}h ${minutes}m`;
  }
  return `Online for ${minutes}m`;
}
