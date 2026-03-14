import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken } from '../src/services/users';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';

export default function SetupProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState('');
  const [facetime, setFacetime] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [facetimeError, setFacetimeError] = useState('');

  const handleSave = async () => {
    if (!firebaseUser) return;

    setUsernameError('');
    setFacetimeError('');

    const trimmedUsername = username.trim().toLowerCase();
    let hasError = false;

    if (!trimmedUsername || trimmedUsername.length < 3) {
      setUsernameError('Username must be at least 3 characters');
      hasError = true;
    } else if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      setUsernameError('Only letters, numbers, and underscores allowed');
      hasError = true;
    }

    const trimmedFacetime = facetime.trim();
    if (trimmedFacetime) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedFacetime);
      const isPhone = /^\+\d{9,}$/.test(trimmedFacetime);
      if (!isEmail && !isPhone) {
        setFacetimeError('Enter a valid email or phone number');
        hasError = true;
      }
    }

    if (hasError) return;

    try {
      setLoading(true);
      const taken = await isUsernameTaken(trimmedUsername, firebaseUser.uid);
      if (taken) {
        setUsernameError('That username is already taken');
        return;
      }

      const profileData: Record<string, any> = {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
      };

      if (trimmedFacetime) {
        profileData.contactMethods = { facetime: trimmedFacetime };
      }

      await updateUserProfile(firebaseUser.uid, profileData);
      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('Failed to save profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h1" className="mb-1">
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
          onChangeText={(t) => {
            setUsername(t);
            setUsernameError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          error={usernameError}
        />
        <Text variant="footnote" className="text-ink-300 mt-1 mb-4">
          Friends can find you with this username
        </Text>

        <Input
          label="FaceTime"
          placeholder="email or phone number"
          value={facetime}
          onChangeText={(t) => {
            setFacetime(t);
            setFacetimeError('');
          }}
          autoCapitalize="none"
          autoCorrect={false}
          error={facetimeError}
          className="mb-4"
        />

        <Button
          variant="primary"
          size="lg"
          label={loading ? 'Saving...' : 'Continue'}
          onPress={handleSave}
          disabled={loading}
          fullWidth
          className="mt-6"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
