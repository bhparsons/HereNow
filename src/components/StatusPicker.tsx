import React, { useState, useEffect } from 'react';
import { View, TextInput } from 'react-native';
import { Sheet } from './ui/Sheet';
import { Chip } from './ui/Chip';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { STATUS_SUGGESTIONS } from '../constants';
import { getRecentStatuses, addRecentStatus } from '../utils/recentStatuses';
import { colors } from '../theme/tokens';

interface StatusPickerProps {
  visible: boolean;
  onSelect: (status: string | null) => void;
  onClose: () => void;
}

export function StatusPicker({ visible, onSelect, onClose }: StatusPickerProps) {
  const [input, setInput] = useState('');
  const [recentStatuses, setRecentStatuses] = useState<string[]>([]);

  useEffect(() => {
    if (visible) {
      setInput('');
      getRecentStatuses().then(setRecentStatuses);
    }
  }, [visible]);

  const handleSelect = async (status: string | null) => {
    if (status) {
      await addRecentStatus(status);
    }
    onSelect(status);
  };

  const handleChipPress = (label: string) => {
    setInput(label);
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="h2" className="text-center mb-5">
        What are you up to?
      </Text>

      <TextInput
        className="text-body text-ink px-4 py-3 rounded-2xl mb-4"
        style={{
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.15)',
          color: colors.ink.DEFAULT,
        }}
        placeholder="Type a status..."
        placeholderTextColor={colors.ink[300]}
        maxLength={60}
        value={input}
        onChangeText={setInput}
        autoFocus
      />

      <View className="flex-row flex-wrap justify-center gap-2.5 mb-4">
        {STATUS_SUGGESTIONS.map((s) => (
          <Chip
            key={s}
            label={s}
            selected={input === s}
            onPress={() => handleChipPress(s)}
          />
        ))}
      </View>

      {recentStatuses.length > 0 && (
        <View className="mb-4">
          <Text variant="section-header" className="mb-2">
            RECENTLY USED
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {recentStatuses.map((s) => (
              <Chip
                key={s}
                label={s}
                selected={input === s}
                onPress={() => handleChipPress(s)}
              />
            ))}
          </View>
        </View>
      )}

      <Button
        variant="primary"
        label="Go Online"
        onPress={() => handleSelect(input.trim() || null)}
        fullWidth
        className="mt-2"
      />
      <Button
        variant="ghost"
        label="Skip"
        onPress={() => handleSelect(null)}
        fullWidth
        className="mt-2"
      />
    </Sheet>
  );
}
