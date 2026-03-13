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

function getSnoozeDaysRemaining(snoozedUntil: Date): number {
  const now = new Date();
  const diff = snoozedUntil.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

  const handleChangeSnoozeDate = () => {
    setShowSnoozePicker(true);
  };

  const lastConnectedText = formatLastConnected(friend.lastConnectionAt);
  const snoozedDimStyle = isSnoozed ? { opacity: 0.5 } : undefined;

  return (
    <>
      <Sheet visible={visible} onClose={onClose}>
        {/* Header with stats on RHS */}
        <View className="flex-row items-center mb-4">
          <View style={snoozedDimStyle}>
            <Avatar
              photoUrl={profile?.photoUrl}
              name={profile?.displayName || 'User'}
              size={44}
            />
          </View>
          <View className="ml-2.5 flex-1" style={snoozedDimStyle}>
            <Text variant="h3">
              {profile?.displayName || 'User'}
            </Text>
            <Text variant="caption" className="text-ink-400 mt-0.5">
              @{profile?.username || '...'}
            </Text>
          </View>
          <View className="items-end">
            <Text variant="caption" className="text-ink-400">
              Last: <Text variant="caption" className="text-ink-800 font-semibold">{lastConnectedText}</Text>
            </Text>
            <Pressable onPress={() => setShowHistory(true)}>
              <Text variant="caption" className="text-ink-400 mt-0.5">
                Connected: <Text variant="caption" className="text-secondary font-semibold">{friend.connectionCount} times</Text>
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Connection Goal + Notifications (combined card) */}
        <View
          className="bg-glass-card rounded-xl p-3 mb-3"
          style={snoozedDimStyle}
        >
          {/* Connection goal */}
          <View>
            <Text variant="body-medium" className="text-ink-800">Connection goal</Text>
            <Text variant="caption" className="text-ink-300 mt-0.5">Overdue friends are highlighted</Text>
          </View>
          <View className="flex-row flex-wrap gap-1.5 mt-2.5">
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
            <Chip
              label="✕"
              selected={friend.frequencyGoal === null}
              onPress={() => handleSetGoal(null)}
            />
          </View>

          {/* Divider */}
          <View className="h-px bg-ink-100 -mx-3 my-2.5" />

          {/* Notify when online */}
          <View className="flex-row items-center justify-between">
            <Text variant="body-medium" className="text-ink-800">Notify me when {(profile?.displayName || 'friend').split(' ')[0]} is online</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.ink[100], true: colors.available }}
              thumbColor={colors.surface}
            />
          </View>
        </View>

        {/* Snooze */}
        {isSnoozed ? (
          <View
            className="rounded-xl p-3 mb-2.5"
            style={{ backgroundColor: '#FFFBEB', borderWidth: 1.5, borderColor: '#FDE68A' }}
          >
            <View className="flex-row items-center gap-2">
              <Text variant="body-medium" style={{ color: '#92400E' }}>Snoozed</Text>
              <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: '#FEF3C7' }}>
                <Text variant="caption" style={{ color: '#92400E' }} className="font-medium">
                  ⏸ {getSnoozeDaysRemaining(friend.snoozedUntil!)} days left
                </Text>
              </View>
            </View>
            <Text variant="caption" style={{ color: '#92400E', opacity: 0.7 }} className="mt-0.5">
              Neither of you will see each other online
            </Text>
            {showSnoozePicker ? (
              <View className="flex-row flex-wrap gap-1.5 mt-2">
                {SNOOZE_DURATIONS.map((s) => (
                  <Chip
                    key={s.days}
                    label={s.label}
                    onPress={() => handleSnooze(s.days)}
                  />
                ))}
              </View>
            ) : (
              <View className="flex-row gap-2 mt-1.5">
                <Pressable
                  className="rounded-full px-2.5 py-1 border"
                  style={{ borderColor: '#FDE68A', backgroundColor: colors.surface }}
                  onPress={handleUnsnooze}
                >
                  <Text variant="caption" className="font-semibold" style={{ color: '#92400E' }}>
                    End now
                  </Text>
                </Pressable>
                <Pressable
                  className="rounded-full px-2.5 py-1 border"
                  style={{ borderColor: '#FDE68A', backgroundColor: colors.surface }}
                  onPress={handleChangeSnoozeDate}
                >
                  <Text variant="caption" className="font-semibold" style={{ color: '#92400E' }}>
                    Change date
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        ) : showSnoozePicker ? (
          <View className="rounded-xl border border-ink-100 p-3 mb-2.5">
            <Text variant="body-medium" className="text-ink-800 mb-2">Snooze for…</Text>
            <View className="flex-row flex-wrap gap-1.5">
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
            className="mb-2.5"
          />
        )}

        {/* Log Catch-up (primary CTA) */}
        <Button
          variant="primary"
          label="Log Catch-up"
          onPress={handleLogCatchUp}
          fullWidth
          className="mb-3"
        />

        {/* Remove friend (plain text link) */}
        <Pressable onPress={handleRemove} className="items-center py-1">
          <Text variant="body-medium" className="text-error">Remove friend</Text>
        </Pressable>
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
