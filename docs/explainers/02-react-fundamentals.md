# React Fundamentals

React is a library for building user interfaces. If Python functions return values, React components are functions that return *UI descriptions*. This doc covers the core concepts using real HereNow code.

## Components = Functions That Return UI

In Python, you might build a string representation of something:

```python
# Python — returning a description of UI
def avatar(name, size=44):
    initials = "".join(word[0] for word in name.split()).upper()[:2]
    return f'<circle size="{size}">{initials}</circle>'
```

In React, you return JSX — an HTML-like syntax that describes UI:

```typescript
// From src/components/Avatar.tsx:13-58 (simplified)
export function Avatar({ photoUrl, name, size = 44 }: AvatarProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View style={{ width: size, height: size, borderRadius: size / 2 }}>
      <Text style={{ fontSize: size * 0.4 }}>{initials || '?'}</Text>
    </View>
  );
}
```

**Key insight:** The component doesn't *draw* anything — it returns a *description* of what the UI should look like. React takes that description and actually renders it on screen.

## JSX Syntax

JSX looks like HTML but lives inside your TypeScript/JavaScript. Here's how to read it:

```typescript
// Curly braces {} = "switch to JavaScript expression mode"
<Text variant="h2">{friend.displayName}</Text>
//                   ↑ JS expression ↑    ← evaluates the variable

// Attributes use either strings or expressions
<Avatar size={48} name="Blake" />
//      ↑ number   ↑ string

// Self-closing tags (no children)
<View className="flex-1" />

// Nested children
<View className="flex-row">
  <Avatar name="Blake" />
  <Text>Hello</Text>
</View>
```

## Props = Function Arguments

In Python, you pass arguments to functions. In React, you pass **props** to components:

```typescript
// Defining a component with props
// From src/components/FriendRow.tsx:7-13
interface FriendRowProps {
  name: string;                        // required
  photoUrl: string | null | undefined; // required (but can be null)
  lastConnectedText?: string;          // optional (the ?)
  isOnline?: boolean;                  // optional
  onPress?: () => void;               // optional callback function
}

export function FriendRow({
  name,
  photoUrl,
  lastConnectedText,
  isOnline,
  onPress,
}: FriendRowProps) {
  return (
    <Pressable onPress={onPress}>
      <Avatar photoUrl={photoUrl} name={name} size={40} />
      <Text>{name}</Text>
      {lastConnectedText ? (
        <Text>{lastConnectedText}</Text>
      ) : null}
    </Pressable>
  );
}

// Using it (from app/(tabs)/index.tsx:385-393)
<FriendRow
  key={friend.friendId}
  name={profile?.displayName || 'User'}
  photoUrl={profile?.photoUrl}
  lastConnectedText={getLastConnectedText(friend)}
  isOnline={onlineFriendIds.has(friend.friendId)}
  onPress={() => setSelectedFriend(friend)}
/>
```

**Python analogy:** Props are just named function arguments with types.

## useState — Mutable State

In Python, you just reassign variables. In React, you can't — you need `useState`:

```python
# Python — just change the variable
count = 0
count = count + 1  # done
```

```typescript
// React — useState returns [currentValue, setterFunction]
const [count, setCount] = useState(0);
// count = 0 initially
// To change it:
setCount(count + 1);
// This tells React: "the value changed, please re-render the component"
```

**Why can't you just reassign?** React needs to know when data changes so it can update the screen. `setCount` is both "change the value" AND "trigger a re-render."

Real examples from the codebase:

```typescript
// From app/(tabs)/index.tsx:69-74
const [showDurationPicker, setShowDurationPicker] = useState(false);
const [showRequestsSheet, setShowRequestsSheet] = useState(false);
const [selectedFriend, setSelectedFriend] = useState<FriendRecord | null>(null);
const [searchQuery, setSearchQuery] = useState('');

// Toggle showing duration picker:
setShowDurationPicker(true);   // opens it
setShowDurationPicker(false);  // closes it

// Set selected friend (or clear it):
setSelectedFriend(friend);     // select a friend
setSelectedFriend(null);       // deselect
```

## useEffect — Side Effects (Setup & Teardown)

`useEffect` runs code *after* the component renders. Think of it like Python's context manager (`with` statement) — it can set things up and tear them down:

```python
# Python context manager
class subscription:
    def __enter__(self):
        self.conn = database.subscribe()  # setup
        return self.conn
    def __exit__(self, *args):
        self.conn.unsubscribe()  # teardown
```

```typescript
// useEffect equivalent — from src/hooks/useFriends.ts:11-32
useEffect(() => {
  if (!userId) return;

  // SETUP: subscribe to real-time friend updates
  const unsubscribe = subscribeFriends(userId, async (friendRecords) => {
    setFriends(friendRecords);
    // ... fetch profiles ...
  });

  // TEARDOWN: return a cleanup function (runs when component unmounts)
  return unsubscribe;
}, [userId]);  // ← dependency array: re-run when userId changes
```

The **dependency array** `[userId]` controls when the effect re-runs:
- `[userId]` — re-run when `userId` changes
- `[]` — run once when the component first appears (mount)
- No array — run after every render (rarely used)

More examples:

