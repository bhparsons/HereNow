import React, { useState } from 'react';
import {
  View,
  Switch,
  Alert,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken, uploadProfilePhoto } from '../../src/services/users';
import { signOut } from '../../src/services/auth';
import { Avatar } from '../../src/components/Avatar';
import { Input } from '../../src/components/ui/Input';
import { Button } from '../../src/components/ui/Button';
import { Text } from '../../src/components/ui/Text';
import { colors } from '../../src/theme/tokens';
import { isValidPhoneNumber, validateFaceTimeContact } from '../../src/utils/validation';

type FaceTimeSource = 'email' | 'phone' | 'other';

function inferFacetimeSource(
  facetime: string | undefined,
  authEmail: string,
  phone: string
): { source: FaceTimeSource; custom: string } {
  if (!facetime) return { source: 'email', custom: '' };
  if (facetime === authEmail) return { source: 'email', custom: '' };
  if (facetime === phone && phone) return { source: 'phone', custom: '' };
  return { source: 'other', custom: facetime };
}

export default function ProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const authEmail = firebaseUser?.email || '';
  const existingFacetime = userProfile?.contactMethods?.facetime || '';
  const existingPhone = userProfile?.phone || userProfile?.contactMethods?.phone || '';

  const inferred = inferFacetimeSource(existingFacetime, authEmail, existingPhone);

  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [isPublic, setIsPublic] = useState(userProfile?.isPublic ?? true);
  const [phone, setPhone] = useState(existingPhone);
  const [facetimeSource, setFacetimeSource] = useState<FaceTimeSource>(inferred.source);
  const [facetimeCustom, setFacetimeCustom] = useState(inferred.custom);
  const [phoneError, setPhoneError] = useState('');
  const [facetimeError, setFacetimeError] = useState('');
  const [saving, setSaving] = useState(false);

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
    if (!firebaseUser || !userProfile) return;

    setPhoneError('');
    setFacetimeError('');

    const trimmedUsername = username.trim().toLowerCase();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      Alert.alert('Error', 'Username must be at least 3 characters');
      return;
    }
    if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
      Alert.alert('Error', 'Username can only contain letters, numbers, and underscores');
      return;
    }

    let hasError = false;

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
      setSaving(true);

      if (trimmedUsername !== userProfile.username) {
        const taken = await isUsernameTaken(trimmedUsername, firebaseUser.uid);
        if (taken) {
          Alert.alert('Error', 'That username is already taken');
          return;
        }
      }

      // Build contact methods (only include non-empty values)
      const contactMethods: { phone?: string; facetime?: string } = {};
      if (trimmedPhone) contactMethods.phone = trimmedPhone;
      if (resolvedFacetime) contactMethods.facetime = resolvedFacetime;

      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
        isPublic,
        phone: trimmedPhone || undefined,
        contactMethods: Object.keys(contactMethods).length > 0 ? contactMethods : undefined,
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
      try {
        const downloadUrl = await uploadProfilePhoto(
          firebaseUser.uid,
          result.assets[0].uri
        );
        await updateUserProfile(firebaseUser.uid, {
          photoUrl: downloadUrl,
        });
        await refreshProfile();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to upload photo');
      }
    }
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const chipStyle = (active: boolean) =>
    `px-4 py-2 rounded-full mr-2 ${active ? 'bg-primary' : 'bg-surface border border-ink-100'}`;

  const chipTextColor = (active: boolean) =>
    active ? 'text-white' : 'text-ink';

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Photo picker hidden -- re-enable by uncommenting below
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
          */}

          {/* Auth email (read-only) */}
          {authEmail ? (
            <View className="mb-3">
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
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            className="mb-3"
          />

          <Input
            label="Username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            className="mb-2"
          />

          <View className="flex-row justify-between items-center py-2">
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

          {/* Contact Methods */}
          <Text variant="section-header" className="mt-4 mb-1">
            Contact Methods
          </Text>
          <Text variant="footnote" className="text-ink-300 mb-3">
            Let friends call you directly when you are online
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
            className="mb-3"
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

          {/* Actions */}
          <Button
            variant="primary"
            label={saving ? 'Saving...' : 'Save Changes'}
            onPress={handleSave}
            disabled={saving}
            fullWidth
          />

          <Pressable className="mt-3 items-center py-2" onPress={handleSignOut}>
            <Text variant="body" className="text-error">Sign Out</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
