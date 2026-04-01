import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AddFriendSheet } from '../components/AddFriendSheet';
import { FriendRecord, User } from '../types';

interface AddFriendModalContextType {
  show: () => void;
  hide: () => void;
  setFriendData: (data: {
    pendingReceived: FriendRecord[];
    pendingSent: FriendRecord[];
    acceptedFriends: FriendRecord[];
    friendProfiles: Map<string, User>;
  }) => void;
}

const AddFriendModalContext = createContext<AddFriendModalContextType>({
  show: () => {},
  hide: () => {},
  setFriendData: () => {},
});

export const useAddFriendModal = () => useContext(AddFriendModalContext);

export function AddFriendModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [friendData, setFriendData] = useState<{
    pendingReceived: FriendRecord[];
    pendingSent: FriendRecord[];
    acceptedFriends: FriendRecord[];
    friendProfiles: Map<string, User>;
  }>({ pendingReceived: [], pendingSent: [], acceptedFriends: [], friendProfiles: new Map() });
  const router = useRouter();
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const navigateToFriend = useCallback((username: string) => {
    router.push(`/friend/${username}`);
  }, [router]);

  return (
    <AddFriendModalContext.Provider value={{ show, hide, setFriendData }}>
      {children}
      {visible && (
        <AddFriendSheet
          visible={visible}
          onClose={hide}
          onNavigateToFriend={navigateToFriend}
          pendingReceived={friendData.pendingReceived}
          pendingSent={friendData.pendingSent}
          acceptedFriends={friendData.acceptedFriends}
          friendProfiles={friendData.friendProfiles}
        />
      )}
    </AddFriendModalContext.Provider>
  );
}
