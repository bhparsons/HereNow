import React, { createContext, useContext, useState, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { AddFriendSheet } from '../components/AddFriendSheet';

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
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const navigateToFriend = useCallback((username: string) => {
    router.push(`/friend/${username}`);
  }, [router]);

  return (
    <AddFriendModalContext.Provider value={{ show, hide }}>
      {children}
      {visible && <AddFriendSheet visible={visible} onClose={hide} onNavigateToFriend={navigateToFriend} />}
    </AddFriendModalContext.Provider>
  );
}
