import React from 'react';
import { View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Text } from './ui/Text';
import { colors } from '../theme/tokens';

/** Map tier number to a colored ring for the avatar. */
function tierToRingColor(tier?: number): string | undefined {
  switch (tier) {
    case 1:
      return '#FF6B6B'; // Coral - most overdue
    case 2:
      return '#F59E0B'; // Amber - moderate
    case 3:
      return '#60A5FA'; // Blue - subtle
    default:
      return undefined; // Tier 4 or no goal: no ring
  }
}

interface FriendRowProps {
  name: string;
  photoUrl: string | null | undefined;
  lastConnectedText?: string;
  isOnline?: boolean;
  isSnoozed?: boolean;
  tier?: number;
  onPress?: () => void;
}

export function FriendRow({
  name,
  photoUrl,
  lastConnectedText,
  isOnline,
  isSnoozed,
  tier,
  onPress,
}: FriendRowProps) {
  const ringColor = tierToRingColor(tier);

  return (
    <Pressable
      className="flex-row items-center p-3 rounded-2xl mb-1.5"
      style={{
        backgroundColor: isOnline ? colors.glass.card : colors.glass.muted,
        borderWidth: 1,
        borderColor: isOnline ? 'rgba(16, 185, 129, 0.2)' : colors.glass.cardBorder,
        borderLeftWidth: isOnline ? 3 : 1,
        borderLeftColor: isOnline ? colors.available : colors.glass.cardBorder,
      }}
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="relative">
        <Avatar photoUrl={photoUrl} name={name} size={40} tierRingColor={ringColor} />
        {isOnline && (
          <View
            className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface"
            style={{
              backgroundColor: colors.available,
              shadowColor: colors.available,
              shadowOpacity: 0.6,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text variant="body-medium" className="text-ink" numberOfLines={1}>
          {name}
        </Text>
        {lastConnectedText ? (
          <Text variant="caption" className="text-ink-400 mt-0.5" numberOfLines={1}>
            {lastConnectedText}
          </Text>
        ) : null}
      </View>
      {isSnoozed && (
        <Ionicons name="moon-outline" size={18} color={colors.busy} style={{ marginLeft: 8 }} />
      )}
    </Pressable>
  );
}
