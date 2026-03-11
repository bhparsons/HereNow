import React from 'react';
import { View, Pressable } from 'react-native';
import { Avatar } from './Avatar';
import { Text } from './ui/Text';

interface FriendRowProps {
  name: string;
  photoUrl: string | null | undefined;
  lastConnectedText?: string;
  isOnline?: boolean;
  onPress?: () => void;
}

export function FriendRow({
  name,
  photoUrl,
  lastConnectedText,
  isOnline,
  onPress,
}: FriendRowProps) {
  return (
    <Pressable
      className="flex-row items-center bg-surface p-3 rounded-2xl mb-1.5"
      onPress={onPress}
      disabled={!onPress}
    >
      <View className="relative">
        <Avatar photoUrl={photoUrl} name={name} size={40} />
        {isOnline && (
          <View className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-available border-2 border-surface" />
        )}
      </View>
      <View className="flex-1 ml-3">
        <Text variant="body-medium" className="text-ink" numberOfLines={1}>
          {name}
        </Text>
        {lastConnectedText ? (
          <Text variant="footnote" className="text-ink-300 mt-0.5" numberOfLines={1}>
            {lastConnectedText}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
