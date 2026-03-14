# HereNow Codebase Review — 2026-03-12

## Summary

Full review of the HereNow codebase covering build issues, performance concerns, code quality, and architecture. Findings are ordered by severity with recommended fixes and verification steps.

---

## 1. Critical: Build Blocker

### Duplicate `style` prop on Go Online button

**File:** `app/(tabs)/index.tsx`, lines 417–431

The `AnimatedPressable` component has two `style` props, which is invalid JSX and prevents compilation:

```tsx
<AnimatedPressable
  style={goOnlineAnimStyle}                    // line 418 — FIRST style prop
  className="rounded-2xl py-4 items-center mb-2.5 shadow-lg"
  style={[                                      // line 420 — SECOND style prop (duplicate)
    goOnlineAnimStyle,
    {
      backgroundColor: colors.primary.DEFAULT,
      borderWidth: 3,
      borderColor: colors.primary[700],
      shadowColor: colors.primary.DEFAULT,
      shadowOpacity: 0.25,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
  ]}
  onPress={handleGoOnlinePress}
>
```

**Fix:** Remove line 418 (`style={goOnlineAnimStyle}`). The array form on line 420 already includes `goOnlineAnimStyle` alongside the inline styles.

---

## 2. High Priority: Simplification Candidates

### 2a. Strip half-implemented tier reveal logic

**Files:**
- `src/hooks/useAvailability.ts`, lines 100–111
- `src/utils/priority.ts` (`assignTiers`, lines 73–108)
- `functions/src/priority.ts` (server-side mirror, lines 68–99)

The tier reveal system (staggered notifications by friend priority tier) is partially built but not wired end-to-end. In `useAvailableFriends`, lines 100–111 check `avail.tierRevealTimes` and `avail.friendTiers` to filter friends whose reveal time hasn't passed — effectively hiding available friends from the UI without the feature being complete:

```tsx
if (avail.tierRevealTimes && avail.friendTiers) {
  const myTier = avail.friendTiers[uid];
  if (myTier && avail.tierRevealTimes[myTier]) {
    const revealTime = avail.tierRevealTimes[myTier];
    if (revealTime > now) {
      continue;  // Hides available friends prematurely
    }
  }
}
```

**Recommendation:** Keep `computePriority()` and `sortByPriority()` (useful for sorting). Remove the `tierRevealTimes` filtering block and the `assignTiers` function from both client and server. Show all available friends immediately. Re-add staggered reveals when the feature is fully ready.

### 2b. N+1 query problem in `useFriends`

**File:** `src/hooks/useFriends.ts`, lines 14–29

Every time the friend subscription fires, each friend record triggers an individual `getUserProfile()` call via `Promise.all()`. With 50 friends, that's 50 separate Firestore document reads per subscription update:

```tsx
const unsubscribe = subscribeFriends(userId, async (friendRecords) => {
  setFriends(friendRecords);
  const profiles = new Map<string, User>();
  await Promise.all(
    friendRecords.map(async (fr) => {
      const profile = await getUserProfile(fr.friendId);  // 1 read per friend
      if (profile) profiles.set(fr.friendId, profile);
    })
  );
  setFriendProfiles(profiles);
  setLoading(false);
});
```

The same pattern appears in `useAvailableFriends` at `src/hooks/useAvailability.ts`, line 113.

**Options:**
- **Option A (recommended):** Denormalize — store `displayName` and `photoUrl` on the friend subcollection document. Update via Cloud Function when a user changes their profile.
- **Option B:** Batch fetch profiles in groups of 30 using Firestore `in` queries.

### 2c. 10-second forced re-render interval

**File:** `src/hooks/useAvailability.ts`, lines 150–158

A `setInterval` runs every 10 seconds and forces a state update by spreading the previous array into a new one. This triggers full re-renders (and downstream N+1 profile fetches) for no user-visible benefit:

```tsx
useEffect(() => {
  if (availableFriends.length === 0) return;
  const interval = setInterval(() => {
    setAvailableFriends((prev) => [...prev]);
  }, 10000);
  return () => clearInterval(interval);
}, [availableFriends.length]);
```

**Fix:** Remove this effect entirely. It exists solely to support the unfinished tier reveal feature. The `AvailableFriendCard` component already runs its own per-second countdown timer. Data changes should come through Firestore `onSnapshot` subscriptions.

