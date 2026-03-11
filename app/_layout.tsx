import '../global.css';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/hooks/useAuth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="setup-profile" />
        <Stack.Screen name="add-friend" options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }} />
      </Stack>
    </AuthProvider>
  );
}
