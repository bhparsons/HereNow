import { useState } from 'react';
import { View, TextInput, TextInputProps } from 'react-native';
import { Text } from './Text';
import { colors } from '../../theme/tokens';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View className={className}>
      {label && (
        <Text variant="caption-medium" className="mb-1.5 text-ink">
          {label}
        </Text>
      )}
      <TextInput
        className={`bg-surface rounded-2xl px-4 py-4 text-body text-ink border-3 ${
          error
            ? 'border-error'
            : focused
              ? 'border-secondary'
              : 'border-ink-100'
        }`}
        placeholderTextColor={colors.ink[300]}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Text variant="footnote" className="mt-1 text-error">
          {error}
        </Text>
      )}
    </View>
  );
}