### 2d. No error handling in hooks

**Files:**
- `src/hooks/useAuth.tsx`, lines 34–44 — `subscribeToAuthState` callback has no try/catch. If `getUserProfile` fails, infinite loading state.
- `src/hooks/useFriends.ts`, lines 14–29 — If any `getUserProfile` call fails inside `Promise.all`, the entire batch rejects and `setLoading(false)` never runs.
- `src/hooks/useAvailability.ts`, lines 93–144 — Same issue in the `subscribeToAvailableFriends` callback.

None of these hooks expose an `error` state. If any Firebase call fails, the UI shows empty or loading states forever.

**Fix:** Add `error` state to each hook, wrap async operations in try/catch, expose `error` to consumers, and display error states in the UI.

---

## 3. Medium Priority

### 3a. Missing loading/error states in sheet components

**Files:**
- `src/components/FriendSettingsSheet.tsx` — all async handlers (`handleSetGoal`, `handleLogCatchUp`, `handleSnooze`, `handleUnsnooze`, `handleRemove`) fire-and-forget with no loading indicators, no error handling, and no button disabling during operations.
- `src/components/FriendRequestsSheet.tsx` — `handleAccept` and `handleDecline` have the same issue.

Users can tap "Remove Friend" multiple times and trigger duplicate operations.

**Fix:** Add loading state, disable buttons during async operations, wrap in try/catch with user-facing error alerts.

### 3b. Countdown timer duplication

**Files:**
- `src/hooks/useAvailability.ts`, lines 23–44 (in `useMyAvailability`)
- `src/components/AvailableFriendCard.tsx`, lines 17–26

Both independently implement the same countdown pattern: `setInterval` every 1 second, compute `Math.floor((targetTime - Date.now()) / 1000)`, format remaining time.

**Fix:** Extract a shared `useCountdown(targetDate)` hook.

---

## 4. Low Priority

- **Hardcoded RGBA colors:** Some components use inline RGBA values instead of referencing the theme token system at `src/theme/tokens.ts`.
- **Firebase credentials in source:** Acceptable for mobile apps but could be improved with `expo-constants` or `.env` for environment management.
- **`sharp` module:** Missing for icon generation script; not needed for the running app.

---

## 5. What's Working Well

- **Project structure:** Clean separation across `app/`, `src/hooks/`, `src/services/`, `src/components/`, `src/types/`, `src/constants/`, `src/utils/`.
- **Expo Router navigation:** Tab-based routing properly set up.
- **Firebase security rules** (`firestore.rules`): Properly scoped per-user access.
- **Cloud Functions** (`functions/`): Compile cleanly and are well-structured.
- **Authentication flow:** Apple Sign-In + Email/Password via Firebase Auth.
- **Bidirectional friend management:** Friend subcollection pattern with proper status tracking (accepted, pending_received, pending_sent).
- **Type definitions** (`src/types/`): Comprehensive and consistent.
- **Theme/design token system:** Well-organized.
- **Priority scoring** (`computePriority`, `sortByPriority`): Solid ranking algorithm.

---

## 6. Recommended Execution Order

| Step | Task | Verification |
|------|------|-------------|
| 1 | Fix duplicate `style` prop in `app/(tabs)/index.tsx` | `npx expo start` launches without JSX errors |
| 2 | Remove tier reveal filtering (lines 100–111) and 10s re-render (lines 150–158) in `useAvailability.ts` | Home screen renders available friends immediately; no polling in React DevTools |
| 3 | Add error states to `useAuth`, `useFriends`, `useAvailability` | Simulate Firebase failure (disable network); error surfaces in UI instead of infinite loading |
| 4 | Fix N+1 profile fetching in `useFriends.ts` and `useAvailability.ts` | Firestore read count drops; check Firebase console usage with 10+ friends |
| 5 | Add loading/disabled states to `FriendSettingsSheet` and `FriendRequestsSheet` | Rapid-tap buttons; operations should not duplicate |
| 6 | Extract shared countdown hook | Both `useMyAvailability` and `AvailableFriendCard` use shared utility; countdown still works |
| 7 | Remove `assignTiers` from `src/utils/priority.ts` and `functions/src/priority.ts` | Unused code removed; priority sorting still works |
