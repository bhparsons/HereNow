import React from 'react';
import { View, Pressable } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './ui/Text';

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
  tier?: number;
  onPress?: () => void;
}

export function FriendRow({
  name,
  photoUrl,
  lastConnectedText,
  isOnline,
  tier,
  onPress,
}: FriendRowProps) {
  const ringColor = tierToRingColor(tier);

  return (
    <Pressable
      className="flex-row items-center bg-surface p-3 rounded-2xl mb-1.5"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="relative">
        <Avatar photoUrl={photoUrl} name={name} size={40} tierRingColor={ringColor} />
        {isOnline && (
          <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-available border-2 border-surface" />
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
    </Pressable>
  );
}
