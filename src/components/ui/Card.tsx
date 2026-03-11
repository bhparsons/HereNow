import { View, ViewProps } from 'react-native';

type CardVariant = 'flat' | 'elevated' | 'outlined';

const variantClasses: Record<CardVariant, string> = {
  flat: 'bg-surface rounded-2xl p-4',
  elevated: 'bg-surface rounded-2xl p-4 shadow shadow-black/5',
  outlined: 'bg-surface rounded-2xl p-4 border-3 border-ink-100',
};

interface Props extends ViewProps {
  variant?: CardVariant;
}

export function Card({ variant = 'elevated', className = '', ...props }: Props) {
  return (
    <View
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
