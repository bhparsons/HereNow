# React Native & Expo

This doc covers what makes HereNow a *mobile* app instead of a website, and how Expo simplifies the development experience.

## React Native vs React (Web)

React for the web renders HTML elements (`<div>`, `<span>`, `<input>`). React Native renders *native* mobile components:

| Web (React) | Mobile (React Native) | What it does |
|-------------|----------------------|--------------|
| `<div>` | `<View>` | Container/box |
| `<span>`, `<p>` | `<Text>` | Text display |
| `<input>` | `<TextInput>` | Text field |
| `<img>` | `<Image>` | Image display |
| `<button>` | `<Pressable>` | Tappable element |
| `<ul>` + `<li>` | `<FlatList>` or `<ScrollView>` | Scrollable list |
| CSS classes | `StyleSheet` or NativeWind | Styling |

```typescript
// Web React
<div className="container">
  <span>Hello</span>
  <img src="photo.jpg" />
</div>

// React Native (from src/components/FriendRow.tsx:23-61)
<Pressable className="flex-row items-center p-3 rounded-2xl mb-1.5">
  <View className="relative">
    <Avatar photoUrl={photoUrl} name={name} size={40} />
  </View>
  <View className="flex-1 ml-3">
    <Text variant="body-medium">{name}</Text>
  </View>
</Pressable>
```

**Key rule:** In React Native, ALL text must be inside a `<Text>` component. You can't just write text inside a `<View>` like you'd put text in a `<div>`.

## NativeWind / Tailwind CSS

Instead of writing style objects, HereNow uses **NativeWind** (Tailwind CSS for React Native). Class names describe styles:

```typescript
// Instead of this:
<View style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>

// You write this (from app/(tabs)/index.tsx:224):
<View className="flex-row items-center px-4 py-2">
```

Common Tailwind patterns you'll see in the codebase:

| Class | What it does | CSS equivalent |
|-------|-------------|----------------|
| `flex-1` | Take all available space | `flex: 1` |
| `flex-row` | Horizontal layout | `flex-direction: row` |
| `items-center` | Center items vertically | `align-items: center` |
| `justify-between` | Space items apart | `justify-content: space-between` |
| `p-4` | Padding all sides | `padding: 16px` |
| `px-4` | Padding left & right | `padding-left/right: 16px` |
| `mb-3` | Margin bottom | `margin-bottom: 12px` |
| `rounded-2xl` | Rounded corners | `border-radius: 16px` |
| `bg-background` | Background color | Uses theme color |
| `text-ink-400` | Text color | Uses theme color |
| `w-full` | Full width | `width: 100%` |

Sometimes you need both Tailwind *and* style objects (when you need dynamic values):

```typescript
// From src/components/Avatar.tsx:28-33
<Image
  className="bg-ink-100"                    // Tailwind for static styles
  style={{
    width: size,                            // style prop for dynamic values
    height: size,
    borderRadius: size / 2,
    borderWidth: isOnline ? 3 : 0,
    borderColor: isOnline ? colors.available : 'transparent',
  }}
/>
```

## What is Expo?

Expo is a platform that sits on top of React Native. Think of it like this:

| Without Expo | With Expo |
|-------------|-----------|
| Manual Xcode/Android Studio setup | `npx expo start` |
| Build native code yourself | Expo builds for you |
| Implement push notifications from scratch | `expo-notifications` |
| Write platform-specific camera code | `expo-camera` |
| Manual code signing for App Store | `eas build` handles it |

HereNow uses these Expo packages (from `package.json`):

```
expo-router          → File-based navigation
expo-notifications   → Push notifications
expo-haptics         → Vibration feedback on button taps
expo-camera          → QR code scanning (Add Friend)
expo-image-picker    → Profile photo selection
expo-clipboard       → Copy friend link to clipboard
expo-linking         → Deep links (herenow://friend/jane)
expo-apple-authentication → Apple Sign-In
expo-status-bar      → Status bar appearance
```

