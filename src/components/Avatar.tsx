import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui/Text';
import { colors } from '../theme/tokens';

interface AvatarProps {
  photoUrl: string | null | undefined;
  name: string;
  size?: number;
  isOnline?: boolean;
}

export function Avatar({ photoUrl, name, size = 44, isOnline }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      <View style={{ position: 'relative' }}>
        <Image
          source={{ uri: photoUrl }}
          className="bg-ink-100"
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: isOnline ? 3 : 0,
            borderColor: isOnline ? colors.available : 'transparent',
          }}
        />
      </View>
    );
  }

  return (
    <View
      className="items-center justify-center bg-secondary"
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: isOnline ? 3 : 0,
        borderColor: isOnline ? colors.available : 'transparent',
      }}
    >
      <Text
        variant="body-medium"
        className="text-white"
        style={{ fontSize: size * 0.4 }}
      >
        {initials || '?'}
      </Text>
    </View>
  );
}
