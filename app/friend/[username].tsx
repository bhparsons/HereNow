import React, { useEffect, useState } from 'react';
import { View, Alert, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/hooks/useAuth';
import { findUserByUsername } from '../../src/services/users';
import { sendFriendRequest, FriendRequestResult } from '../../src/services/friends';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { User } from '../../src/types';
import { colors } from '../../src/theme/tokens';

export default function FriendDeepLink() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { firebaseUser } = useAuth();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<FriendRequestResult | null>(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!username) return;

    // Stash inviter username for referral tracking if user is not authenticated
    if (!firebaseUser) {
      AsyncStorage.setItem('invitedByUsername', username).catch(() => {});
    }

    findUserByUsername(username, false)
      .then(setUser)
      .catch(() => Alert.alert('Error', 'Could not find user'))
      .finally(() => setLoading(false));
  }, [username, firebaseUser]);

  // Auto-send friend request once user is loaded and we're authenticated
  useEffect(() => {
    if (!firebaseUser || !user || result || sending) return;
    setSending(true);
    sendFriendRequest(firebaseUser.uid, user.uid)
      .then(setResult)
      .catch((error: any) => {
        Alert.alert('Error', error.message || 'Failed to send request');
      })
      .finally(() => setSending(false));
  }, [firebaseUser, user]);

  if (loading || sending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.secondary.DEFAULT} />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background p-6">
        <Text variant="h3" className="text-ink-400 mb-4">
          User not found
        </Text>
        <Button
          variant="ghost"
          label="Go Home"
          onPress={() => router.replace('/(tabs)')}
        />
      </View>
    );
  }

  const statusMessage = (() => {
    switch (result) {
      case 'accepted':
        return 'You\'re now friends!';
      case 'already_friends':
        return 'You\'re already friends!';
      case 'already_sent':
        return 'Friend request already sent!';
      case 'sent':
        return 'Friend request sent!';
      default:
        return null;
    }
  })();

  return (
    <View className="flex-1 items-center justify-center bg-background p-6">
      <Avatar photoUrl={user.photoUrl} name={user.displayName} size={80} />
      <Text variant="h2" className="mt-4">
        {user.displayName}
      </Text>
      <Text variant="body" className="text-ink-400 mt-1">
        @{user.username}
      </Text>

      {statusMessage && (
        <Text variant="button" className="text-available mt-6">
          {statusMessage}
        </Text>
      )}

      <Button
        variant="ghost"
        label="Go to Home"
        onPress={() => router.replace('/(tabs)')}
        className="mt-4"
      />
    </View>
  );
}
