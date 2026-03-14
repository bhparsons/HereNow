# Tracing Features End-to-End

This doc walks through 4 complete features, following the code from the UI all the way to the database and back. Each trace shows exactly which files and lines are involved.

## Trace 1: User Signs Up

**Scenario:** A new user opens the app, signs in with email, and sets up their profile.

### Step 1: App entry point redirects to login

```
app/index.tsx:7-21
```

When the app opens, the root `Index` component checks auth state:

```typescript
export default function Index() {
  const { firebaseUser, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace('/login');           // Not logged in → login screen
    } else if (!userProfile?.username) {
      router.replace('/setup-profile');   // Logged in but no username → setup
    } else {
      router.replace('/(tabs)');          // All good → home tab
    }
  }, [loading, firebaseUser, userProfile]);
}
```

### Step 2: User fills in email/password on login screen

```
app/login.tsx:52-75
```

The login screen has a form with email, password, and optional display name (for signup). When "Create Account" is tapped:

```typescript
const handleEmailAuth = async () => {
  if (isSignUp) {
    await signUpWithEmail(email, password, displayName);  // → Step 3
  } else {
    await signInWithEmail(email, password);
  }
  router.replace('/');  // back to index.tsx which will re-evaluate
};
```

### Step 3: Firebase creates the account

```
src/services/auth.ts:98-110
```

```typescript
export async function signUpWithEmail(
  email: string, password: string, displayName: string
): Promise<FirebaseUser> {
  // Firebase Auth creates the account (email + password stored by Firebase)
  const result = await createUserWithEmailAndPassword(auth, email, password);

  // Create the Firestore profile document
  await createUserProfile(result.user.uid, {
    displayName,
    username: '',     // empty — will be set in setup-profile
    photoUrl: null,
  });
  return result.user;
}
```

### Step 4: Auth state listener fires

```
src/hooks/useAuth.tsx:33-45
```

When Firebase Auth state changes (user logged in), the `AuthProvider` listener fires:

```typescript
useEffect(() => {
  const unsubscribe = subscribeToAuthState(async (user) => {
    setFirebaseUser(user);           // triggers re-render
    if (user) {
      const profile = await getUserProfile(user.uid);  // fetch profile
      setUserProfile(profile);       // username is "" → triggers setup-profile redirect
    }
    setLoading(false);
  });
  return unsubscribe;
}, []);
```

### Step 5: Redirect to setup-profile (username is empty)

```
app/index.tsx:16
```

Back in `Index`, since `userProfile.username` is empty, the user is redirected to `/setup-profile`.

### Step 6: User chooses a username

```
app/setup-profile.tsx:15-46
```

```typescript
const handleSave = async () => {
  const trimmedUsername = username.trim().toLowerCase();

  // Validation
  if (trimmedUsername.length < 3) { Alert.alert(...); return; }
  if (!/^[a-z0-9_]+$/.test(trimmedUsername)) { Alert.alert(...); return; }

  // Check uniqueness
  const taken = await isUsernameTaken(trimmedUsername, firebaseUser.uid);
  if (taken) { Alert.alert('Error', 'That username is already taken'); return; }

  // Save to Firestore
  await updateUserProfile(firebaseUser.uid, {
    displayName: displayName.trim() || 'User',
    username: trimmedUsername,
  });

  await refreshProfile();  // re-fetch profile → triggers redirect to home
};
```

### Step 7: `refreshProfile` updates context, redirect to home

```
src/hooks/useAuth.tsx:26-31 → app/index.tsx:19
```

`refreshProfile()` re-fetches the user profile. Now `userProfile.username` exists, so `Index` redirects to `/(tabs)` — the home screen.

**Complete flow:**
```
app opens → Index → no user → /login → signUpWithEmail → auth.ts →
Firebase Auth + Firestore profile → auth listener fires → Index →
has user, no username → /setup-profile → save username →
refreshProfile → Index → has user + username → /(tabs) 🏠
```

---

## Trace 2: Sending a Friend Request

**Scenario:** User searches for a friend by username and sends a request.

### Step 1: User taps "Add Friend" button

```
app/(tabs)/index.tsx:403-408
```

```typescript
<Button
  variant="outline"
  label="+ Add Friend"
  onPress={showAddFriend}   // opens the AddFriendSheet modal
  fullWidth
/>
```

`showAddFriend` comes from `useAddFriendModal()` context, which was set up in `src/contexts/AddFriendModalContext.tsx:16-27`.

### Step 2: AddFriendSheet opens with three tabs

