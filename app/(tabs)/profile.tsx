import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Switch,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken } from '../../src/services/users';
import { signOut } from '../../src/services/auth';
import { Avatar } from '../../src/components/Avatar';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { colors } from '../../src/theme/tokens';

export default function ProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [isPublic, setIsPublic] = useState(userProfile?.isPublic ?? true);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!firebaseUser || !userProfile) return;

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setSaving(true);

      if (trimmedUsername !== userProfile.username) {
        const taken = await isUsernameTaken(trimmedUsername, firebaseUser.uid);
        if (taken) {
          Alert.alert('Error', 'That username is already taken');
          return;
        }
      }

      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
        isPublic,
      });

      await refreshProfile();
      Alert.alert('Saved', 'Profile updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0] && firebaseUser) {
      await updateUserProfile(firebaseUser.uid, {
        photoUrl: result.assets[0].uri,
      });
      await refreshProfile();
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Pressable className="items-center mb-8" onPress={handlePickPhoto}>
          <Avatar
            photoUrl={userProfile?.photoUrl}
            name={userProfile?.displayName || 'User'}
            size={80}
          />
          <Text variant="caption" className="text-secondary mt-2">
            Change Photo
          </Text>
        </Pressable>

        <Input
          label="Display Name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          className="mb-4"
        />

        <Input
          label="Username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          className="mb-4"
        />

        <View className="flex-row justify-between items-center mt-2 py-2">
          <View>
            <Text variant="caption-medium">Discoverable by search</Text>
            <Text variant="caption" className="text-ink-400 mt-0.5">
              Let others find you by username
            </Text>
          </View>
          <Switch
            value={isPublic}
            onValueChange={setIsPublic}
            trackColor={{ false: colors.ink[100], true: colors.primary.DEFAULT }}
            thumbColor={colors.surface}
          />
        </View>

        <Button
          variant="primary"
          label={saving ? 'Saving...' : 'Save Changes'}
          onPress={handleSave}
          disabled={saving}
          fullWidth
          className="mt-8"
        />

        <Pressable className="mt-6 items-center py-3" onPress={handleSignOut}>
          <Text variant="body" className="text-error">Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
