import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken } from '../src/services/users';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';

export default function SetupProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!firebaseUser) return;

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername) {
      Alert.alert('Error', 'Please enter a username');
      return;
    }
    if (trimmedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    try {
      setLoading(true);
      const taken = await isUsernameTaken(trimmedUsername, firebaseUser.uid);
      if (taken) {
        Alert.alert('Error', 'That username is already taken');
        return;
      }

      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
      });

      await refreshProfile();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 justify-center px-6">
        <Text variant="h1" className="mb-2">
          Set Up Your Profile
        </Text>
        <Text variant="body" className="text-ink-400 mb-8">
          Choose a display name and username
        </Text>

        <Input
          label="Display Name"
          placeholder="Your name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          className="mb-4"
        />

        <Input
          label="Username"
          placeholder="your_username"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text variant="footnote" className="text-ink-300 mt-1">
          Friends can find you with this username
        </Text>

        <Button
          variant="primary"
          size="lg"
          label={loading ? 'Saving...' : 'Continue'}
          onPress={handleSave}
          disabled={loading}
          fullWidth
          className="mt-8"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
