import { ReactNode, useState, useEffect } from 'react';
import { View, Pressable, ScrollView, Keyboard, Platform } from 'react-native';
import { Modal } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: number | `${number}%`;
}

export function Sheet({ visible, onClose, children, maxHeight }: Props) {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/40 justify-end"
        onPress={onClose}
      >
        <Pressable
          className={`bg-surface rounded-t-3xl px-5 pb-10 pt-3 ${maxHeight ? '' : 'max-h-[70%]'}`}
          style={maxHeight ? { maxHeight } : undefined}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="w-9 h-1 rounded-full bg-ink-200 self-center mb-4" />
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 1 }}
            contentContainerStyle={{ paddingBottom: keyboardHeight }}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
