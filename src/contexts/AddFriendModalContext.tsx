import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AddFriendSheet } from '../components/AddFriendSheet';
import { useAuth } from '../hooks/useAuth';
import { useFriends } from '../hooks/useFriends';

interface AddFriendModalContextType {
  show: () => void;
  hide: () => void;
}

const AddFriendModalContext = createContext<AddFriendModalContextType>({
  show: () => {},
  hide: () => {},
});

export const useAddFriendModal = () => useContext(AddFriendModalContext);

export function AddFriendModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const { firebaseUser } = useAuth();
  const { pendingReceived, pendingSent, acceptedFriends, friendProfiles } = useFriends(firebaseUser?.uid);

  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const navigateToFriend = useCallback((username: string) => {
    router.push(`/friend/${username}`);
  }, [router]);

  return (
    <AddFriendModalContext.Provider value={{ show, hide }}>
      {children}
      {visible && (
        <AddFriendSheet
          visible={visible}
          onClose={hide}
          onNavigateToFriend={navigateToFriend}
          pendingReceived={pendingReceived}
          pendingSent={pendingSent}
          acceptedFriends={acceptedFriends}
          friendProfiles={friendProfiles}
        />
      )}
    </AddFriendModalContext.Provider>
  );
}
