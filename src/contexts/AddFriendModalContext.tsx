import React, { createContext, useContext, useState, useCallback } from 'react';
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
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);

  return (
    <AddFriendModalContext.Provider value={{ show, hide }}>
      {children}
      <AddFriendSheet visible={visible} onClose={hide} />
    </AddFriendModalContext.Provider>
  );
}
