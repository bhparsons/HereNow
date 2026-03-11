import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/hooks/useAuth';
import { colors } from '../src/theme/tokens';

export default function Index() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      router.replace('/login');
    } else if (!userProfile?.username) {
      router.replace('/setup-profile');
    } else {
      router.replace('/(tabs)');
    }
  }, [loading, firebaseUser, userProfile]);

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator size="large" color={colors.secondary.DEFAULT} />
    </View>
  );
}
