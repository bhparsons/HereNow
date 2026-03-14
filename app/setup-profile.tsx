import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken } from '../src/services/users';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';
import { isValidEmail, isValidPhoneNumber, validateFaceTimeContact } from '../src/utils/validation';
import { colors } from '../src/theme/tokens';

type FaceTimeSource = 'email' | 'phone' | 'other';

export default function SetupProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [facetimeSource, setFacetimeSource] = useState<FaceTimeSource>('email');
  const [facetimeCustom, setFacetimeCustom] = useState('');
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [facetimeError, setFacetimeError] = useState('');

  const authEmail = firebaseUser?.email || '';

  const getResolvedFaceTimeContact = (): string => {
    switch (facetimeSource) {
      case 'email':
        return authEmail;
      case 'phone':
        return phone.trim();
      case 'other':
        return facetimeCustom.trim();
    }
  };

  const handleSave = async () => {
    if (!firebaseUser) return;

    setUsernameError('');
    setPhoneError('');
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

    const trimmedPhone = phone.trim();
    if (trimmedPhone && !isValidPhoneNumber(trimmedPhone)) {
      setPhoneError('Enter a valid phone number');
      hasError = true;
    }

    const resolvedFacetime = getResolvedFaceTimeContact();
    if (resolvedFacetime) {
      const result = validateFaceTimeContact(resolvedFacetime);
      if (!result.valid) {
        setFacetimeError(result.error || 'Invalid FaceTime contact');
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

      if (trimmedPhone) {
        profileData.phone = trimmedPhone;
      }

      if (resolvedFacetime) {
        profileData.contactMethods = { facetime: resolvedFacetime };
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

  const chipStyle = (active: boolean) =>
    `px-4 py-2 rounded-full mr-2 ${active ? 'bg-primary' : 'bg-surface border border-ink-100'}`;

  const chipTextColor = (active: boolean) =>
    active ? 'text-white' : 'text-ink';

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

        {/* Auth email (read-only) */}
        {authEmail ? (
          <View className="mb-4">
            <Text variant="caption-medium" className="mb-1.5 text-ink">
              Email
            </Text>
            <View className="bg-ink-50 rounded-2xl px-4 py-4 border-3 border-ink-100">
              <Text variant="body" className="text-ink-400">
                {authEmail}
              </Text>
            </View>
          </View>
        ) : null}

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
          label="Phone Number"
          placeholder="+1 (555) 123-4567"
          value={phone}
          onChangeText={(t) => {
            setPhone(t);
            setPhoneError('');
          }}
          keyboardType="phone-pad"
          error={phoneError}
          className="mb-4"
        />

        {/* FaceTime selector */}
        <Text variant="caption-medium" className="mb-1.5 text-ink">
          FaceTime Contact
        </Text>
        <Text variant="footnote" className="text-ink-300 mb-2">
          How friends will FaceTime you
        </Text>
        <View className="flex-row mb-3">
          <Pressable
            className={chipStyle(facetimeSource === 'email')}
            onPress={() => { setFacetimeSource('email'); setFacetimeError(''); }}
          >
            <Text variant="caption-medium" className={chipTextColor(facetimeSource === 'email')}>
              Email
            </Text>
          </Pressable>
          <Pressable
            className={chipStyle(facetimeSource === 'phone')}
            onPress={() => { setFacetimeSource('phone'); setFacetimeError(''); }}
          >
            <Text variant="caption-medium" className={chipTextColor(facetimeSource === 'phone')}>
              Phone
            </Text>
          </Pressable>
          <Pressable
            className={chipStyle(facetimeSource === 'other')}
            onPress={() => { setFacetimeSource('other'); setFacetimeError(''); }}
          >
            <Text variant="caption-medium" className={chipTextColor(facetimeSource === 'other')}>
              Other
            </Text>
          </Pressable>
        </View>

        {facetimeSource === 'email' && authEmail ? (
          <View className="bg-ink-50 rounded-2xl px-4 py-4 border-3 border-ink-100 mb-1">
            <Text variant="body" className="text-ink-400">
              {authEmail}
            </Text>
          </View>
        ) : facetimeSource === 'phone' ? (
          <View className="bg-ink-50 rounded-2xl px-4 py-4 border-3 border-ink-100 mb-1">
            <Text variant="body" className={phone.trim() ? 'text-ink-400' : 'text-ink-300'}>
              {phone.trim() || 'Enter a phone number above first'}
            </Text>
          </View>
        ) : (
          <Input
            placeholder="email or phone number"
            value={facetimeCustom}
            onChangeText={(t) => {
              setFacetimeCustom(t);
              setFacetimeError('');
            }}
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-1"
          />
        )}
        {facetimeError ? (
          <Text variant="footnote" className="mt-1 text-error mb-4">
            {facetimeError}
          </Text>
        ) : (
          <View className="mb-4" />
        )}

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
