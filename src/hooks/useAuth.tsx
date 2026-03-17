import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { subscribeToAuthState } from '../services/auth';
import { getUserProfile } from '../services/users';
import { registerForPushNotifications } from '../services/notifications';
import { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  error: string | null;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = async () => {
    if (firebaseUser) {
      try {
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
      } catch (e: any) {
        setError(e.message || 'Failed to load profile');
      }
    }
  };

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      setLoading(true);
      setError(null);
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await getUserProfile(user.uid);
          setUserProfile(profile);
        } catch (e: any) {
          setError(e.message || 'Failed to load profile');
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Re-fetch profile when firebaseUser changes
  useEffect(() => {
    if (firebaseUser) {
      refreshProfile();
    }
  }, [firebaseUser?.uid]);

  // Register for push notifications when authenticated
  useEffect(() => {
    if (firebaseUser) {
      registerForPushNotifications(firebaseUser.uid).catch(console.error);
    }
  }, [firebaseUser?.uid]);

  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, error, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
