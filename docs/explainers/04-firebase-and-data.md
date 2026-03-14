# Firebase, Firestore & the Backend

Firebase replaces what would normally be a whole backend stack — database server, authentication service, API server, cron jobs. This doc explains each piece using Python analogies.

## Firestore vs SQL

If you've used SQLite or PostgreSQL with Python, Firestore works differently:

| SQL Concept | Firestore Concept | Python Analogy |
|------------|-------------------|----------------|
| Database | Project | The whole Firebase project |
| Table | Collection | A dict of dicts |
| Row | Document | A single dict |
| Column | Field | A key in a dict |
| Primary key | Document ID | The dict key |
| Foreign key | Referenced ID | Just a string field |
| JOIN | Manual lookup | No joins — you fetch separately |

### The Mental Model

Think of Firestore as **nested Python dicts**:

```python
# If Firestore were Python dicts:
firestore = {
    "users": {                              # collection
        "abc123": {                         # document (ID = "abc123")
            "displayName": "Blake",         # fields
            "username": "blake_p",
            "photoUrl": None,
            "createdAt": datetime.now(),
            "friends": {                    # subcollection!
                "def456": {                 # document in subcollection
                    "status": "accepted",
                    "lastConnectionAt": datetime(2024, 3, 1),
                    "connectionCount": 12,
                    "frequencyGoal": "weekly",
                },
                "ghi789": {
                    "status": "pending_received",
                    "lastConnectionAt": None,
                    "connectionCount": 0,
                    "frequencyGoal": None,
                },
            },
        },
    },
    "availability": {                       # top-level collection
        "abc123": {                         # document ID = user ID
            "isAvailable": True,
            "availableUntil": datetime(2024, 3, 10, 15, 30),
            "startedAt": datetime(2024, 3, 10, 15, 0),
            "inConversation": False,
        },
    },
    "connections": {                        # top-level collection
        "auto_generated_id_1": {
            "userIds": ["abc123", "def456"],
            "timestamp": datetime.now(),
            "type": "manual",
            "reportedBy": "abc123",
        },
    },
}
```

## CRUD Operations

Here's how Firestore operations map to Python:

### Create / Write

```python
# Python (with a hypothetical database)
db["users"]["abc123"] = {
    "displayName": "Blake",
    "username": "blake_p",
    "createdAt": datetime.now(),
}
```

```typescript
// Firestore (from src/services/users.ts:15-26)
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export async function createUserProfile(
  uid: string,
  data: { displayName: string; username: string; photoUrl: string | null }
): Promise<void> {
  await setDoc(doc(db, 'users', uid), {
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    isPublic: true,
    createdAt: serverTimestamp(),  // Firebase sets the time server-side
  });
}

// doc(db, 'users', uid)  →  reference to document at path users/{uid}
// setDoc(ref, data)      →  write data to that document
```

### Read

```python
# Python
user = db["users"]["abc123"]
if user is None:
    return None
```

```typescript
// Firestore (from src/services/users.ts:28-41)
import { doc, getDoc } from 'firebase/firestore';

export async function getUserProfile(uid: string): Promise<User | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    uid,
    displayName: data.displayName,
    username: data.username,
    photoUrl: data.photoUrl,
    createdAt: data.createdAt?.toDate() || new Date(),
  };
}
```

### Update (Merge)

```python
# Python
db["users"]["abc123"].update({"displayName": "Blake P"})
```

```typescript
// Firestore (from src/services/users.ts:43-48)
export async function updateUserProfile(uid: string, data: Partial<...>): Promise<void> {
  await setDoc(doc(db, 'users', uid), data, { merge: true });
  // { merge: true } = only update the fields I'm passing, keep everything else
}
```

### Delete

```python
# Python
del db["availability"]["abc123"]
```

```typescript
// Firestore (from src/services/availability.ts:34-36)
export async function setUnavailable(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'availability', userId));
}
```

### Query (Find by field)

```python
# Python
results = [u for u in db["users"].values() if u["username"] == "blake_p"]
```

