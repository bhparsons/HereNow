import React, { useEffect, useState } from 'react';
import { View, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { Badge } from './ui/Badge';
import { Text } from './ui/Text';
import { AvailableFriend } from '../types';
import { formatTimeRemaining, formatElapsedTime } from '../utils/time';
import { colors } from '../theme/tokens';

/** Map tier number to a colored ring for the avatar. */
function tierToRingColor(tier?: number): string | undefined {
  switch (tier) {
    case 1:
      return '#FF6B6B'; // Coral - most overdue
    case 2:
      return '#F59E0B'; // Amber - moderate
    case 3:
      return '#60A5FA'; // Blue - subtle
    default:
      return undefined; // Tier 4 or no goal: no ring
  }
}

/** FaceTime accepts phone numbers or Apple ID emails. */
function isValidFaceTimeContact(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length >= 7) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

interface Props {
  friend: AvailableFriend;
  tier?: number;
}

export function AvailableFriendCard({ friend, tier }: Props) {
  const [timeLeft, setTimeLeft] = useState('');
  const [elapsedText, setElapsedText] = useState('');

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor((friend.availableUntil.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(formatTimeRemaining(remaining));
      setElapsedText(formatElapsedTime(friend.startedAt));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [friend.availableUntil, friend.startedAt]);

  const isBusy = friend.inConversation;
  const ringColor = tierToRingColor(tier ?? friend.tier);
  const contactMethods = friend.contactMethods;

  const facetimeValue = contactMethods?.facetime;
  const hasFaceTime = !!facetimeValue && isValidFaceTimeContact(facetimeValue);

  const handleFaceTime = async () => {
    if (!facetimeValue) return;
    const url = `facetime://${facetimeValue}`;
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    }
  };

  return (
    <View
      className="p-4 rounded-2xl mb-2"
      style={{
        backgroundColor: isBusy ? colors.glass.muted : colors.glass.card,
        borderWidth: 1,
        borderColor: isBusy
          ? 'rgba(245, 158, 11, 0.2)'
          : 'rgba(16, 185, 129, 0.2)',
        opacity: isBusy ? 0.7 : 1,
        shadowColor: isBusy ? 'transparent' : colors.available,
        shadowOpacity: isBusy ? 0 : 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
      }}
    >
      <View className="flex-row items-center">
        <Avatar
          photoUrl={friend.photoUrl}
          name={friend.displayName}
          size={48}
          isOnline={!isBusy}
          tierRingColor={ringColor}
        />
        <View className="flex-1 ml-3">
          <Text
            variant="body-medium"
            className={isBusy ? 'text-ink-400' : 'text-ink'}
          >
            {friend.displayName}
          </Text>
          {isBusy ? (
            <Text variant="caption" className="text-busy mt-0.5">
              In a conversation
            </Text>
          ) : (
            <View>
              <Text variant="caption" style={{ color: colors.available }} className="mt-0.5">
                Available for {timeLeft}
              </Text>
              {friend.statusMessage && (
                <Text variant="footnote" className="text-ink-300 mt-0.5" numberOfLines={1}>
                  "{friend.statusMessage}"
                </Text>
              )}
              <Text variant="footnote" className="text-ink-300 mt-0.5">
                {elapsedText}
              </Text>
            </View>
          )}
        </View>
        {isBusy ? (
          <Badge variant="busy" label="Busy" />
        ) : hasFaceTime ? (
          <Pressable onPress={handleFaceTime} hitSlop={8}>
            <Ionicons
              name="videocam"
              size={22}
              color={colors.available}
              style={{
                shadowColor: colors.available,
                shadowOpacity: 0.6,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 0 },
              }}
            />
          </Pressable>
        ) : (
          <View
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: colors.available,
              shadowColor: colors.available,
              shadowOpacity: 0.6,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        )}
      </View>

    </View>
  );
}
