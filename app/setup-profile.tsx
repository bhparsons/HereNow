import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, Alert, Pressable, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../src/hooks/useAuth';
import { updateUserProfile, isUsernameTaken, uploadProfilePhoto } from '../src/services/users';
import { Avatar } from '../src/components/Avatar';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { Text } from '../src/components/ui/Text';

export default function SetupProfileScreen() {
  const { firebaseUser, userProfile, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
  const [username, setUsername] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [phone, setPhone] = useState('');
  const [facetime, setFacetime] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

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

      // Upload photo to Firebase Storage if one was selected
      let photoUrl: string | null = null;
      if (photoUri) {
        photoUrl = await uploadProfilePhoto(firebaseUser.uid, photoUri);
      }

      // Build contact methods (only include non-empty values)
      const contactMethods: { phone?: string; facetime?: string; whatsapp?: string } = {};
      if (phone.trim()) contactMethods.phone = phone.trim();
      if (facetime.trim()) contactMethods.facetime = facetime.trim();
      if (whatsapp.trim()) contactMethods.whatsapp = whatsapp.trim();

      const profileData: Record<string, any> = {
        displayName: displayName.trim() || 'User',
        username: trimmedUsername,
      };

      if (photoUrl) {
        profileData.photoUrl = photoUrl;
      }

      if (Object.keys(contactMethods).length > 0) {
        profileData.contactMethods = contactMethods;
      }

      await updateUserProfile(firebaseUser.uid, profileData);
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
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="h1" className="mb-2">
          Set Up Your Profile
        </Text>
        <Text variant="body" className="text-ink-400 mb-6">
          Choose a display name and username
        </Text>

        {/* Profile Photo */}
        <Pressable className="items-center mb-6" onPress={handlePickPhoto}>
          <Avatar
            photoUrl={photoUri}
            name={displayName || 'User'}
            size={80}
          />
          <Text variant="caption" className="text-secondary mt-2">
            {photoUri ? 'Change Photo' : 'Add Photo'}
          </Text>
        </Pressable>

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
        <Text variant="footnote" className="text-ink-300 mt-1 mb-4">
          Friends can find you with this username
        </Text>

        {/* Contact Methods */}
        <Text variant="section-header" className="mt-2 mb-2">
          Contact Methods (Optional)
        </Text>
        <Text variant="footnote" className="text-ink-300 mb-3">
          Let friends call you directly when you are online
        </Text>

        <Input
          label="Phone Number"
          placeholder="+1234567890"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          className="mb-3"
        />

        <Input
          label="FaceTime"
          placeholder="email or phone"
          value={facetime}
          onChangeText={setFacetime}
          autoCapitalize="none"
          keyboardType="email-address"
          className="mb-3"
        />

        <Input
          label="WhatsApp Number"
          placeholder="+1234567890"
          value={whatsapp}
          onChangeText={setWhatsapp}
          keyboardType="phone-pad"
          className="mb-4"
        />

        <Button
          variant="primary"
          size="lg"
          label={loading ? 'Saving...' : 'Continue'}
          onPress={handleSave}
          disabled={loading}
          fullWidth
          className="mt-4"
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
