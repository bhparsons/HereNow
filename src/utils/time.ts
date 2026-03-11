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
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  const prefix = options?.prefix ? 'Connected ' : '';
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
