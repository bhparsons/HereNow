import React, { useState } from 'react';
import {
  View,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signInWithApple, signInWithGoogle, signUpWithEmail, signInWithEmail } from '../src/services/auth';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Text } from '../src/components/ui/Text';
import { colors } from '../src/theme/tokens';
import { getFriendlyAuthError, validateEmail, validatePassword } from '../src/utils/authErrors';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [nameError, setNameError] = useState('');

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (error: any) {
      if (error.code !== 'SIGN_IN_CANCELLED') {
        const { message } = getFriendlyAuthError(error);
        Alert.alert('Google Sign-In Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      setLoading(true);
      await signInWithApple();
    } catch (error: any) {
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        const { message } = getFriendlyAuthError(error);
        Alert.alert('Apple Sign-In Error', message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    // Clear previous errors
    setEmailError('');
    setPasswordError('');
    setNameError('');

    const emailErr = validateEmail(email);
    const passwordErr = validatePassword(password, isSignUp);
    const nameErr = isSignUp && !displayName.trim() ? 'Please enter your name.' : null;

    if (emailErr) setEmailError(emailErr);
    if (passwordErr) setPasswordError(passwordErr);
    if (nameErr) setNameError(nameErr);

    if (emailErr || passwordErr || nameErr) return;

    try {
      setLoading(true);
      if (isSignUp) {
        await signUpWithEmail(email, password, displayName);
      } else {
        await signInWithEmail(email, password);
      }
      router.replace('/');
    } catch (error: any) {
      const { message, field } = getFriendlyAuthError(error);
      if (field === 'email') {
        setEmailError(message);
      } else if (field === 'password') {
        setPasswordError(message);
      } else {
        Alert.alert('Sign In Error', message);
      }
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
        <View className="items-center mb-10">
          <Text variant="hero" className="text-secondary">
            HereNow
          </Text>
          <Text variant="body" className="text-ink-400 mt-2 text-center">
            Connect with friends who are free right now
          </Text>
        </View>

        <View className="gap-3">
          <Pressable
            className={`flex-row items-center justify-center h-[50px] rounded-2xl bg-surface border-3 border-ink-100 ${loading ? 'opacity-50' : ''}`}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Text variant="body-medium" className="text-[#4285F4] mr-2.5">G</Text>
            <Text variant="button" className="text-ink">Continue with Google</Text>
          </Pressable>

          {Platform.OS === 'ios' && (
            <Pressable
              className={`flex-row items-center justify-center h-[50px] rounded-2xl bg-ink ${loading ? 'opacity-50' : ''}`}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-apple" size={20} color={colors.surface} style={{ marginRight: 10 }} />
              <Text variant="button" className="text-white">Continue with Apple</Text>
            </Pressable>
          )}
        </View>

        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-ink-100" />
          <Text variant="caption" className="mx-4 text-ink-300">or</Text>
          <View className="flex-1 h-px bg-ink-100" />
        </View>

        {isSignUp && (
          <Input
            placeholder="Your name"
            value={displayName}
            onChangeText={(t) => { setDisplayName(t); setNameError(''); }}
            autoCapitalize="words"
            error={nameError}
            className="mb-3"
          />
        )}

        <Input
          placeholder="Email"
          value={email}
          onChangeText={(t) => { setEmail(t); setEmailError(''); }}
          keyboardType="email-address"
          autoCapitalize="none"
          error={emailError}
          className="mb-3"
        />

        <Input
          placeholder="Password"
          value={password}
          onChangeText={(t) => { setPassword(t); setPasswordError(''); }}
          secureTextEntry
          error={passwordError}
          className="mb-2"
        />

        <Button
          variant="secondary"
          label={isSignUp ? 'Create Account' : 'Sign In'}
          onPress={handleEmailAuth}
          disabled={loading}
          fullWidth
          className="mt-2"
        />

        <Pressable className="mt-4 items-center" onPress={() => setIsSignUp(!isSignUp)}>
          <Text variant="caption" className="text-secondary">
            {isSignUp
              ? 'Already have an account? Sign In'
              : "Don't have an account? Sign Up"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
