import React from 'react';
import { View } from 'react-native';
import { Sheet } from './ui/Sheet';
import { Chip } from './ui/Chip';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { DURATION_OPTIONS } from '../constants';

interface DurationPickerProps {
  visible: boolean;
  onSelect: (minutes: number) => void;
  onClose: () => void;
}

export function DurationPicker({ visible, onSelect, onClose }: DurationPickerProps) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="h2" className="text-center mb-5">
        How long are you available?
      </Text>
      <View className="flex-row flex-wrap justify-center gap-3">
        {DURATION_OPTIONS.map((opt) => (
          <Chip
            key={opt.minutes}
            label={opt.label}
            onPress={() => onSelect(opt.minutes)}
          />
        ))}
      </View>
      <Button
        variant="ghost"
        label="Cancel"
        onPress={onClose}
        fullWidth
        className="mt-5"
      />
    </Sheet>
  );
}
