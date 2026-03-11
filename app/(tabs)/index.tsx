import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/hooks/useAuth';
import { useFriends } from '../../src/hooks/useFriends';
import { useMyAvailability, useAvailableFriends } from '../../src/hooks/useAvailability';
import { DurationPicker } from '../../src/components/DurationPicker';
import { AvailableFriendCard } from '../../src/components/AvailableFriendCard';
import { FriendRow } from '../../src/components/FriendRow';
import { FriendRequestsSheet } from '../../src/components/FriendRequestsSheet';
import { FriendSettingsSheet } from '../../src/components/FriendSettingsSheet';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Text } from '../../src/components/ui/Text';
import { IconButton } from '../../src/components/ui/IconButton';
import { Badge } from '../../src/components/ui/Badge';
import { formatTimeRemaining, formatLastConnected } from '../../src/utils/time';
import { sortByPriority } from '../../src/utils/priority';
import { QUICK_DURATIONS } from '../../src/constants';
import { FriendRecord } from '../../src/types';
import { colors } from '../../src/theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const {
    acceptedFriends,
    pendingReceived,
    pendingSent,
    friendProfiles,
  } = useFriends(firebaseUser?.uid);

  const friendIds = useMemo(
    () => acceptedFriends.map((f) => f.friendId),
    [acceptedFriends]
  );

  const {
    isAvailable,
    availability,
    timeRemaining,
    goAvailable,
    goUnavailable,
    toggleInConversation,
  } = useMyAvailability(firebaseUser?.uid);
  const { availableFriends } = useAvailableFriends(friendIds, acceptedFriends);

  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [showRequestsSheet, setShowRequestsSheet] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<FriendRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [allFriendsExpanded, setAllFriendsExpanded] = useState(false);

  // Pulsing animation for online dot
  const pulseOpacity = useSharedValue(1);
  useEffect(() => {
    if (!isAvailable) return;
    pulseOpacity.value = withRepeat(
      withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    return () => {
      pulseOpacity.value = 1;
    };
  }, [isAvailable]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  // Go Online button spring animation
  const goOnlineScale = useSharedValue(1);
  const goOnlineAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: goOnlineScale.value }],
  }));

  const inConversation = availability?.inConversation || false;
  const hasPendingRequests = pendingReceived.length > 0;

  const onlineFriendIds = useMemo(
    () => new Set(availableFriends.map((f) => f.userId)),
    [availableFriends]
  );

  const sortedFriends = useMemo(
    () => sortByPriority(acceptedFriends),
    [acceptedFriends]
  );

  const query = searchQuery.trim().toLowerCase();

  const filteredAvailableFriends = useMemo(() => {
    if (!query) return availableFriends;
    return availableFriends.filter(
      (f) =>
        f.displayName.toLowerCase().includes(query) ||
        f.username.toLowerCase().includes(query)
    );
  }, [availableFriends, query]);

  const filteredOfflineFriends = useMemo(() => {
    const offline = sortedFriends.filter((f) => !onlineFriendIds.has(f.friendId));
    if (!query) return offline;
    return offline.filter((f) => {
      const profile = friendProfiles.get(f.friendId);
      const name = (profile?.displayName || '').toLowerCase();
      const username = (profile?.username || '').toLowerCase();
      return name.includes(query) || username.includes(query);
    });
  }, [sortedFriends, onlineFriendIds, friendProfiles, query]);

  const offlinePreviewFriends = useMemo(() => {
    if (query) {
      return sortedFriends.filter((f) => {
        const profile = friendProfiles.get(f.friendId);
        const name = (profile?.displayName || '').toLowerCase();
        const username = (profile?.username || '').toLowerCase();
        return name.includes(query) || username.includes(query);
      });
    }
    return sortedFriends.slice(0, 5);
  }, [sortedFriends, friendProfiles, query]);

  const getLastConnectedText = (friend: FriendRecord): string =>
    formatLastConnected(friend.lastConnectionAt, { prefix: true });

  const handleGoAvailable = async (minutes: number) => {
    setShowDurationPicker(false);
    await goAvailable(minutes);
  };

  const handleQuickDuration = async (minutes: number) => {
    await goAvailable(minutes);
  };

  const handleGoOnlinePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    goOnlineScale.value = withSpring(0.95, { damping: 8, stiffness: 400 }, () => {
      goOnlineScale.value = withSpring(1.05, { damping: 8, stiffness: 400 }, () => {
        goOnlineScale.value = withSpring(1, { damping: 10, stiffness: 300 });
      });
    });
    setShowDurationPicker(true);
  };

  return (
    <SafeAreaView
      className={`flex-1 ${
        isAvailable && !inConversation
          ? 'bg-available/10'
          : isAvailable && inConversation
            ? 'bg-busy/10'
            : 'bg-background'
      }`}
    >
      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-2">
        <Text variant="h1">HereNow</Text>
        <View className="relative">
          <IconButton
            icon={<Ionicons name="notifications-outline" size={24} color={colors.ink.DEFAULT} />}
            onPress={() => setShowRequestsSheet(true)}
          />
          {hasPendingRequests && (
            <View className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-error border-2 border-background" />
          )}
        </View>
      </View>

      {isAvailable ? (
        // ─── ONLINE STATE ───
        <View className="flex-1 px-4">
          {/* Online Status Banner */}
          <View
            className={`rounded-2xl p-3.5 mb-4 ${
              inConversation ? 'bg-busy/15' : 'bg-available/15'
            }`}
          >
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <Animated.View
                  className={`w-2.5 h-2.5 rounded-full mr-2 ${
                    inConversation ? 'bg-busy' : 'bg-available'
                  }`}
                  style={pulseStyle}
                />
                <Text
                  variant="h3"
                  className={inConversation ? 'text-busy' : 'text-available'}
                >
                  {inConversation ? 'In a Conversation' : "You're Online"}
                </Text>
              </View>
              <Text
                variant="h2"
                className={inConversation ? 'text-busy' : 'text-available'}
              >
                {formatTimeRemaining(timeRemaining)}
              </Text>
            </View>
            <View className="flex-row justify-between gap-2.5 mt-1.5">
              <Pressable
                className={`px-3.5 py-2 rounded-full border-3 ${
                  inConversation
                    ? 'bg-busy border-busy'
                    : 'bg-transparent border-busy'
                }`}
                onPress={() => toggleInConversation(!inConversation)}
              >
                <Text
                  variant="button-small"
                  className={inConversation ? 'text-white' : 'text-busy'}
                >
                  {inConversation ? 'End Conversation' : 'In a Conversation'}
                </Text>
              </Pressable>
              <Pressable
                className="px-3.5 py-2 rounded-full border-3 border-ink-200"
                onPress={goUnavailable}
              >
                <Text variant="button-small" className="text-ink-400">
                  Go Offline
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Friends Section */}
          <View className="flex-1">
            <Text variant="section-header" className="mt-2 mb-2">
              AVAILABLE NOW
            </Text>

            {/* Search Bar */}
            <View className="flex-row items-center bg-surface mb-3 rounded-4xl px-3.5 py-2.5">
              <Ionicons name="search" size={18} color={colors.ink[300]} style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 text-body text-ink p-0"
                placeholder="Search friends..."
                placeholderTextColor={colors.ink[300]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.ink[300]} />
                </Pressable>
              )}
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAvailableFriends.map((friend) => (
                <AvailableFriendCard key={friend.userId} friend={friend} />
              ))}

              {filteredAvailableFriends.length === 0 && !query && (
                <View className="items-center py-8">
                  <Text variant="body" className="text-ink-300 text-center">
                    No friends are online right now
                  </Text>
                </View>
              )}

              {filteredAvailableFriends.length === 0 && query && (
                <View className="items-center py-8">
                  <Text variant="body" className="text-ink-300 text-center">
                    No online friends match "{searchQuery}"
                  </Text>
                </View>
              )}

              {/* All Friends (collapsible) */}
              <Pressable
                className="flex-row justify-between items-center mt-4 mb-2"
                onPress={() => setAllFriendsExpanded(!allFriendsExpanded)}
              >
                <Text variant="section-header">ALL FRIENDS</Text>
                <Ionicons
                  name={allFriendsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={colors.ink[400]}
                />
              </Pressable>

              {allFriendsExpanded &&
                filteredOfflineFriends.map((friend) => {
                  const profile = friendProfiles.get(friend.friendId);
                  return (
                    <FriendRow
                      key={friend.friendId}
                      name={profile?.displayName || 'User'}
                      photoUrl={profile?.photoUrl}
                      lastConnectedText={getLastConnectedText(friend)}
                      isOnline={onlineFriendIds.has(friend.friendId)}
                      onPress={() => setSelectedFriend(friend)}
                    />
                  );
                })}

              {allFriendsExpanded && filteredOfflineFriends.length === 0 && (
                <Text variant="caption" className="text-ink-300 text-center py-3">
                  {query ? `No friends match "${searchQuery}"` : 'No offline friends'}
                </Text>
              )}

              {/* Add Friend */}
              <Button
                variant="outline"
                label="+ Add Friend"
                onPress={() => router.push('/add-friend')}
                fullWidth
                className="mt-4 mb-2"
              />
            </ScrollView>
          </View>
        </View>
      ) : (
        // ─── OFFLINE STATE ───
        <View className="flex-1 px-4">
          {/* Go Online Button */}
          <AnimatedPressable
            style={goOnlineAnimStyle}
            className="bg-primary rounded-2xl py-4 items-center mb-2.5 border-3 border-primary-700 shadow-lg shadow-primary/25"
            onPress={handleGoOnlinePress}
          >
            <Text variant="h2" className="text-white">
              Go Online
            </Text>
          </AnimatedPressable>

          {/* Quick Duration Chips */}
          <View className="flex-row justify-center gap-2.5 mb-4">
            {QUICK_DURATIONS.map((d) => (
              <Chip
                key={d.minutes}
                label={d.label}
                onPress={() => handleQuickDuration(d.minutes)}
              />
            ))}
          </View>

          {/* Friends Section */}
          <View className="flex-1">
            <Text variant="section-header" className="mt-2 mb-2">
              {query ? 'MATCHING FRIENDS' : 'FRIENDS'}
            </Text>

            {/* Search Bar */}
            <View className="flex-row items-center bg-surface mb-3 rounded-4xl px-3.5 py-2.5">
              <Ionicons name="search" size={18} color={colors.ink[300]} style={{ marginRight: 8 }} />
              <TextInput
                className="flex-1 text-body text-ink p-0"
                placeholder="Search friends..."
                placeholderTextColor={colors.ink[300]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={colors.ink[300]} />
                </Pressable>
              )}
            </View>

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {offlinePreviewFriends.map((friend) => {
                const profile = friendProfiles.get(friend.friendId);
                return (
                  <FriendRow
                    key={friend.friendId}
                    name={profile?.displayName || 'User'}
                    photoUrl={profile?.photoUrl}
                    lastConnectedText={getLastConnectedText(friend)}
                    isOnline={onlineFriendIds.has(friend.friendId)}
                    onPress={() => setSelectedFriend(friend)}
                  />
                );
              })}

              {acceptedFriends.length === 0 && !query && (
                <View className="items-center py-8">
                  <Text variant="body" className="text-ink-300 text-center">
                    Add friends to see who's available!
                  </Text>
                </View>
              )}

              {acceptedFriends.length > 0 && offlinePreviewFriends.length === 0 && query && (
                <View className="items-center py-8">
                  <Text variant="body" className="text-ink-300 text-center">
                    No friends match "{searchQuery}"
                  </Text>
                </View>
              )}

              {/* Add Friend */}
              <Button
                variant="outline"
                label="+ Add Friend"
                onPress={() => router.push('/add-friend')}
                fullWidth
                className="mt-4 mb-2"
              />
            </ScrollView>
          </View>
        </View>
      )}

      {/* Modals */}
      <DurationPicker
        visible={showDurationPicker}
        onSelect={handleGoAvailable}
        onClose={() => setShowDurationPicker(false)}
      />

      {firebaseUser && (
        <FriendRequestsSheet
          visible={showRequestsSheet}
          onClose={() => setShowRequestsSheet(false)}
          pendingReceived={pendingReceived}
          pendingSent={pendingSent}
          friendProfiles={friendProfiles}
          currentUserId={firebaseUser.uid}
        />
      )}

      {selectedFriend && firebaseUser && (
        <FriendSettingsSheet
          visible={!!selectedFriend}
          onClose={() => setSelectedFriend(null)}
          friend={selectedFriend}
          profile={friendProfiles.get(selectedFriend.friendId)}
          currentUserId={firebaseUser.uid}
        />
      )}
    </SafeAreaView>
  );
}
