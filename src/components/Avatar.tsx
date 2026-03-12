import React from 'react';
import { View, Image } from 'react-native';
import { Text } from './ui/Text';
import { colors } from '../theme/tokens';

interface AvatarProps {
  photoUrl: string | null | undefined;
  name: string;
  size?: number;
  isOnline?: boolean;
  tierRingColor?: string;
}

export function Avatar({ photoUrl, name, size = 44, isOnline, tierRingColor }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // When a tier ring is present, render a colored outer ring with a gap
  const ringBorderWidth = tierRingColor ? 3 : 0;
  const ringGap = tierRingColor ? 2 : 0;
  const outerSize = size + (ringBorderWidth + ringGap) * 2;

  const avatarContent = photoUrl ? (
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
  ) : (
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

  if (tierRingColor) {
    return (
      <View style={{ position: 'relative' }}>
        <View
          style={{
            width: outerSize,
            height: outerSize,
            borderRadius: outerSize / 2,
            borderWidth: ringBorderWidth,
            borderColor: tierRingColor,
            alignItems: 'center',
            justifyContent: 'center',
            padding: ringGap,
          }}
        >
          {avatarContent}
        </View>
      </View>
    );
  }

  return (
    <View style={{ position: 'relative' }}>
      {avatarContent}
    </View>
  );
}