```typescript
// From app/(tabs)/index.tsx:77-82 — network listener
useEffect(() => {
  const unsubscribe = NetInfo.addEventListener((state) => {
    setIsConnected(state.isConnected ?? true);
  });
  return () => unsubscribe();  // cleanup
}, []);  // empty array = run once on mount

// From src/hooks/useAvailability.ts:24-44 — countdown timer
useEffect(() => {
  if (!availability) {
    setTimeRemaining(0);
    return;  // no cleanup needed
  }

  const update = () => {
    const remaining = Math.max(
      0,
      Math.floor((availability.availableUntil.getTime() - Date.now()) / 1000)
    );
    setTimeRemaining(remaining);
  };

  update();  // run immediately
  const interval = setInterval(update, 1000);  // then every second
  return () => clearInterval(interval);  // cleanup: stop the timer
}, [availability, userId]);  // re-run when availability changes
```

## Conditional Rendering

In Python, you use `if/else` to decide what to return. In JSX, you use JavaScript expressions:

```typescript
// Pattern 1: Ternary (if/else)
// From src/components/AvailableFriendCard.tsx:56-64
{isBusy ? (
  <Text>In a conversation</Text>
) : (
  <Text>Available for {timeLeft}</Text>
)}

// Pattern 2: && (if, no else)
// From app/(tabs)/index.tsx:231-233
{hasPendingRequests && (
  <View className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-error" />
)}
// Shows the red dot ONLY if there are pending requests

// Pattern 3: Longer if/else with separate return statements
// From app/(tabs)/index.tsx:312-505
{isAvailable ? (
  // ─── ONLINE STATE ───
  <View>...</View>
) : (
  // ─── OFFLINE STATE ───
  <View>...</View>
)}
```

## Rendering Lists with .map()

Where Python uses list comprehensions or for loops, React uses `.map()`:

```python
# Python
html = "".join(f"<li>{item.name}</li>" for item in items)
```

```typescript
// React — from src/components/DurationPicker.tsx:22-28
<View className="flex-row flex-wrap justify-center gap-3">
  {DURATION_OPTIONS.map((opt) => (
    <Chip
      key={opt.minutes}        // ← required: unique ID for each item
      label={opt.label}
      onPress={() => onSelect(opt.minutes)}
    />
  ))}
</View>
```

**Important:** Every item in a list needs a `key` prop — a unique identifier so React can efficiently track which items changed, were added, or removed.

```typescript
// From app/(tabs)/index.tsx:341-343
{filteredAvailableFriends.map((friend) => (
  <AvailableFriendCard key={friend.userId} friend={friend} />
))}
```

## useMemo — Cached Computations

`useMemo` is like Python's `@functools.lru_cache` — it remembers the result of an expensive computation and only recalculates when its inputs change:

```typescript
// From app/(tabs)/index.tsx:54-57
const friendIds = useMemo(
  () => acceptedFriends.map((f) => f.friendId),
  [acceptedFriends]  // only recompute when acceptedFriends changes
);

// From app/(tabs)/index.tsx:111-114
const onlineFriendIds = useMemo(
  () => new Set(availableFriends.map((f) => f.userId)),
  [availableFriends]
);

// From app/(tabs)/index.tsx:116-119
const sortedFriends = useMemo(
  () => sortByPriority(acceptedFriends),
  [acceptedFriends]
);
```

Without `useMemo`, these computations would run on *every single render*, even if `acceptedFriends` hasn't changed.

## useCallback — Stable Function References

`useCallback` memoizes a function definition (not its result). This prevents unnecessary re-renders of child components:

```typescript
// From src/hooks/useAvailability.ts:46-52
const goAvailable = useCallback(
  async (durationMinutes: number) => {
    if (!userId) return;
    await setAvailable(userId, durationMinutes);
  },
  [userId]  // only create a new function when userId changes
);
```

## Context — Global State

Sometimes many components need the same data (like "who is logged in?"). Instead of passing it through every component, you create a **Context**:

```typescript
// STEP 1: Create the context (src/hooks/useAuth.tsx:7-12)
interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType>({ ... });

// STEP 2: Create a Provider that wraps the app (src/hooks/useAuth.tsx:21-58)
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  // ... manage auth state ...
  return (
    <AuthContext.Provider value={{ firebaseUser, userProfile, loading, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

// STEP 3: Wrap the app in the Provider (app/_layout.tsx:6-18)
export default function RootLayout() {
  return (
    <AuthProvider>
      <AddFriendModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="login" />
        </Stack>
      </AddFriendModalProvider>
    </AuthProvider>
  );
}

// STEP 4: Use it from any component (src/hooks/useAuth.tsx:61-63)
export function useAuth() {
  return useContext(AuthContext);
}

// STEP 5: Any screen can now access auth state:
// From app/(tabs)/index.tsx:46
const { firebaseUser } = useAuth();
```

**Python analogy:** Context is like a global variable, but scoped — only components inside the Provider can access it. It's similar to Flask's `g` object or dependency injection.

## The Component Lifecycle (Mental Model)

```
1. Component function runs → returns JSX → React renders it on screen
2. useEffect runs (after render)
3. User interacts (taps a button)
4. State changes (via setState)
5. Component function runs AGAIN with new state → returns new JSX
6. React compares old and new JSX, updates only what changed
7. useEffect runs again (if dependencies changed)
8. Repeat from step 3...

When component is removed from screen:
9. useEffect cleanup functions run
```

This is called the **render cycle**. It's why you can't just reassign variables — React needs to re-run your component function to produce new UI.

## Going Deeper

- [React docs — Quick Start](https://react.dev/learn) — official interactive tutorial
- [Thinking in React](https://react.dev/learn/thinking-in-react) — how to design React apps
- [React hooks reference](https://react.dev/reference/react/hooks) — all hooks explained

Next: **[React Native & Expo](./03-react-native-and-expo.md)** — how React becomes a mobile app.
