import React, { useState } from 'react';
import {
  View,
  Switch,
  Alert,
  Pressable,
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

export default function ProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState(userProfile?.username || '');
  const [isPublic, setIsPublic] = useState(userProfile?.isPublic ?? true);
  const [phone, setPhone] = useState(userProfile?.contactMethods?.phone || '');
  const [facetime, setFacetime] = useState(userProfile?.contactMethods?.facetime || '');
  const [whatsapp, setWhatsapp] = useState(userProfile?.contactMethods?.whatsapp || '');
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

      // Build contact methods (only include non-empty values)
      const contactMethods: { phone?: string; facetime?: string; whatsapp?: string } = {};
      if (phone.trim()) contactMethods.phone = phone.trim();
      if (facetime.trim()) contactMethods.facetime = facetime.trim();
      if (whatsapp.trim()) contactMethods.whatsapp = whatsapp.trim();

      await updateUserProfile(firebaseUser.uid, {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
        isPublic,
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
        // Upload to Firebase Storage and get download URL
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 justify-between px-6 pt-5 pb-8">
        {/* Top: form fields */}
        <View>
          {/* Photo picker hidden — re-enable by uncommenting below
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

          {/* Phone & WhatsApp hidden — re-enable by uncommenting below
          <Input
            label="Phone Number"
            placeholder="+1234567890"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            className="mb-3"
          />
          */}

          <Input
            label="FaceTime"
            placeholder="email or phone"
            value={facetime}
            onChangeText={setFacetime}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          {/* Phone & WhatsApp hidden — re-enable by uncommenting below
          <Input
            label="WhatsApp Number"
            placeholder="+1234567890"
            value={whatsapp}
            onChangeText={setWhatsapp}
            keyboardType="phone-pad"
            className="mb-3"
          />
          */}
        </View>

        {/* Bottom: actions pinned to bottom */}
        <View>
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
        </View>
      </View>
    </SafeAreaView>
  );
}
