import { View } from 'react-native';
import { Text } from './Text';

type BadgeVariant = 'available' | 'busy' | 'snoozed' | 'default';

const variantClasses: Record<BadgeVariant, { bg: string; text: string }> = {
  available: { bg: 'bg-available/20', text: 'text-available' },
  busy: { bg: 'bg-busy/20', text: 'text-busy' },
  snoozed: { bg: 'bg-ink-100', text: 'text-ink-400' },
  default: { bg: 'bg-ink-50', text: 'text-ink-500' },
};

interface Props {
  variant?: BadgeVariant;
  label: string;
  className?: string;
}

export function Badge({ variant = 'default', label, className = '' }: Props) {
  const v = variantClasses[variant];
  return (
    <View className={`${v.bg} rounded-full px-3 py-1 ${className}`}>
      <Text variant="footnote" className={`${v.text} font-semibold`}>
        {label}
      </Text>
    </View>
  );
}
