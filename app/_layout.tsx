import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from '../src/hooks/useAuth';

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // Handle notifications received while app is in foreground
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      // Foreground notifications are shown via the notification handler in notifications.ts
      console.log('Foreground notification:', notification.request.content.title);
    });

    // Handle notification taps (foreground or background)
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === 'availability') {
        // Navigate to home tab when tapping an availability notification
        router.replace('/(tabs)');
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

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
