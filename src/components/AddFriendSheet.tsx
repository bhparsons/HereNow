import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Alert,
  Share,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  Keyboard,
  Dimensions,
} from 'react-native';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../hooks/useAuth';
import { searchUsersByPrefix } from '../services/users';
import { sendFriendRequest } from '../services/friends';
import { Avatar } from './Avatar';
import { Button } from './ui/Button';
import { Text } from './ui/Text';
import { User } from '../types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/tokens';

type Tab = 'share' | 'scan' | 'search';

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigateToFriend: (username: string) => void;
}

export function AddFriendSheet({ visible, onClose, onNavigateToFriend }: Props) {
  const insets = useSafeAreaInsets();
  const { firebaseUser, userProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('share');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const deepLink = userProfile?.username
    ? Linking.createURL(`friend/${userProfile.username}`)
    : '';

  const handleShareLink = async () => {
    if (!deepLink) return;
    await Share.share({ message: `Add me on HereNow! ${deepLink}` });
  };

  const handleCopyLink = async () => {
    if (!deepLink) return;
    await Clipboard.setStringAsync(deepLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearch = useCallback(async (query: string) => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const users = await searchUsersByPrefix(trimmed);
      const filtered = users.filter((u) => u.uid !== firebaseUser?.uid);
      setSearchResults(filtered);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  }, [firebaseUser?.uid]);

  const handleChangeText = useCallback((text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      handleSearch(text);
    }, 300);
  }, [handleSearch]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  // Listen for keyboard show/hide to dynamically resize the sheet
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

  const handleSendRequest = async (user: User) => {
    if (!firebaseUser) return;

    try {
      await sendFriendRequest(firebaseUser.uid, user.uid);
      setSentIds((prev) => new Set(prev).add(user.uid));
      Alert.alert('Sent!', `Friend request sent to ${user.displayName}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    const match = data.match(/friend\/([a-z0-9_]+)/i);
    if (match) {
      setScanned(true);
      onClose();
      setTimeout(() => {
        onNavigateToFriend(match[1]);
      }, 300);
    }
  };

  useEffect(() => {
    if (activeTab === 'scan') setScanned(false);
  }, [activeTab]);

  const renderShareTab = () => (
    <View className="items-center">
      <View className="justify-center items-center py-4">
        {userProfile?.username && (
          <View className="p-4 bg-surface rounded-2xl mb-3" style={{ shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 }}>
            <QRCode value={deepLink} size={160} color={colors.ink.DEFAULT} backgroundColor={colors.surface} />
          </View>
        )}
        <Text variant="caption" className="text-ink-300">
          @{userProfile?.username || '...'}
        </Text>
      </View>

      <View className="flex-row gap-2.5 w-full">
        <Button variant="secondary" label="Share Link" onPress={handleShareLink} className="flex-1" />
        <Button variant="outline" label={copied ? 'Copied!' : 'Copy Link'} onPress={handleCopyLink} className="flex-1" />
      </View>
    </View>
  );

  const renderScanTab = () => {
    if (!permission?.granted) {
      return (
        <View className="items-center justify-center py-10">
          <Text variant="body" className="text-ink-400 text-center mb-4">
            Camera access is needed to scan QR codes
          </Text>
          <Button variant="primary" label="Grant Camera Access" onPress={requestPermission} />
        </View>
      );
    }

    return (
      <View className="rounded-2xl overflow-hidden relative" style={{ width: '100%', aspectRatio: 1 }}>
        {visible && activeTab === 'scan' && (
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          />
        )}
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <Text variant="caption" className="text-white px-4 py-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            Point at a HereNow QR code
          </Text>
        </View>
      </View>
    );
  };

  const handleExitSearch = () => {
    Keyboard.dismiss();
    setSearchQuery('');
    setSearchResults([]);
    setSearchFocused(false);
  };

  const renderSearchTab = () => (
    <View className={searchFocused ? 'flex-1' : ''}>
      <View className={`flex-row gap-2 ${searchFocused ? 'items-center' : ''}`}>
        {searchFocused && (
          <Pressable onPress={handleExitSearch} className="py-2 pr-1">
            <Ionicons name="arrow-back" size={24} color={colors.ink.DEFAULT} />
          </Pressable>
        )}
        <TextInput
          className="flex-1 bg-background rounded-2xl px-4 py-3.5 text-body text-ink border-3 border-ink-100"
          placeholder="Enter username"
          value={searchQuery}
          onChangeText={handleChangeText}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          textContentType="none"
          onFocus={() => setSearchFocused(true)}
          onSubmitEditing={() => handleSearch(searchQuery)}
          returnKeyType="search"
          placeholderTextColor={colors.ink[300]}
        />
        {!searchFocused && (
          <Button
            variant="primary"
            size="md"
            label={searching ? '...' : 'Search'}
            onPress={() => handleSearch(searchQuery)}
            disabled={searching}
          />
        )}
      </View>

      {searchFocused ? (
        <Pressable className="flex-1" onPress={() => Keyboard.dismiss()}>
          <ScrollView
            className="mt-3"
            contentContainerStyle={{ paddingBottom: keyboardHeight > 0 ? keyboardHeight : 16 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {searchResults.length > 0 ? (
              searchResults.map((user) => (
                <View key={user.uid} className="flex-row items-center bg-background p-3.5 rounded-2xl w-full mb-2">
                  <Avatar photoUrl={user.photoUrl} name={user.displayName} size={48} />
                  <View className="flex-1 ml-3">
                    <Text variant="body-medium">{user.displayName}</Text>
                    <Text variant="caption" className="text-ink-400">@{user.username}</Text>
                  </View>
                  {sentIds.has(user.uid) ? (
                    <Text variant="button-small" className="text-available">Sent</Text>
                  ) : (
                    <Button variant="primary" size="sm" label="Add" onPress={() => handleSendRequest(user)} />
                  )}
                </View>
              ))
            ) : (
              <View className="items-center py-10">
                <Text variant="caption" className="text-ink-300 text-center">
                  Search results will appear here
                </Text>
              </View>
            )}
          </ScrollView>
        </Pressable>
      ) : (
        <ScrollView
          className="mt-3"
          contentContainerStyle={{ paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {searchResults.length > 0 ? (
            searchResults.map((user) => (
              <View key={user.uid} className="flex-row items-center bg-background p-3.5 rounded-2xl w-full mb-2">
                <Avatar photoUrl={user.photoUrl} name={user.displayName} size={48} />
                <View className="flex-1 ml-3">
                  <Text variant="body-medium">{user.displayName}</Text>
                  <Text variant="caption" className="text-ink-400">@{user.username}</Text>
                </View>
                {sentIds.has(user.uid) ? (
                  <Text variant="button-small" className="text-available">Sent</Text>
                ) : (
                  <Button variant="primary" size="sm" label="Add" onPress={() => handleSendRequest(user)} />
                )}
              </View>
            ))
          ) : (
            <View className="items-center py-10">
              <Text variant="caption" className="text-ink-300 text-center">
                Search results will appear here
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-end"
        style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        onPress={onClose}
      >
        <Pressable
          className="bg-surface rounded-t-3xl px-5 pt-3"
          style={{
            ...(searchFocused
              ? { height: '90%' }
              : { maxHeight: '85%' }),
            paddingBottom: Math.max(insets.bottom, 20) + 10,
          }}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Close handle */}
          <Pressable onPress={onClose} className="self-center mb-3 p-1">
            <View className="w-9 h-1 rounded-full bg-ink-200" />
          </Pressable>

          {!searchFocused && (
            <>
              <Text variant="h2" className="text-center mb-4">Add Friend</Text>

              {/* Tab selector */}
              <View className="flex-row bg-background rounded-2xl p-1 mb-5">
                {(['share', 'scan', 'search'] as Tab[]).map((tab) => (
                  <Pressable
                    key={tab}
                    className={`flex-1 py-2.5 items-center rounded-xl ${
                      activeTab === tab ? 'bg-surface' : ''
                    }`}
                    style={activeTab === tab ? { shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 1 }, shadowRadius: 2 } : undefined}
                    onPress={() => setActiveTab(tab)}
                  >
                    <Text
                      variant="button-small"
                      className={activeTab === tab ? 'text-secondary' : 'text-ink-400'}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          {activeTab === 'share' && renderShareTab()}
          {activeTab === 'scan' && renderScanTab()}
          {activeTab === 'search' && renderSearchTab()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
