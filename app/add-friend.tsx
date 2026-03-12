import React, { useState, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Alert,
  Share,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Clipboard from 'expo-clipboard';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../src/hooks/useAuth';
import { findUserByUsername } from '../src/services/users';
import { sendFriendRequest } from '../src/services/friends';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { User } from '../src/types';
import { colors } from '../src/theme/tokens';

type Tab = 'share' | 'scan' | 'search';

export default function AddFriendScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();
  const { firebaseUser, userProfile } = useAuth();

  const handleDismiss = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };
  const [activeTab, setActiveTab] = useState<Tab>('share');

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<User | null>(null);
  const [searching, setSearching] = useState(false);
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

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

  const handleSearch = async () => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    try {
      setSearching(true);
      setSearchResult(null);
      setSent(false);
      const user = await findUserByUsername(query);
      if (!user) {
        Alert.alert('Not Found', `No user with username "${query}"`);
      } else if (user.uid === firebaseUser?.uid) {
        Alert.alert('Oops', "That's you!");
      } else {
        setSearchResult(user);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleSendRequest = async () => {
    if (!firebaseUser || !searchResult) return;

    try {
      await sendFriendRequest(firebaseUser.uid, searchResult.uid);
      setSent(true);
      Alert.alert('Sent!', `Friend request sent to ${searchResult.displayName}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send request');
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    const match = data.match(/friend\/([a-z0-9_]+)/i);
    if (match) {
      setScanned(true);
      handleDismiss();
      setTimeout(() => {
        router.push(`/friend/${match[1]}`);
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
          <View className="p-4 bg-surface rounded-2xl mb-3 shadow shadow-black/5">
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
      <View className="rounded-2xl overflow-hidden" style={{ width: '100%', aspectRatio: 1 }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        <View className="absolute bottom-4 left-0 right-0 items-center">
          <Text variant="caption" className="text-white bg-black/50 px-4 py-1.5 rounded-full overflow-hidden">
            Point at a HereNow QR code
          </Text>
        </View>
      </View>
    );
  };

  const renderSearchTab = () => (
    <View>
      <View className="flex-row gap-2">
        <TextInput
          className="flex-1 bg-background rounded-2xl px-4 py-3.5 text-body text-ink border-3 border-ink-100"
          placeholder="Enter username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={handleSearch}
          placeholderTextColor={colors.ink[300]}
        />
        <Button
          variant="primary"
          size="md"
          label={searching ? '...' : 'Search'}
          onPress={handleSearch}
          disabled={searching}
        />
      </View>

      <ScrollView
        className="mt-3"
        contentContainerStyle={{ paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {searchResult ? (
          <View className="flex-row items-center bg-background p-3.5 rounded-2xl w-full">
            <Avatar photoUrl={searchResult.photoUrl} name={searchResult.displayName} size={48} />
            <View className="flex-1 ml-3">
              <Text variant="body-medium">{searchResult.displayName}</Text>
              <Text variant="caption" className="text-ink-400">@{searchResult.username}</Text>
            </View>
            {sent ? (
              <Text variant="button-small" className="text-available">Sent</Text>
            ) : (
              <Button variant="primary" size="sm" label="Add" onPress={handleSendRequest} />
            )}
          </View>
        ) : (
          <View className="items-center py-10">
            <Text variant="caption" className="text-ink-300 text-center">
              Search results will appear here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );

  return (
    <View className="flex-1" style={{ justifyContent: 'flex-end' }}>
      {/* Backdrop — tap to dismiss */}
      <Pressable style={StyleSheet.absoluteFill} onPress={handleDismiss} />

      {/* Sheet content */}
      <View className="bg-surface rounded-t-3xl px-5 pb-10 pt-3" style={{ maxHeight: screenHeight * 0.75 }}>
        {/* Close handle */}
        <Pressable onPress={handleDismiss} className="self-center mb-3 p-1">
          <View className="w-9 h-1 rounded-full bg-ink-200" />
        </Pressable>
        <Text variant="h2" className="text-center mb-4">Add Friend</Text>

        {/* Tab selector */}
        <View className="flex-row bg-background rounded-2xl p-1 mb-5">
          {(['share', 'scan', 'search'] as Tab[]).map((tab) => (
            <Pressable
              key={tab}
              className={`flex-1 py-2.5 items-center rounded-xl ${
                activeTab === tab ? 'bg-surface shadow shadow-black/10' : ''
              }`}
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

        {activeTab === 'share' && renderShareTab()}
        {activeTab === 'scan' && renderScanTab()}
        {activeTab === 'search' && renderSearchTab()}
      </View>
    </View>
  );
}