```typescript
// Firestore (from src/services/users.ts:60-71)
export async function findUserByUsername(username: string): Promise<User | null> {
  const q = query(
    collection(db, 'users'),
    where('username', '==', username)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const userDoc = snap.docs[0];
  // ...
}
```

## Real-Time Listeners (`onSnapshot`)

This is the killer feature for HereNow. Instead of polling ("check the database every 5 seconds"), Firestore *pushes* changes to your app instantly:

```python
# Python — you'd have to poll
while True:
    friends = db.get_friends(user_id)
    update_ui(friends)
    time.sleep(5)  # check again in 5 seconds
```

```typescript
// Firestore — listener fires automatically when data changes
// From src/services/friends.ts:89-102
export function subscribeFriends(
  userId: string,
  callback: (friends: FriendRecord[]) => void
): () => void {
  return onSnapshot(
    collection(db, 'users', userId, 'friends'),  // what to watch
    (snap) => {                                     // called on every change
      const friends = snap.docs.map((d) =>
        parseFriendDoc(d.id, d.data())
      );
      callback(friends);                            // update the UI
    }
  );
  // Returns an unsubscribe function — call it to stop listening
}
```

**How it works:**
1. Your app calls `onSnapshot` and passes a callback
2. Firebase immediately calls the callback with the current data
3. Whenever *anyone* changes that data (even from another device), Firebase calls your callback again
4. Your callback updates React state, which triggers a re-render
5. The UI updates in real time — no refresh needed

This is why when User A goes online, User B sees them appear instantly.

### Subscribing to a Single Document

```typescript
// From src/services/availability.ts:55-74
export function subscribeToMyAvailability(
  userId: string,
  callback: (availability: Availability | null) => void
): () => void {
  return onSnapshot(doc(db, 'availability', userId), (snap) => {
    if (!snap.exists()) {
      callback(null);  // user is offline
      return;
    }
    const data = snap.data();
    callback(parseAvailabilityDoc(userId, data));
  });
}
```

### Subscribing to a Query (Multiple Documents)

```typescript
// From src/services/availability.ts:134-153
// Watch all friends' availability at once:
const q = query(
  collection(db, 'availability'),
  where(documentId(), 'in', friendIdBatch)  // up to 30 IDs per query
);
const unsub = onSnapshot(q, (snap) => {
  for (const d of snap.docs) {
    const data = d.data();
    if (data.availableUntil.toDate() > now) {
      availabilityMap.set(d.id, parseAvailabilityDoc(d.id, data));
    }
  }
  callback(new Map(availabilityMap));
});
```

## Security Rules

Firestore security rules control who can read and write what. They're like Python decorators that gate access:

```python
# Python analogy
@require_auth
@require_owner(user_id)
def update_profile(user_id, data):
    db.users[user_id].update(data)
```

```
// Actual Firestore rules (from firestore.rules)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Users: anyone logged in can read, only owner can write
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create, update: if request.auth != null
        && request.auth.uid == userId;

      // Friends: only the user can read their own friends
      // But either party can create/update/delete (for accepting requests)
      match /friends/{friendId} {
        allow read: if request.auth != null
          && request.auth.uid == userId;
        allow create, update, delete: if request.auth != null
          && (request.auth.uid == userId
              || request.auth.uid == friendId);
      }
    }

    // Availability: anyone logged in can read, only owner can write
    match /availability/{userId} {
      allow read: if request.auth != null;
      allow create, update, delete: if request.auth != null
        && request.auth.uid == userId;
    }

    // Connections: only participants can read, only participants can create
    match /connections/{connectionId} {
      allow read: if request.auth != null
        && request.auth.uid in resource.data.userIds;
      allow create: if request.auth != null
        && request.auth.uid in request.resource.data.userIds;
    }
  }
}
```

**Key patterns:**
- `request.auth != null` — user must be logged in
- `request.auth.uid == userId` — user can only access their own data
- `request.auth.uid in resource.data.userIds` — user must be a participant

