import React from 'react';
import { View } from 'react-native';
import { Text } from './ui/Text';
import { colors } from '../theme/tokens';

export function Logo() {
  return (
    <View className="flex-row items-baseline">
      <Text
        variant="h1"
        style={{ fontWeight: '800', color: colors.primary.DEFAULT }}
      >
        Here
      </Text>
      <Text
        variant="h1"
        style={{ fontWeight: '300', color: colors.ink[400] }}
      >
        Now
      </Text>
    </View>
  );
}
