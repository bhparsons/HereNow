import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Sheet } from './ui/Sheet';
import { Text } from './ui/Text';
import { getConnectionHistory } from '../services/connections';
import { Connection } from '../types';
import { colors } from '../theme/tokens';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentUserId: string;
  friendId: string;
  friendName: string;
}

export function ConnectionHistorySheet({
  visible,
  onClose,
  currentUserId,
  friendId,
  friendName,
}: Props) {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!visible) return;
    setLoading(true);
    getConnectionHistory(currentUserId, friendId)
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [visible, currentUserId, friendId]);

  const formatTimestamp = (date: Date): string => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (days === 0) return `Today at ${timeStr}`;
    if (days === 1) return `Yesterday at ${timeStr}`;
    if (days < 7) return `${days}d ago at ${timeStr}`;

    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      year: now.getFullYear() !== date.getFullYear() ? 'numeric' : undefined,
    }) + ` at ${timeStr}`;
  };

  const connectionTypeLabel = (type: Connection['type']): string => {
    switch (type) {
      case 'overlap':
        return 'Mutual availability';
      case 'manual':
        return 'Logged catch-up';
      default:
        return 'Connection';
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose} maxHeight="80%">
      <Text variant="h3" className="mb-4">
        Connections with {friendName}
      </Text>

      {loading ? (
        <View className="items-center py-8">
          <ActivityIndicator size="small" color={colors.secondary.DEFAULT} />
        </View>
      ) : connections.length === 0 ? (
        <View className="items-center py-8">
          <Text variant="body" className="text-ink-300 text-center">
            No connections yet
          </Text>
          <Text variant="caption" className="text-ink-300 text-center mt-1">
            Connections are recorded when you and {friendName} are online at the
            same time, or when you log a catch-up.
          </Text>
        </View>
      ) : (
        <View>
          {connections.map((conn, index) => (
            <View
              key={conn.id || index}
              className="flex-row items-center py-3 border-b border-ink-100"
            >
              <View
                className={`w-2 h-2 rounded-full mr-3 ${
                  conn.type === 'overlap' ? 'bg-available' : 'bg-secondary'
                }`}
              />
              <View className="flex-1">
                <Text variant="body" className="text-ink">
                  {connectionTypeLabel(conn.type)}
                </Text>
                <Text variant="footnote" className="text-ink-300 mt-0.5">
                  {formatTimestamp(conn.timestamp)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Sheet>
  );
}
