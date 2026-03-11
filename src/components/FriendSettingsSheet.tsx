import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { Avatar } from './Avatar';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Text } from './ui/Text';
import { FriendRecord, User, FrequencyGoal } from '../types';
import { FREQUENCY_GOALS, SNOOZE_DURATIONS } from '../constants';
import { formatLastConnected } from '../utils/time';
import {
  setFrequencyGoal,
  snoozeFriend,
  unsnoozeFriend,
  removeFriend,
} from '../services/friends';
import { logManualConnection } from '../services/connections';

interface Props {
  visible: boolean;
  onClose: () => void;
  friend: FriendRecord;
  profile: User | undefined;
  currentUserId: string;
}

export function FriendSettingsSheet({
  visible,
  onClose,
  friend,
  profile,
  currentUserId,
}: Props) {
  const [showSnoozePicker, setShowSnoozePicker] = useState(false);

  const isSnoozed = friend.snoozedUntil && friend.snoozedUntil > new Date();

  const handleSetGoal = async (goal: FrequencyGoal | null) => {
    await setFrequencyGoal(currentUserId, friend.friendId, goal);
  };

  const handleLogCatchUp = async () => {
    await logManualConnection(currentUserId, friend.friendId);
    Alert.alert('Logged!', 'Catch-up recorded.');
    onClose();
  };

  const handleSnooze = async (days: number) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    await snoozeFriend(currentUserId, friend.friendId, until);
    setShowSnoozePicker(false);
    onClose();
  };

  const handleUnsnooze = async () => {
    await unsnoozeFriend(currentUserId, friend.friendId);
    onClose();
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Friend',
      `Remove ${profile?.displayName || 'this friend'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeFriend(currentUserId, friend.friendId);
            onClose();
          },
        },
      ]
    );
  };

  const lastConnectedText = formatLastConnected(friend.lastConnectionAt);

  return (
    <Sheet visible={visible} onClose={onClose}>
      {/* Header */}
      <View className="flex-row items-center mb-5">
        <Avatar
          photoUrl={profile?.photoUrl}
          name={profile?.displayName || 'User'}
          size={48}
        />
        <View className="ml-3">
          <Text variant="h3">
            {profile?.displayName || 'User'}
          </Text>
          <Text variant="caption" className="text-ink-400 mt-0.5">
            @{profile?.username || '...'}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View className="flex-row justify-between py-2 border-b border-ink-100">
        <Text variant="body" className="text-ink-400">Last connected</Text>
        <Text variant="body-medium">{lastConnectedText}</Text>
      </View>
      <View className="flex-row justify-between py-2 border-b border-ink-100">
        <Text variant="body" className="text-ink-400">Times connected</Text>
        <Text variant="body-medium">{friend.connectionCount}</Text>
      </View>

      {/* Log catch-up */}
      <Button
        variant="outline"
        label="Log Catch-up"
        onPress={handleLogCatchUp}
        fullWidth
        className="mt-3"
      />

      {/* Frequency Goal */}
      <Text variant="section-header" className="mt-4 mb-2">
        Frequency Goal
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {FREQUENCY_GOALS.map((g) => (
          <Chip
            key={g.value}
            label={g.label}
            selected={friend.frequencyGoal === g.value}
            onPress={() =>
              handleSetGoal(
                friend.frequencyGoal === g.value ? null : g.value
              )
            }
          />
        ))}
      </View>

      {/* Snooze */}
      {isSnoozed ? (
        <Button
          variant="outline"
          label="Unsnooze"
          onPress={handleUnsnooze}
          fullWidth
          className="mt-3"
        />
      ) : showSnoozePicker ? (
        <View className="mt-3">
          <Text variant="section-header" className="mb-2">
            Snooze for...
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {SNOOZE_DURATIONS.map((s) => (
              <Chip
                key={s.days}
                label={s.label}
                onPress={() => handleSnooze(s.days)}
              />
            ))}
          </View>
        </View>
      ) : (
        <Button
          variant="outline"
          label="Snooze"
          onPress={() => setShowSnoozePicker(true)}
          fullWidth
          className="mt-3"
        />
      )}

      {/* Remove */}
      <Button
        variant="destructive"
        label="Remove Friend"
        onPress={handleRemove}
        fullWidth
        className="mt-4"
      />
    </Sheet>
  );
}