```
src/components/AddFriendSheet.tsx:33-274
```

The sheet has tabs: Share (QR code), Scan (camera), Search (username). User goes to Search tab.

### Step 3: User types username and taps "Search"

```
src/components/AddFriendSheet.tsx:75-96
```

```typescript
const handleSearch = async () => {
  const query = searchQuery.trim().toLowerCase();
  const user = await findUserByUsername(query);  // → Step 4
  if (!user) {
    Alert.alert('Not Found', `No user with username "${query}"`);
  } else if (user.uid === firebaseUser?.uid) {
    Alert.alert('Oops', "That's you!");
  } else {
    setSearchResult(user);  // show the result card
  }
};
```

### Step 4: Query Firestore for the username

```
src/services/users.ts:60-79
```

```typescript
export async function findUserByUsername(username: string): Promise<User | null> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const userDoc = snap.docs[0];
  const data = userDoc.data();
  const isPublic = data.isPublic ?? true;
  if (respectPrivacy && !isPublic) return null;  // private user → not found
  return { uid: userDoc.id, displayName: data.displayName, ... };
}
```

### Step 5: User taps "Add" on the search result

```
src/components/AddFriendSheet.tsx:98-108
```

```typescript
const handleSendRequest = async () => {
  await sendFriendRequest(firebaseUser.uid, searchResult.uid);  // → Step 6
  setSent(true);
  Alert.alert('Sent!', `Friend request sent to ${searchResult.displayName}`);
};
```

### Step 6: Two Firestore documents are created

```
src/services/friends.ts:19-49
```

```typescript
export async function sendFriendRequest(
  currentUserId: string, targetUserId: string
): Promise<void> {
  // Check not already friends
  const existing = await getDoc(
    doc(db, 'users', currentUserId, 'friends', targetUserId)
  );
  if (existing.exists()) throw new Error('Friend request already exists');

  // Write to SENDER's friends subcollection
  await setDoc(doc(db, 'users', currentUserId, 'friends', targetUserId), {
    status: 'pending_sent',
    createdAt: serverTimestamp(),
    lastConnectionAt: null,
    connectionCount: 0,
    frequencyGoal: null,
    snoozedUntil: null,
  });

  // Write to RECEIVER's friends subcollection
  await setDoc(doc(db, 'users', targetUserId, 'friends', currentUserId), {
    status: 'pending_received',
    createdAt: serverTimestamp(),
    lastConnectionAt: null,
    connectionCount: 0,
    frequencyGoal: null,
    snoozedUntil: null,
  });
}
```

### Step 7: Real-time listener fires on receiver's device

```
src/hooks/useFriends.ts:11-32
```

On the receiver's device, `subscribeFriends` is already listening. The new `pending_received` document triggers the callback:

```typescript
const unsubscribe = subscribeFriends(userId, async (friendRecords) => {
  setFriends(friendRecords);  // now includes the new pending request
  // ... fetch profile for the sender ...
});
```

### Step 8: Receiver sees the request in FriendRequestsSheet

```
src/components/FriendRequestsSheet.tsx:51-89
```

The `pendingReceived` array now contains the new request. When the receiver opens the notification bell, they see:

```typescript
{pendingReceived.map((item) => {
  const profile = getProfile(item.friendId);
  return (
    <View key={item.friendId}>
      <Avatar photoUrl={profile?.photoUrl} name={profile?.displayName} />
      <Text>{profile?.displayName}</Text>
      <Button label="Accept" onPress={() => handleAccept(item.friendId)} />
      <Button label="Decline" onPress={() => handleDecline(item.friendId)} />
    </View>
  );
})}
```

### Step 9: Accepting updates both documents

```
src/services/friends.ts:52-66
```

```typescript
export async function acceptFriendRequest(
  currentUserId: string, friendId: string
): Promise<void> {
  // Update receiver's record
  await setDoc(
    doc(db, 'users', currentUserId, 'friends', friendId),
    { status: 'accepted' },
    { merge: true }
  );
  // Update sender's record
  await setDoc(
    doc(db, 'users', friendId, 'friends', currentUserId),
    { status: 'accepted' },
    { merge: true }
  );
}
```

**Complete flow:**
```
+ Add Friend → AddFriendSheet → Search tab → findUserByUsername →
sendFriendRequest → 2 Firestore docs created → receiver's onSnapshot fires →
pendingReceived updates → notification dot appears → Accept →
both docs updated to "accepted" → both users' friend lists update in real time
```

---

## Trace 3: Going Online