## Expo Router: File-Based Navigation

The file structure *is* the navigation structure. No route configuration needed:

```
app/
├── _layout.tsx          → Root layout (wraps everything)
├── index.tsx            → "/" route (entry point)
├── login.tsx            → "/login" route
├── setup-profile.tsx    → "/setup-profile" route
├── (tabs)/              → Tab group (parentheses = layout group)
│   ├── _layout.tsx      → Tab bar configuration
│   ├── index.tsx        → Home tab
│   └── profile.tsx      → Profile tab
└── friend/
    └── [username].tsx   → "/friend/jane" (dynamic route)
```

**Python analogy:** This is like Flask's file-based blueprints or FastAPI's router, but the file system *is* the router.

### How `_layout.tsx` Works

Layout files wrap their sibling routes. The root `_layout.tsx` wraps the entire app:

```typescript
// app/_layout.tsx — the root layout
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/hooks/useAuth';
import { AddFriendModalProvider } from '../src/contexts/AddFriendModalContext';

export default function RootLayout() {
  return (
    <AuthProvider>                          {/* Auth available everywhere */}
      <AddFriendModalProvider>              {/* Add friend modal anywhere */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />    {/* Tab screens */}
          <Stack.Screen name="login" />     {/* Login screen */}
          <Stack.Screen name="setup-profile" />
        </Stack>
      </AddFriendModalProvider>
    </AuthProvider>
  );
}
```

`Stack` means screens stack on top of each other (like a deck of cards). When you navigate to login, it slides on top.

### Tab Navigation

The `(tabs)` folder creates a tab bar at the bottom of the screen:

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../src/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary.DEFAULT,
        tabBarInactiveTintColor: colors.ink[400],
        tabBarStyle: { backgroundColor: colors.surface },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Dynamic Routes with `[param]`

Square brackets in filenames create dynamic routes:

```typescript
// app/friend/[username].tsx — handles /friend/jane, /friend/bob, etc.
import { useLocalSearchParams } from 'expo-router';

export default function FriendDeepLink() {
  const { username } = useLocalSearchParams<{ username: string }>();
  // username = "jane" when visiting /friend/jane

  // ... look up user by username, show add friend UI ...
}
```

### Programmatic Navigation

```typescript
// From app/index.tsx:11-21
import { useRouter } from 'expo-router';

const router = useRouter();

// Replace current screen (no back button)
router.replace('/login');
router.replace('/(tabs)');

// Push onto stack (can go back)
router.push(`/friend/${match[1]}`);
```

## Platform-Specific Code

Sometimes iOS and Android need different handling:

```typescript
// From app/login.tsx:82 — KeyboardAvoidingView behavior differs
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
>

// From app/login.tsx:105 — Apple Sign-In is iOS only
{Platform.OS === 'ios' && (
  <Pressable onPress={handleAppleSignIn}>
    <Text>Continue with Apple</Text>
  </Pressable>
)}

// From src/services/notifications.ts:36-40 — Android notification channel
if (Platform.OS === 'android') {
  await Notifications.setNotificationChannelAsync('default', {
    name: 'default',
    importance: Notifications.AndroidImportance.MAX,
  });
}
```

## SafeAreaView

Mobile screens have notches, status bars, and home indicators that can cover your content. `SafeAreaView` adds automatic padding to avoid them:

```typescript
// From app/(tabs)/index.tsx:204-205
import { SafeAreaView } from 'react-native-safe-area-context';

return (
  <SafeAreaView className="flex-1 bg-background">
    {/* Content is safe from notches and status bars */}
  </SafeAreaView>
);
```

## Animations with Reanimated

HereNow uses `react-native-reanimated` for smooth animations. The key concepts:

