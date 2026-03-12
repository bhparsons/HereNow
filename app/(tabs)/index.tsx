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
import NetInfo from '@react-native-community/netinfo';
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
import { Logo } from '../../src/components/Logo';
import { Button } from '../../src/components/ui/Button';
import { Chip } from '../../src/components/ui/Chip';
import { Text } from '../../src/components/ui/Text';
import { IconButton } from '../../src/components/ui/IconButton';
import { formatTimeRemaining, formatLastConnected } from '../../src/utils/time';
import { sortByPriority, assignTiers } from '../../src/utils/priority';
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
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Derive selectedFriend from live acceptedFriends list to avoid stale snapshots
  const selectedFriend = useMemo(
    () => (selectedFriendId ? acceptedFriends.find((f) => f.friendId === selectedFriendId) ?? null : null),
    [selectedFriendId, acceptedFriends]
  );
  const [allFriendsExpanded, setAllFriendsExpanded] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Network connectivity listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? true);
    });
    return () => unsubscribe();
  }, []);

  // Compute tier assignments for priority ranking
  const tierMap = useMemo(
    () => assignTiers(acceptedFriends),
    [acceptedFriends]
  );

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

  // Search bar component (reused in both states)
  const SearchBar = () => (
    <View
      className="flex-row items-center mb-3 rounded-4xl px-3.5 py-2.5"
      style={{
        backgroundColor: colors.glass.card,
        borderWidth: 1,
        borderColor: colors.glass.cardBorder,
      }}
    >
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
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Network offline banner */}
      {!isConnected && (
        <View
          className="mx-4 mb-2 px-4 py-2 rounded-2xl flex-row items-center justify-center"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.2)',
          }}
        >
          <Ionicons name="cloud-offline-outline" size={16} color={colors.error} style={{ marginRight: 6 }} />
          <Text variant="caption" style={{ color: colors.error }}>
            No connection
          </Text>
        </View>
      )}

      {/* Header */}
      <View className="flex-row justify-between items-center px-4 py-2">
        <Logo />
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

      {/* Status Bar (compact, replaces full-background tinting) */}
      {isAvailable && (
        <View
          className="mx-4 mb-3 rounded-2xl overflow-hidden"
          style={{
            backgroundColor: inConversation
              ? 'rgba(245, 158, 11, 0.12)'
              : 'rgba(16, 185, 129, 0.12)',
            borderWidth: 1,
            borderColor: inConversation
              ? 'rgba(245, 158, 11, 0.25)'
              : 'rgba(16, 185, 129, 0.25)',
          }}
        >
          {/* Accent stripe */}
          <View
            style={{
              height: 3,
              backgroundColor: inConversation ? colors.busy : colors.available,
            }}
          />
          <View className="p-3.5">
            <View className="flex-row items-center justify-between mb-1">
              <View className="flex-row items-center">
                <Animated.View
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={[
                    { backgroundColor: inConversation ? colors.busy : colors.available },
                    pulseStyle,
                  ]}
                />
                <Text
                  variant="h3"
                  style={{ color: inConversation ? colors.busy : colors.available }}
                >
                  {inConversation ? 'In a Conversation' : "You're Online"}
                </Text>
              </View>
              <Text
                variant="h2"
                style={{ color: inConversation ? colors.busy : colors.available }}
              >
                {formatTimeRemaining(timeRemaining)}
              </Text>
            </View>
            <View className="flex-row justify-between gap-2.5 mt-1.5">
              <Pressable
                className="px-3.5 py-2 rounded-full border-3"
                style={{
                  backgroundColor: inConversation ? colors.busy : 'transparent',
                  borderColor: colors.busy,
                }}
                onPress={() => toggleInConversation(!inConversation)}
              >
                <Text
                  variant="button-small"
                  style={{ color: inConversation ? '#FFFFFF' : colors.busy }}
                >
                  {inConversation ? 'End Conversation' : 'In a Conversation'}
                </Text>
              </Pressable>
              <Pressable
                className="px-3.5 py-2 rounded-full border-3"
                style={{ borderColor: colors.ink[200] }}
                onPress={goUnavailable}
              >
                <Text variant="button-small" className="text-ink-400">
                  Go Offline
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {isAvailable ? (
        // ─── ONLINE STATE ───
        <View className="flex-1 px-4">
          {/* Available Now Section */}
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <Text variant="section-header">
                AVAILABLE NOW
              </Text>
              {filteredAvailableFriends.length > 0 && (
                <View
                  className="ml-2 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.15)' }}
                >
                  <Text variant="footnote" style={{ color: colors.available }}>
                    {filteredAvailableFriends.length}
                  </Text>
                </View>
              )}
            </View>

            <SearchBar />

            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {filteredAvailableFriends.map((friend) => (
                <AvailableFriendCard
                  key={friend.userId}
                  friend={friend}
                  tier={tierMap.get(friend.userId)}
                />
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

              {/* Offline Friends Section */}
              <Pressable
                className="flex-row justify-between items-center mt-5 mb-2"
                onPress={() => setAllFriendsExpanded(!allFriendsExpanded)}
              >
                <View className="flex-row items-center">
                  <Text variant="section-header">FRIENDS</Text>
                  <View className="ml-2 px-2 py-0.5 rounded-full bg-ink-100">
                    <Text variant="footnote" className="text-ink-400">
                      {filteredOfflineFriends.length}
                    </Text>
                  </View>
                </View>
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
                      tier={tierMap.get(friend.friendId)}
                      onPress={() => setSelectedFriendId(friend.friendId)}
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
            className="rounded-2xl py-4 items-center mb-2.5 shadow-lg"
            style={[
              goOnlineAnimStyle,
              {
                backgroundColor: colors.primary.DEFAULT,
                borderWidth: 3,
                borderColor: colors.primary[700],
                shadowColor: colors.primary.DEFAULT,
                shadowOpacity: 0.25,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 4 },
              },
            ]}
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

            <SearchBar />

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
                    tier={tierMap.get(friend.friendId)}
                    onPress={() => setSelectedFriendId(friend.friendId)}
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
          onClose={() => setSelectedFriendId(null)}
          friend={selectedFriend}
          profile={friendProfiles.get(selectedFriend.friendId)}
          currentUserId={firebaseUser.uid}
        />
      )}
    </SafeAreaView>
  );
}