## Firebase Authentication

Firebase Auth handles login/signup so you don't build it yourself:

```typescript
// From src/services/auth.ts — three sign-in methods:

// 1. Apple Sign-In (from auth.ts:32-69)
export async function signInWithApple(): Promise<FirebaseUser> {
  // Apple handles the login UI
  const credential = await AppleAuthentication.signInAsync({ ... });
  // Convert Apple's token to a Firebase credential
  const oauthCredential = new OAuthProvider('apple.com').credential({
    idToken: credential.identityToken!,
    rawNonce: nonce,
  });
  // Sign in to Firebase with that credential
  const result = await signInWithCredential(auth, oauthCredential);
  return result.user;
}

// 2. Email/Password (from auth.ts:98-110)
export async function signUpWithEmail(
  email: string, password: string, displayName: string
): Promise<FirebaseUser> {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await createUserProfile(result.user.uid, { displayName, username: '', photoUrl: null });
  return result.user;
}

// 3. Auth state listener (from auth.ts:28-30)
export function subscribeToAuthState(callback: (user: FirebaseUser | null) => void) {
  return onAuthStateChanged(auth, callback);
  // Fires whenever user logs in or out — same pattern as onSnapshot
}
```

## Cloud Functions (Server-Side Code)

Cloud Functions are server-side code that runs in response to events. Think of them like Python decorators that trigger on database changes:

```python
# Python analogy
@on_database_create("availability/{user_id}")
def on_availability_created(user_id, data):
    friends = get_friends(user_id)
    for friend in friends:
        send_push_notification(friend, f"{data.name} is online!")
```

```typescript
// Actual Cloud Function (from functions/src/index.ts:26-201)
export const onAvailabilityCreated = onDocumentCreated(
  'availability/{userId}',     // trigger path
  async (event) => {
    const userId = event.params.userId;
    const data = event.data?.data();

    // 1. Get user's display name
    const userDoc = await db.doc(`users/${userId}`).get();

    // 2. Get all accepted friends
    const friendsSnap = await db
      .collection(`users/${userId}/friends`)
      .where('status', '==', 'accepted')
      .get();

    // 3. Check for overlapping availability (auto-log connections)
    // ... batch queries to availability collection ...

    // 4. Compute priority tiers
    const tierMap = assignTiers(friendDataList, now);

    // 5. Write tier data back to the availability doc
    await db.doc(`availability/${userId}`).update({
      tierRevealTimes,
      friendTiers,
    });

    // 6. Send staggered push notifications by tier
    // Tier 1: immediate, Tier 2: 30s delay, Tier 3: 1min, Tier 4: 2min
  }
);
```

There's also a scheduled function (like a Python cron job):

```typescript
// From functions/src/index.ts:208-227
export const cleanupExpiredAvailability = onSchedule(
  'every 5 minutes',
  async () => {
    const now = admin.firestore.Timestamp.now();
    const expiredSnap = await db
      .collection('availability')
      .where('availableUntil', '<=', now)
      .get();

    const batch = db.batch();
    for (const doc of expiredSnap.docs) {
      batch.delete(doc.ref);
    }
    if (!expiredSnap.empty) {
      await batch.commit();
    }
  }
);
```

## The Full Data Model

### `users/{userId}` — User profiles

```
{
  displayName: "Blake Parsons"
  username: "blake_p"
  photoUrl: "https://..." | null
  isPublic: true
  createdAt: Timestamp
  pushToken: "ExponentPushToken[xxx]"  (optional)
}
```

### `users/{userId}/friends/{friendId}` — Friend relationships (subcollection)

```
{
  status: "pending_sent" | "pending_received" | "accepted"
  createdAt: Timestamp
  lastConnectionAt: Timestamp | null
  connectionCount: 12
  frequencyGoal: "daily" | "weekly" | "monthly" | "quarterly" | null
  snoozedUntil: Timestamp | null
}
```

