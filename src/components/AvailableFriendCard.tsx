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

  const hasPhone = !!contactMethods?.phone;
  const hasFaceTime = !!contactMethods?.facetime;
  const hasWhatsApp = !!contactMethods?.whatsapp;
  const hasAnyContact = hasPhone || hasFaceTime || hasWhatsApp;

  const handleCall = (type: 'phone' | 'facetime' | 'whatsapp') => {
    switch (type) {
      case 'phone':
        if (contactMethods?.phone) {
          Linking.openURL(`tel://${contactMethods.phone}`);
        }
        break;
      case 'facetime':
        if (contactMethods?.facetime) {
          Linking.openURL(`facetime://${contactMethods.facetime}`);
        }
        break;
      case 'whatsapp':
        if (contactMethods?.whatsapp) {
          Linking.openURL(`whatsapp://send?phone=${contactMethods.whatsapp}`);
        }
        break;
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
              <Text variant="footnote" className="text-ink-300 mt-0.5">
                {elapsedText}
              </Text>
            </View>
          )}
        </View>
        {isBusy ? (
          <Badge variant="busy" label="Busy" />
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

      {/* Contact method buttons */}
      {!isBusy && hasAnyContact && (
        <View className="flex-row mt-3 gap-2 pl-14">
          {hasPhone && (
            <Pressable
              className="flex-row items-center bg-ink-50 px-3 py-1.5 rounded-full"
              onPress={() => handleCall('phone')}
            >
              <Ionicons name="call-outline" size={14} color={colors.ink[500]} />
              <Text variant="footnote" className="text-ink-500 ml-1">Phone</Text>
            </Pressable>
          )}
          {hasFaceTime && (
            <Pressable
              className="flex-row items-center bg-ink-50 px-3 py-1.5 rounded-full"
              onPress={() => handleCall('facetime')}
            >
              <Ionicons name="videocam-outline" size={14} color={colors.ink[500]} />
              <Text variant="footnote" className="text-ink-500 ml-1">FaceTime</Text>
            </Pressable>
          )}
          {hasWhatsApp && (
            <Pressable
              className="flex-row items-center bg-ink-50 px-3 py-1.5 rounded-full"
              onPress={() => handleCall('whatsapp')}
            >
              <Ionicons name="logo-whatsapp" size={14} color={colors.ink[500]} />
              <Text variant="footnote" className="text-ink-500 ml-1">WhatsApp</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}
