import { DurationOption, SnoozeDuration } from '../types';

export const DURATION_OPTIONS: DurationOption[] = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
  { label: '2 hr', minutes: 120 },
];

export const SNOOZE_DURATIONS: SnoozeDuration[] = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
];

export const FREQUENCY_GOALS = [
  { label: 'Weekly', value: 'weekly' as const },
  { label: 'Monthly', value: 'monthly' as const },
  { label: 'Quarterly', value: 'quarterly' as const },
];

export const TESTFLIGHT_URL = 'https://testflight.apple.com/join/yUuy5swC';

export const QUICK_DURATIONS: DurationOption[] = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 hr', minutes: 60 },
];

export const STATUS_SUGGESTIONS = [
  'Free to chat',
  'On a break',
  'Bored',
  'Walking the dog',
  'Commuting',
  'Washing dishes',
];