**Why bidirectional?** When Alice adds Bob, TWO documents are created:
- `users/alice/friends/bob` → `{ status: "pending_sent" }`
- `users/bob/friends/alice` → `{ status: "pending_received" }`

This way, each user only needs to read their *own* subcollection to see all their friend states. No complex cross-user queries needed.

### `availability/{userId}` — Who's online right now

```
{
  isAvailable: true
  availableUntil: Timestamp
  startedAt: Timestamp
  inConversation: false
  inConversationWith: null | "friendUserId"
  tierRevealTimes: { 1: Timestamp, 2: Timestamp, 3: Timestamp, 4: Timestamp }
  friendTiers: { "friendId1": 1, "friendId2": 3, ... }
}
```

**Why top-level?** If availability were a subcollection under users, checking which friends are online would require N separate reads (one per friend). As a top-level collection, you can query by document ID in batches of 30.

### `connections/{auto-id}` — Connection history

```
{
  userIds: ["alice_id", "bob_id"]   (always sorted alphabetically)
  timestamp: Timestamp
  type: "overlap" | "manual"
  reportedBy: "alice_id" | null     (null for auto-detected overlaps)
}
```

## The Tier/Priority System

This is one of the more sophisticated parts of the app. Here's how it works step by step:

### Step 1: Compute Priority Score (src/utils/priority.ts:45-65)

Each friend gets a numeric score based on:
- **How overdue** they are (time since last connection / goal interval)
- **Goal weight** (daily goals are more urgent than quarterly)
- **Special cases**: snoozed = -1, no goal = 0

```typescript
export function computePriority(friend: FriendRecord): number {
  if (friend.snoozedUntil && friend.snoozedUntil > now) return -1;
  if (!friend.frequencyGoal) return 0;

  const interval = goalToMs(friend.frequencyGoal);  // e.g., weekly = 7 days
  const timeSince = friend.lastConnectionAt
    ? now - friend.lastConnectionAt.getTime()
    : interval * 2;  // never connected = treat as 2x overdue

  const urgencyRatio = timeSince / interval;  // >1 means overdue
  const weight = goalWeight(friend.frequencyGoal);  // daily=4, weekly=3, ...

  return urgencyRatio * weight;
}
```

**Example:** A friend with a weekly goal, last connected 10 days ago:
- urgencyRatio = 10/7 = 1.43 (43% overdue)
- weight = 3 (weekly)
- score = 1.43 * 3 = 4.29

### Step 2: Assign Tiers (src/utils/priority.ts:73-108)

Friends are sorted by score, then divided into 4 tiers by percentile:
- **Tier 1** (top 25%): Highest priority friends
- **Tier 2** (25-50%): Medium-high
- **Tier 3** (50-75%): Medium-low
- **Tier 4** (bottom 25% + snoozed): Lowest priority

### Step 3: Staggered Notifications (functions/src/index.ts:12-17)

When you go online, notifications are sent with delays based on tier:
- Tier 1: **Immediate** (0ms)
- Tier 2: **30 seconds** delay
- Tier 3: **1 minute** delay
- Tier 4: **2 minutes** delay

This ensures your closest friends find out first, and prevents notification spam.

### Step 4: Tier-Based Visibility (src/hooks/useAvailability.ts:100-111)

On the receiving end, friends check `tierRevealTimes` to see if they should be shown yet:

```typescript
if (avail.tierRevealTimes && avail.friendTiers) {
  const myTier = avail.friendTiers[uid];
  if (myTier && avail.tierRevealTimes[myTier]) {
    const revealTime = avail.tierRevealTimes[myTier];
    if (revealTime > now) {
      continue;  // not yet revealed for our tier
    }
  }
}
```

## Going Deeper

- [Firestore docs](https://firebase.google.com/docs/firestore) — official guide
- [Firebase Auth docs](https://firebase.google.com/docs/auth) — authentication
- [Cloud Functions docs](https://firebase.google.com/docs/functions) — server-side code
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) — access control

Next: **[Tracing Features](./05-tracing-features.md)** — follow complete features through all 3 layers.
