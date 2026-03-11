import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Avatar } from './Avatar';
import { Badge } from './ui/Badge';
import { Text } from './ui/Text';
import { AvailableFriend } from '../types';
import { formatTimeRemaining } from '../utils/time';

interface Props {
  friend: AvailableFriend;
}

export function AvailableFriendCard({ friend }: Props) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const remaining = Math.max(
        0,
        Math.floor((friend.availableUntil.getTime() - Date.now()) / 1000)
      );
      setTimeLeft(formatTimeRemaining(remaining));
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [friend.availableUntil]);

  const isBusy = friend.inConversation;

  return (
    <View
      className={`flex-row items-center bg-surface p-4 rounded-2xl mb-2 shadow shadow-black/5 ${
        isBusy ? 'opacity-60' : ''
      }`}
    >
      <Avatar photoUrl={friend.photoUrl} name={friend.displayName} size={48} />
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
          <Text variant="caption" className="text-available mt-0.5">
            Available for {timeLeft}
          </Text>
        )}
      </View>
      {isBusy ? (
        <Badge variant="busy" label="Busy" />
      ) : (
        <View className="w-2.5 h-2.5 rounded-full bg-available" />
      )}
    </View>
  );
}
