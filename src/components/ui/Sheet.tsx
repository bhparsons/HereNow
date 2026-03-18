import { ReactNode, useEffect, useRef } from 'react';
import { View, Pressable, ScrollView, Keyboard, Platform, Animated } from 'react-native';
import { Modal } from 'react-native';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  maxHeight?: number | `${number}%`;
}

export function Sheet({ visible, onClose, children, maxHeight }: Props) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(translateY, {
        toValue: -e.endCoordinates.height,
        duration: e.duration || 250,
        useNativeDriver: true,
      }).start();
    });
    const hideSub = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(translateY, {
        toValue: 0,
        duration: (e as any).duration || 250,
        useNativeDriver: true,
      }).start();
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
        <Animated.View
          className={`bg-surface rounded-t-3xl px-5 pb-10 pt-3 ${maxHeight ? '' : 'max-h-[70%]'}`}
          style={[
            maxHeight ? { maxHeight } : undefined,
            { transform: [{ translateY }] },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="w-9 h-1 rounded-full bg-ink-200 self-center mb-4" />
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
            >
              {children}
            </ScrollView>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}