**Scenario:** User taps "Go Online", picks 30 minutes. Cloud Function computes tiers and sends staggered notifications.

### Step 1: User taps "Go Online" button

```
app/(tabs)/index.tsx:167-175
```

```typescript
const handleGoOnlinePress = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);  // vibrate!
  // Spring animation: shrink → grow → settle
  goOnlineScale.value = withSpring(0.95, ..., () => {
    goOnlineScale.value = withSpring(1.05, ..., () => {
      goOnlineScale.value = withSpring(1);
    });
  });
  setShowDurationPicker(true);  // opens DurationPicker sheet
};
```

### Step 2: User picks 30 minutes in DurationPicker

```
src/components/DurationPicker.tsx:15-39
```

```typescript
<Sheet visible={visible} onClose={onClose}>
  <Text variant="h2">How long are you available?</Text>
  {DURATION_OPTIONS.map((opt) => (
    <Chip key={opt.minutes} label={opt.label}
      onPress={() => onSelect(opt.minutes)} />  // onSelect(30)
  ))}
</Sheet>
```

### Step 3: `handleGoAvailable` calls the hook

```
app/(tabs)/index.tsx:158-161 → src/hooks/useAvailability.ts:46-52
```

```typescript
// In HomeScreen:
const handleGoAvailable = async (minutes: number) => {
  setShowDurationPicker(false);
  await goAvailable(minutes);  // hook function
};

// In useMyAvailability:
const goAvailable = useCallback(async (durationMinutes: number) => {
  if (!userId) return;
  await setAvailable(userId, durationMinutes);  // → Step 4
}, [userId]);
```

### Step 4: Availability doc written to Firestore

```
src/services/availability.ts:18-32
```

```typescript
export async function setAvailable(userId: string, durationMinutes: number): Promise<void> {
  const now = new Date();
  const availableUntil = new Date(now.getTime() + durationMinutes * 60 * 1000);

  await setDoc(doc(db, 'availability', userId), {
    isAvailable: true,
    availableUntil: Timestamp.fromDate(availableUntil),
    startedAt: Timestamp.fromDate(now),
    inConversation: false,
    inConversationWith: null,
  });
}
```

### Step 5: Cloud Function triggers

```
functions/src/index.ts:26-201
```

The `onDocumentCreated` trigger fires because a new `availability/{userId}` document was created:

**5a. Get user info and friends:**
```typescript
const userDoc = await db.doc(`users/${userId}`).get();
const displayName = userData.displayName || 'Someone';

const friendsSnap = await db
  .collection(`users/${userId}/friends`)
  .where('status', '==', 'accepted')
  .get();
```

**5b. Detect overlapping availability (auto-connect):**
```typescript
// Check if any friends are ALSO online right now
const availSnap = await db.collection('availability')
  .where(documentId(), 'in', friendIdBatch).get();

for (const availDoc of availSnap.docs) {
  if (friendAvail.isAvailable && friendAvail.availableUntil > now) {
    // Both online! Auto-log a connection
    await db.collection('connections').add({
      userIds: orderedIds,
      timestamp: serverTimestamp(),
      type: 'overlap',
      reportedBy: null,
    });
    // Update connection counts on both sides
  }
}
```

**5c. Compute tiers:**
```typescript
const tierMap = assignTiers(friendDataList, now);
// Result: { "friend1": 1, "friend2": 2, "friend3": 3, ... }

const tierRevealTimes = {};
// Tier 1: immediate, Tier 2: +30s, Tier 3: +1min, Tier 4: +2min

await db.doc(`availability/${userId}`).update({
  tierRevealTimes,
  friendTiers,
});
```

**5d. Send staggered notifications:**
```typescript
for (const [tier, tierFriendIds] of tierGroups) {
  const delay = TIER_DELAYS[tier];  // 0, 30000, 60000, or 120000 ms

  const sendNotifications = async () => {
    for (const friendId of tierFriendIds) {
      // Get friend's push token
      messages.push({
        to: friendData.pushToken,
        title: 'HereNow',
        body: `${displayName} is available for the next ${durationLabel}`,
      });
    }
    await expo.sendPushNotificationsAsync(chunks);
  };

  if (delay === 0) await sendNotifications();
  else setTimeout(sendNotifications, delay);
}
```

### Step 6: Local listener fires (your own status)

```
src/hooks/useAvailability.ts:17-20
```

Back on the user's device, `subscribeToMyAvailability` fires:

```typescript
const unsubscribe = subscribeToMyAvailability(userId, setAvailabilityState);
// setAvailabilityState triggers re-render → isAvailable becomes true
```

### Step 7: Countdown timer starts

```
src/hooks/useAvailability.ts:24-44
```

```typescript
useEffect(() => {
  if (!availability) { setTimeRemaining(0); return; }
  const update = () => {
    const remaining = Math.max(0,
      Math.floor((availability.availableUntil.getTime() - Date.now()) / 1000)
    );
    setTimeRemaining(remaining);
    if (remaining <= 0) setUnavailable(userId);  // auto-offline when expired
  };
  update();
  const interval = setInterval(update, 1000);  // tick every second
  return () => clearInterval(interval);
}, [availability, userId]);
```

### Step 8: Friends' devices update in real time

```
src/hooks/useAvailability.ts:86-148
```

On friends' devices, `subscribeToAvailableFriends` fires with the new availability data. The friend appears in their "Available Now" list.

**Complete flow:**
```
Go Online → DurationPicker → goAvailable(30) → setAvailable() → Firestore write →
Cloud Function triggers → overlap detection → tier computation → tier data written →
staggered notifications sent → user's listener fires → status bar appears →
countdown starts → friends' listeners fire → friend appears in their list
```

---

## Trace 4: Logging a Catch-Up

**Scenario:** User opens a friend's settings and taps "Log Catch-up" to record a conversation.

### Step 1: User taps a friend row to open settings

```
app/(tabs)/index.tsx:391
```

```typescript
<FriendRow
  onPress={() => setSelectedFriend(friend)}  // opens FriendSettingsSheet
/>
```

### Step 2: FriendSettingsSheet renders with friend stats

```
src/components/FriendSettingsSheet.tsx:81-118
```

Shows avatar, name, last connected date, connection count, and action buttons.

### Step 3: User taps "Log Catch-up"

```
src/components/FriendSettingsSheet.tsx:42-46
```

```typescript
const handleLogCatchUp = async () => {
  await logManualConnection(currentUserId, friend.friendId);  // → Step 4
  Alert.alert('Logged!', 'Catch-up recorded.');
  onClose();
};
```

### Step 4: Connection doc created + counts denormalized

```
src/services/connections.ts:21-53
```

```typescript
export async function logManualConnection(
  currentUserId: string, friendId: string
): Promise<void> {
  // Sort IDs alphabetically for consistent querying
  const userIds: [string, string] =
    currentUserId < friendId
      ? [currentUserId, friendId]
      : [friendId, currentUserId];

  // 1. Create connection record
  await addDoc(collection(db, 'connections'), {
    userIds,
    timestamp: serverTimestamp(),
    type: 'manual',
    reportedBy: currentUserId,
  });

  // 2. Update YOUR friend record (denormalized)
  const now = Timestamp.now();
  await updateDoc(
    doc(db, 'users', currentUserId, 'friends', friendId),
    {
      lastConnectionAt: now,
      connectionCount: increment(1),  // atomic increment!
    }
  );

  // 3. Update THEIR friend record (denormalized)
  await updateDoc(
    doc(db, 'users', friendId, 'friends', currentUserId),
    {
      lastConnectionAt: now,
      connectionCount: increment(1),
    }
  );
}
```

### Step 5: Real-time listener fires, UI updates

```
src/hooks/useFriends.ts:14-29
```

The `subscribeFriends` listener fires because the friend subcollection doc changed. The friend's `lastConnectionAt` and `connectionCount` are now updated. This flows through to:
- The friend row shows "Connected today" instead of "3d ago"
- Priority sorting recalculates (this friend drops in urgency since you just connected)

**Complete flow:**
```
Tap friend → FriendSettingsSheet → "Log Catch-up" → logManualConnection →
1. connections/{auto-id} created
2. users/{me}/friends/{them} updated (lastConnectionAt, connectionCount)
3. users/{them}/friends/{me} updated (same)
→ onSnapshot fires → friend list re-renders with updated data
```

---

## Key Patterns to Notice

Across all 4 traces, you'll see the same patterns:

1. **User action → service function → Firestore write** — UI never talks to Firestore directly
2. **`onSnapshot` listeners → React state → re-render** — real-time updates flow automatically
3. **Bidirectional writes** — friend operations always update both sides
4. **Denormalization** — connection counts stored on friend records to avoid aggregation queries
5. **Hooks as intermediaries** — `useAuth`, `useFriends`, `useAvailability` sit between screens and services

Next: **[What's Next](./06-whats-next.md)** — improvements and learning resources.
