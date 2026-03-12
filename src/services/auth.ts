import {
  signInWithCredential,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  OAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { auth } from '../config/firebase';
import { createUserProfile, getUserProfile } from './users';

// Lazy-load GoogleSignin so the app doesn't crash in Expo Go (no native module)
let GoogleSignin: typeof import('@react-native-google-signin/google-signin').GoogleSignin | null = null;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  // webClientId: Web Client ID from Google Cloud Console → Credentials → OAuth 2.0 Client IDs
  // iosClientId: iOS Client ID from GoogleService-Info.plist (fallback if plist lookup fails)
  GoogleSignin?.configure({
    webClientId: '146322120768-47sourlsopevn2vq0furnl36khr74r99.apps.googleusercontent.com',
    iosClientId: '146322120768-47sourlsopevn2vq0furnl36khr74r99.apps.googleusercontent.com',
  });
} catch {
  // Native module not available (e.g. Expo Go) — Google Sign-In will be unavailable
}

export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function signInWithApple(): Promise<FirebaseUser> {
  const nonce = Math.random().toString(36).substring(2, 10);
  const hashedNonce = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  const oauthCredential = new OAuthProvider('apple.com').credential({
    idToken: credential.identityToken!,
    rawNonce: nonce,
  });

  let result;
  try {
    result = await signInWithCredential(auth, oauthCredential);
  } catch (error) {
    handleAuthError(error);
  }

  // Create profile if new user
  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    const fullName = credential.fullName;
    const displayName = fullName
      ? `${fullName.givenName || ''} ${fullName.familyName || ''}`.trim()
      : 'User';
    await createUserProfile(result.user.uid, {
      displayName,
      username: '',
      photoUrl: result.user.photoURL,
    });
  }

  return result.user;
}

export async function signInWithGoogle(): Promise<FirebaseUser> {
  if (!GoogleSignin) {
    throw new Error('Google Sign-In is not available. A development build is required.');
  }
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  if (!response.data?.idToken) {
    throw new Error('Google Sign-In failed: no ID token returned');
  }

  const credential = GoogleAuthProvider.credential(response.data.idToken);

  let result;
  try {
    result = await signInWithCredential(auth, credential);
  } catch (error) {
    handleAuthError(error);
  }

  // Create profile if new user
  const existing = await getUserProfile(result.user.uid);
  if (!existing) {
    await createUserProfile(result.user.uid, {
      displayName: result.user.displayName || 'User',
      username: '',
      photoUrl: result.user.photoURL,
    });
  }

  return result.user;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(result.user.uid, {
    displayName,
    username: '',
    photoUrl: null,
  });
  return result.user;
}

export async function signInWithEmail(
  email: string,
  password: string
): Promise<FirebaseUser> {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

/**
 * Wrap auth errors to provide user-friendly messages for account linking conflicts.
 */
function handleAuthError(error: any): never {
  if (error?.code === 'auth/account-exists-with-different-credential') {
    throw new Error(
      'An account already exists with the same email address but a different sign-in method. ' +
      'Try signing in with the method you used originally (Apple, Google, or email).'
    );
  }
  throw error;
}
