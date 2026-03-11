import { Pressable, PressableProps } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from './Text';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
type ButtonSize = 'sm' | 'md' | 'lg';

const variantClasses: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary border-3 border-primary-700 rounded-2xl',
    text: 'text-white',
  },
  secondary: {
    container: 'bg-secondary border-3 border-secondary-700 rounded-2xl',
    text: 'text-white',
  },
  outline: {
    container: 'bg-transparent border-3 border-primary rounded-2xl',
    text: 'text-primary-700',
  },
  ghost: {
    container: 'bg-transparent rounded-2xl',
    text: 'text-secondary',
  },
  destructive: {
    container: 'bg-error border-3 border-error/80 rounded-2xl',
    text: 'text-white',
  },
};

const sizeClasses: Record<ButtonSize, { container: string; text: string }> = {
  sm: { container: 'px-4 py-2', text: 'text-button-small' },
  md: { container: 'px-6 py-3.5', text: 'text-button' },
  lg: { container: 'px-8 py-4', text: 'text-button' },
};

interface Props extends Omit<PressableProps, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  fullWidth?: boolean;
  haptic?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  label,
  fullWidth = false,
  haptic = true,
  disabled,
  onPress,
  className = '',
  ...props
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handlePress = (e: any) => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    onPress?.(e);
  };

  const v = variantClasses[variant];
  const s = sizeClasses[size];

  return (
    <AnimatedPressable
      style={animatedStyle}
      className={`${v.container} ${s.container} items-center justify-center ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-50' : ''} ${className}`}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
      {...props}
    >
      <Text variant="button" className={`${v.text} ${s.text}`}>
        {label}
      </Text>
    </AnimatedPressable>
  );
}
