# HereNow: Start Here

Welcome to the HereNow codebase! This guide is written specifically for you — someone with Python experience who's learning mobile development, React, and Firebase for the first time.

## What is HereNow?

HereNow is a mobile app that facilitates real, mutual connections between friends. The core idea:

1. **Signal availability** — Tap "Go Online" to tell friends you're free to chat
2. **See who's around** — Friends who are also online appear in real time
3. **Track connections** — The app remembers how often you connect with each friend and prioritizes who you haven't talked to in a while

Think of it as a "green dot" for your real friendships — not social media, not messaging, just "I'm free right now, are you?"

## The 3-Layer Mental Model

If you think of a Python project, you might have:
- A **CLI or web interface** (what the user sees)
- **Business logic** (functions that do the work)
- A **database** (where data lives)

HereNow follows the same pattern, just with mobile-specific names:

```
┌─────────────────────────────────────────────────────────┐
│  LAYER 1: SCREENS (what the user sees & taps)           │
│  app/_layout.tsx, app/(tabs)/index.tsx, app/login.tsx    │
│  These are React components that render the UI           │
│                          │                               │
│                     uses hooks                           │
│                          ▼                               │
│  LAYER 2: HOOKS + SERVICES (business logic)             │
│  src/hooks/useAuth.tsx, src/hooks/useFriends.ts          │
│  src/services/auth.ts, src/services/friends.ts           │
│  These manage state and call Firebase                    │
│                          │                               │
│                   reads/writes                           │
│                          ▼                               │
│  LAYER 3: FIREBASE (database + auth + server functions) │
│  Firestore (NoSQL database in the cloud)                 │
│  Firebase Auth (login/signup)                            │
│  Cloud Functions (server-side code)                      │
└─────────────────────────────────────────────────────────┘
```

**Python analogy:** If you had a Flask app, Layer 1 is your Jinja templates, Layer 2 is your route handlers and helper functions, Layer 3 is your PostgreSQL database.

## How Data Flows (A Concrete Example)

When a user taps "Go Online" for 30 minutes:

```
User taps button
    │
    ▼
HomeScreen (app/(tabs)/index.tsx:158)
    │ calls goAvailable(30)
    ▼
useMyAvailability hook (src/hooks/useAvailability.ts:46)
    │ calls setAvailable(userId, 30)
    ▼
availability service (src/services/availability.ts:18)
    │ writes to Firestore: availability/{userId}
    ▼
Firebase Cloud Function triggers (functions/src/index.ts:26)
    │ computes friend tiers, sends push notifications
    ▼
Friends' phones get notified
    │ their Firestore listener fires
    ▼
Friends' useAvailableFriends hook updates automatically
    │ the new online friend appears in their list
    ▼
Friends' HomeScreen re-renders with the update
```

## The 9 Key Architecture Decisions

### 1. React Native + Expo (not native Swift/Kotlin)
**Why:** Write one codebase in TypeScript, get both iOS and Android apps. Expo adds developer tools (hot reload, easy builds, push notification service) on top.

### 2. TypeScript (not plain JavaScript)
**Why:** Type annotations catch bugs before runtime — same reason you'd use Python type hints, but enforced by the compiler. See `src/types/index.ts` for all the data shapes.

### 3. File-based routing with Expo Router
**Why:** The file `app/(tabs)/index.tsx` automatically becomes the home tab — no manual route configuration. Similar to how Next.js or Flask blueprints map URLs to handlers.

### 4. Firebase for everything (auth, database, server functions)
**Why:** One platform handles login, data storage, real-time sync, and server-side code. No need to build and host a separate backend server.

### 5. Firestore (NoSQL) instead of SQL
**Why:** Real-time listeners (`onSnapshot`) push changes to clients instantly — critical for "who's online right now?" The document/collection model maps well to user profiles and friend lists.

### 6. Bidirectional friend records
**Why:** When Alice sends Bob a friend request, *two* documents are created — one under Alice's friends subcollection, one under Bob's. This means each user only needs to read their own subcollection to see all friend states. See `src/services/friends.ts:32-49`.

### 7. Availability as a top-level collection
**Why:** `availability/{userId}` lives outside the user document so any authenticated user can query it efficiently. If it were nested under `users/{userId}/availability`, you'd need to query every user's subcollection individually.

### 8. Denormalized connection counts
**Why:** When a connection is logged, both `connectionCount` and `lastConnectionAt` are updated on each user's friend record (see `src/services/connections.ts:39-53`). This avoids an expensive aggregation query every time the app needs to sort friends by priority.

### 9. Context providers for global state
**Why:** `AuthProvider` wraps the entire app so any screen can call `useAuth()` to get the current user. `AddFriendModalProvider` lets any screen open the "Add Friend" sheet without passing callbacks through every component.

## File & Folder Map

