import React from 'react';
import { View } from 'react-native';
import { Avatar } from './Avatar';
import { Sheet } from './ui/Sheet';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { FriendRecord, User } from '../types';
import { acceptFriendRequest, declineFriendRequest } from '../services/friends';

interface Props {
  visible: boolean;
  onClose: () => void;
  pendingReceived: FriendRecord[];
  pendingSent: FriendRecord[];
  friendProfiles: Map<string, User>;
  currentUserId: string;
}

export function FriendRequestsSheet({
  visible,
  onClose,
  pendingReceived,
  pendingSent,
  friendProfiles,
  currentUserId,
}: Props) {
  const handleAccept = async (friendId: string) => {
    await acceptFriendRequest(currentUserId, friendId);
  };

  const handleDecline = async (friendId: string) => {
    await declineFriendRequest(currentUserId, friendId);
  };

  const getProfile = (friendId: string) => friendProfiles.get(friendId);

  const isEmpty = pendingReceived.length === 0 && pendingSent.length === 0;

  return (
    <Sheet visible={visible} onClose={onClose}>
      <Text variant="h2" className="mb-4">
        Friend Requests
      </Text>

      {isEmpty && (
        <Text variant="body" className="text-ink-300 text-center py-6">
          No pending requests
        </Text>
      )}

      {pendingReceived.length > 0 && (
        <>
          <Text variant="section-header" className="mt-2 mb-2">
            RECEIVED
          </Text>
          {pendingReceived.map((item) => {
            const profile = getProfile(item.friendId);
            return (
              <View
                key={item.friendId}
                className="flex-row items-center bg-background p-3 rounded-2xl mb-2"
              >
                <Avatar
                  photoUrl={profile?.photoUrl}
                  name={profile?.displayName || 'User'}
                  size={44}
                />
                <View className="flex-1 ml-3">
                  <Text variant="body-medium">
                    {profile?.displayName || 'User'}
                  </Text>
                  <Text variant="caption" className="text-ink-400 mt-0.5">
                    @{profile?.username || '...'}
                  </Text>
                </View>
                <Button
                  variant="primary"
                  size="sm"
                  label="Accept"
                  onPress={() => handleAccept(item.friendId)}
                  className="mr-2"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  label="Decline"
                  onPress={() => handleDecline(item.friendId)}
                />
              </View>
            );
          })}
        </>
      )}

      {pendingSent.length > 0 && (
        <>
          <Text variant="section-header" className="mt-2 mb-2">
            SENT
          </Text>
          {pendingSent.map((item) => {
            const profile = getProfile(item.friendId);
            return (
              <View
                key={item.friendId}
                className="flex-row items-center bg-background p-3 rounded-2xl mb-2"
              >
                <Avatar
                  photoUrl={profile?.photoUrl}
                  name={profile?.displayName || 'User'}
                  size={44}
                />
                <View className="flex-1 ml-3">
                  <Text variant="body-medium">
                    {profile?.displayName || 'User'}
                  </Text>
                  <Text variant="caption" className="text-ink-400 mt-0.5">
                    @{profile?.username || '...'}
                  </Text>
                </View>
                <Text variant="caption" className="text-ink-300 italic">
                  Pending
                </Text>
              </View>
            );
          })}
        </>
      )}
    </Sheet>
  );
}
