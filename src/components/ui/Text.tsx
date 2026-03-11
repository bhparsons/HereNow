import { Text as RNText, TextProps } from 'react-native';

type TextVariant = 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'body-medium' | 'caption' | 'caption-medium' | 'footnote' | 'button' | 'button-small' | 'section-header';

const variantClasses: Record<TextVariant, string> = {
  hero: 'text-hero text-ink',
  h1: 'text-h1 text-ink',
  h2: 'text-h2 text-ink',
  h3: 'text-h3 text-ink',
  body: 'text-body text-ink',
  'body-medium': 'text-body-medium text-ink',
  caption: 'text-caption text-ink-400',
  'caption-medium': 'text-caption-medium text-ink',
  footnote: 'text-footnote text-ink-400',
  button: 'text-button text-ink',
  'button-small': 'text-button-small text-ink',
  'section-header': 'text-button-small uppercase tracking-wider text-ink-400',
};

interface Props extends TextProps {
  variant?: TextVariant;
}

export function Text({ variant = 'body', className = '', ...props }: Props) {
  return (
    <RNText
      className={`${variantClasses[variant]} ${className}`}
      {...props}
    />
  );
}