```typescript
// From src/components/ui/Button.tsx:59-71
// 1. Create a "shared value" (like state, but for animations)
const scale = useSharedValue(1);

// 2. Create an animated style based on that value
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ scale: scale.value }],
}));

// 3. Change the value with an animation
const handlePressIn = () => {
  scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
};

// 4. Apply the style to an Animated component
<AnimatedPressable style={animatedStyle} onPressIn={handlePressIn}>
```

The pulsing green dot when you're online:

```typescript
// From app/(tabs)/index.tsx:85-100
const pulseOpacity = useSharedValue(1);

useEffect(() => {
  if (!isAvailable) return;
  pulseOpacity.value = withRepeat(
    withTiming(0.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
    -1,    // repeat forever
    true   // reverse (pulse in and out)
  );
  return () => { pulseOpacity.value = 1; };
}, [isAvailable]);

const pulseStyle = useAnimatedStyle(() => ({
  opacity: pulseOpacity.value,
}));
```

## Haptic Feedback

Mobile apps give physical feedback through vibration:

```typescript
// From app/(tabs)/index.tsx:168
import * as Haptics from 'expo-haptics';

const handleGoOnlinePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  // phone vibrates!
  setShowDurationPicker(true);
};

// From src/components/ui/Button.tsx:74-76
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

// From src/components/ui/Chip.tsx:31
Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

Three intensities: `Light`, `Medium`, `Heavy` — used for different interactions.

## The Design System (`src/components/ui/`)

HereNow has a small design system of reusable components:

| Component | Purpose | Used for |
|-----------|---------|----------|
| `Text` | Typography with variants | All text in the app |
| `Button` | Animated button with haptics | Primary actions |
| `Chip` | Pill-shaped option | Duration selectors, frequency goals |
| `Input` | Styled text field | Login, profile forms |
| `Sheet` | Bottom modal | Duration picker, friend settings |
| `Card` | Glass-morphism container | Content cards |
| `Badge` | Status indicator | "Online", "Busy" labels |
| `IconButton` | Icon-only button | Notification bell |

The `Text` component shows how the variant system works:

```typescript
// From src/components/ui/Text.tsx
type TextVariant = 'hero' | 'h1' | 'h2' | 'h3' | 'body' | 'body-medium'
  | 'caption' | 'caption-medium' | 'footnote' | 'button' | 'button-small'
  | 'section-header';

// Each variant maps to Tailwind classes:
const variantClasses: Record<TextVariant, string> = {
  hero: 'text-hero text-ink',
  h1: 'text-h1 text-ink',
  body: 'text-body text-ink',
  caption: 'text-caption text-ink-400',
  'section-header': 'text-button-small uppercase tracking-wider text-ink-400',
  // ...
};

// Usage — you just pick a variant:
<Text variant="h2">Go Online</Text>
<Text variant="caption" className="text-ink-300">Last connected 3d ago</Text>
```

## Theme Tokens

All colors live in one file (`src/theme/tokens.ts`):

```typescript
export const colors = {
  primary: { DEFAULT: '#6366F1', 700: '#4338CA', ... },  // Indigo
  secondary: { DEFAULT: '#14B8A6', ... },                 // Teal
  available: '#10B981',                                    // Green
  busy: '#F59E0B',                                         // Amber
  error: '#EF4444',                                        // Red
  ink: { DEFAULT: '#0F172A', 300: '#94A3B8', ... },       // Grays for text
  surface: '#FFFFFF',                                      // White
  background: '#F8FAFC',                                   // Light gray
  glass: { card: 'rgba(255, 255, 255, 0.85)', ... },     // Translucent
};
```

This is the single source of truth — both Tailwind config and style props reference these values.

## Going Deeper

- [React Native docs](https://reactnative.dev/docs/getting-started) — core component reference
- [Expo docs](https://docs.expo.dev/) — Expo-specific features and APIs
- [Expo Router docs](https://docs.expo.dev/router/introduction/) — file-based routing
- [NativeWind docs](https://www.nativewind.dev/) — Tailwind for React Native

Next: **[Firebase & Data](./04-firebase-and-data.md)** — the database and backend.