```
HereNow/
├── app/                          # SCREENS (Expo Router)
│   ├── _layout.tsx               #   Root layout: wraps everything in AuthProvider
│   ├── index.tsx                  #   Entry point: redirects based on auth state
│   ├── login.tsx                  #   Login screen (Google, Apple, email)
│   ├── setup-profile.tsx          #   New user: pick username & display name
│   ├── (tabs)/                    #   Tab navigator group
│   │   ├── _layout.tsx            #     Tab bar config (Home, Profile icons)
│   │   ├── index.tsx              #     HOME TAB: go online, see friends, search
│   │   └── profile.tsx            #     PROFILE TAB: edit name, username, photo
│   └── friend/
│       └── [username].tsx         #   Deep link: /friend/jane → add jane as friend
│
├── src/                           # APPLICATION CODE
│   ├── types/index.ts             #   TypeScript interfaces (User, FriendRecord, etc.)
│   ├── config/firebase.ts         #   Firebase initialization & config
│   │
│   ├── services/                  #   FIREBASE OPERATIONS (Layer 2 - data access)
│   │   ├── auth.ts                #     Sign in/up/out (Apple, Google, email)
│   │   ├── users.ts               #     CRUD for user profiles
│   │   ├── friends.ts             #     Send/accept/decline requests, subscribe
│   │   ├── availability.ts        #     Go online/offline, subscribe to friends
│   │   ├── connections.ts         #     Log catch-ups, get history
│   │   └── notifications.ts       #     Register for push notifications
│   │
│   ├── hooks/                     #   REACT HOOKS (Layer 2 - state management)
│   │   ├── useAuth.tsx            #     Auth context provider + hook
│   │   ├── useFriends.ts          #     Real-time friend list + profiles
│   │   └── useAvailability.ts     #     Online status, countdown timer, friend list
│   │
│   ├── contexts/                  #   REACT CONTEXTS (global state)
│   │   └── AddFriendModalContext.tsx  # Global add-friend modal
│   │
│   ├── components/                #   UI COMPONENTS
│   │   ├── Avatar.tsx             #     Profile picture or initials circle
│   │   ├── AvailableFriendCard.tsx #    Online friend card with countdown
│   │   ├── FriendRow.tsx          #     Compact friend list item
│   │   ├── DurationPicker.tsx     #     "How long?" bottom sheet
│   │   ├── FriendRequestsSheet.tsx #    Pending requests sheet
│   │   ├── FriendSettingsSheet.tsx #    Friend options: goal, snooze, remove
│   │   ├── AddFriendSheet.tsx     #     Share/scan/search to add friends
│   │   ├── Logo.tsx               #     App logo component
│   │   └── ui/                    #     DESIGN SYSTEM primitives
│   │       ├── Text.tsx           #       Typography with variants (h1, body, etc.)
│   │       ├── Button.tsx         #       Animated button with variants & haptics
│   │       ├── Chip.tsx           #       Pill-shaped selector with spring animation
│   │       ├── Input.tsx          #       Styled text input
│   │       ├── Sheet.tsx          #       Bottom sheet modal
│   │       ├── Card.tsx           #       Glass-morphism card
│   │       ├── Badge.tsx          #       Status badge (online, busy)
│   │       └── IconButton.tsx     #       Icon-only pressable
│   │
│   ├── theme/tokens.ts            #   Color palette (single source of truth)
│   ├── constants/index.ts         #   Duration options, frequency goals, etc.
│   └── utils/                     #   PURE FUNCTIONS
│       ├── time.ts                #     Format "3d ago", "12m 30s"
│       └── priority.ts            #     Compute friend priority scores & tiers
│
├── functions/                     #   CLOUD FUNCTIONS (server-side)
│   └── src/index.ts               #     Notification sender + cleanup scheduler
│
├── firestore.rules                #   SECURITY RULES (who can read/write what)
├── firestore.indexes.json         #   Database indexes for compound queries
├── package.json                   #   Dependencies and scripts
├── tailwind.config.js             #   NativeWind/Tailwind styling config
└── CLAUDE.md                      #   Instructions for Claude Code
```

## Suggested Reading Order

If you're brand new to all of this, read the docs in order:

1. **You're here!** — `00-start-here.md` (architecture overview)
2. **[JS & TypeScript](./01-js-and-typescript.md)** — Language fundamentals, mapped from Python
3. **[React Fundamentals](./02-react-fundamentals.md)** — Components, state, effects
4. **[React Native & Expo](./03-react-native-and-expo.md)** — Mobile-specific concepts
5. **[Firebase & Data](./04-firebase-and-data.md)** — Database, auth, server functions
6. **[Tracing Features](./05-tracing-features.md)** — Follow real code paths end-to-end
7. **[What's Next](./06-whats-next.md)** — Improvements and learning resources

Each doc builds on the previous ones, but feel free to jump around based on what you're curious about.
