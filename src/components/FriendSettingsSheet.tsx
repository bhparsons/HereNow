import React, { useState } from 'react';
import { View, Alert, Switch, Pressable } from 'react-native';
import { Avatar } from './Avatar';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Text } from './ui/Text';
import { ConnectionHistorySheet } from './ConnectionHistorySheet';
import { FriendRecord, User, FrequencyGoal } from '../types';
import { FREQUENCY_GOALS, SNOOZE_DURATIONS } from '../constants';
import { formatLastConnected } from '../utils/time';
import {
  setFrequencyGoal,
  snoozeFriend,
  unsnoozeFriend,
  removeFriend,
  setNotificationPreference,
} from '../services/friends';
import { logManualConnection } from '../services/connections';
import { colors } from '../theme/tokens';

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
  const [showHistory, setShowHistory] = useState(false);

  const isSnoozed = friend.snoozedUntil && friend.snoozedUntil > new Date();
  const notificationsEnabled = friend.notificationsEnabled ?? true;

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

  const handleToggleNotifications = async (enabled: boolean) => {
    await setNotificationPreference(currentUserId, friend.friendId, enabled);
  };

  const handleRemove = () => {
    Alert.alert(
      'Remove Friend',
      `Remove ${profile?.displayName || 'this friend'}? This cannot be undone.`,
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
    <>
      <Sheet visible={visible} onClose={onClose}>
        {/* Header */}
        <View className="flex-row items-center mb-4">
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
        <View className="bg-background rounded-2xl p-3 mb-4">
          <View className="flex-row justify-between py-1.5">
            <Text variant="body" className="text-ink-400">Last connected</Text>
            <Text variant="body-medium">{lastConnectedText}</Text>
          </View>
          <View className="h-px bg-ink-100 my-1" />
          <Pressable
            className="flex-row justify-between py-1.5"
            onPress={() => setShowHistory(true)}
          >
            <Text variant="body" className="text-ink-400">Times connected</Text>
            <View className="flex-row items-center">
              <Text variant="body-medium" className="text-secondary">
                {friend.connectionCount}
              </Text>
              <Text variant="caption" className="text-ink-300 ml-1">{'>'}</Text>
            </View>
          </Pressable>
        </View>

        {/* Log catch-up */}
        <Button
          variant="outline"
          label="Log Catch-up"
          onPress={handleLogCatchUp}
          fullWidth
          className="mb-5"
        />

        {/* Frequency Goal Section */}
        <View className="mb-5">
          <Text variant="section-header" className="mb-1">
            Frequency Goal
          </Text>
          <Text variant="caption" className="text-ink-300 mb-3">
            How often you'd like to connect. We'll prioritize overdue friends.
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
        </View>

        {/* Notifications Section */}
        <View className="mb-5">
          <Text variant="section-header" className="mb-1">
            Notifications
          </Text>
          <Text variant="caption" className="text-ink-300 mb-3">
            Control whether you're notified when this friend comes online.
          </Text>
          <View className="flex-row justify-between items-center bg-background rounded-2xl px-3 py-2.5">
            <Text variant="body">Notify when online</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.ink[100], true: colors.available }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Snooze Section */}
        <View className="mb-5">
          <Text variant="section-header" className="mb-1">
            Snooze
          </Text>
          <Text variant="caption" className="text-ink-300 mb-3">
            Temporarily stop notifications and deprioritize this friend.
          </Text>
          {isSnoozed ? (
            <Button
              variant="outline"
              label="Unsnooze"
              onPress={handleUnsnooze}
              fullWidth
            />
          ) : showSnoozePicker ? (
            <View className="flex-row flex-wrap gap-2">
              {SNOOZE_DURATIONS.map((s) => (
                <Chip
                  key={s.days}
                  label={s.label}
                  onPress={() => handleSnooze(s.days)}
                />
              ))}
            </View>
          ) : (
            <Button
              variant="outline"
              label="Snooze"
              onPress={() => setShowSnoozePicker(true)}
              fullWidth
            />
          )}
        </View>

        {/* Danger Zone */}
        <View className="border-t border-ink-100 pt-4 mt-1">
          <Text variant="section-header" className="text-error mb-3">
            Danger Zone
          </Text>
          <Button
            variant="destructive"
            label="Remove Friend"
            onPress={handleRemove}
            fullWidth
          />
        </View>
      </Sheet>

      {/* Connection History Sheet */}
      <ConnectionHistorySheet
        visible={showHistory}
        onClose={() => setShowHistory(false)}
        currentUserId={currentUserId}
        friendId={friend.friendId}
        friendName={profile?.displayName || 'Friend'}
      />
    </>
  );
}
