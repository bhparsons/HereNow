# What's Next: Improvements & Learning Path

## Prioritized Improvements

### High Priority (Core Experience)

1. **Error boundaries and offline handling** — The app has basic network detection (`app/(tabs)/index.tsx:77-82`) but doesn't gracefully handle Firestore failures. Add try/catch wrappers in hooks and show user-friendly error states.

2. **Profile photo upload to Firebase Storage** — Currently `profile.tsx:66-80` saves the local URI, which won't persist across devices. Need to upload to Firebase Storage and save the download URL.

3. **Notification permission flow** — `src/services/notifications.ts` registers for push tokens but the app doesn't prompt users at the right moment. Add an onboarding step or prompt after first friend added.

4. **Friend request notifications** — The Cloud Function only notifies for availability changes. Add a trigger for new friend requests so users know when someone adds them.

5. **Auto-expire availability on app foreground** — The countdown timer (`useAvailability.ts:24-44`) handles expiry, but if the app was in the background for a while, there's a gap. Check on `AppState` change.

### Medium Priority (Polish)

6. **Loading states** — Many async operations (search, accept request, go online) don't show loading indicators. The `Button` component supports `disabled` state but few screens use it during async operations.

7. **Contacts integration** — The `expo-contacts` package is in `package.json` but not used yet. Could auto-suggest friends from the user's phone contacts.

8. **Connection history screen** — `src/services/connections.ts:59-85` has `getConnectionHistory` but no UI to display it. Add a screen showing your catch-up timeline with each friend.

9. **Snooze display** — Friends can be snoozed (`FriendSettingsSheet.tsx:48-53`) but the friend list doesn't visually indicate which friends are snoozed.

10. **Testing** — No tests exist yet. Start with unit tests for pure functions (`utils/time.ts`, `utils/priority.ts`) since they're the easiest to test.

### Lower Priority (Nice to Have)

11. **Custom availability messages** — Let users add a note when going online ("Free for coffee" vs "Quick call only").

12. **Group availability** — See when multiple friends are all free at the same time.

13. **Analytics/insights** — Show users their connection patterns over time.

14. **Dark mode** — The theme tokens (`src/theme/tokens.ts`) would need a dark variant, and components would need to respond to system appearance.

## Learning Path

### Phase 1: Understand What's Here (Week 1-2)

Read the docs in this folder in order. Then:

1. **Read the entry point flow:** `app/index.tsx` → `app/_layout.tsx` → `app/(tabs)/_layout.tsx`
2. **Read a simple component:** `src/components/Avatar.tsx` (short, no state)
3. **Read a component with state:** `src/components/DurationPicker.tsx` (uses props and callbacks)
4. **Read a hook:** `src/hooks/useFriends.ts` (connects service to React state)
5. **Read a service:** `src/services/friends.ts` (Firestore operations)

### Phase 2: Small Changes (Week 2-3)

Start making tiny changes to build confidence:

**Exercise 1: Change a constant**
- Open `src/constants/index.ts`
- Change the quick duration options (e.g., add a "2 hr" chip)
- See the change reflected in the UI

**Exercise 2: Modify a component**
- Open `src/components/AvailableFriendCard.tsx`
- Change the text that shows when a friend is busy (line 57-59)
- Try changing colors by using different values from `src/theme/tokens.ts`

**Exercise 3: Add a field to a type**
- Add a `bio?: string` field to the `User` interface in `src/types/index.ts`
- TypeScript will show you everywhere that needs updating (that's the point of types!)

**Exercise 4: Modify the profile screen**
- Add a new `Input` for the bio field on `app/(tabs)/profile.tsx`
- Save it using `updateUserProfile` (already exists in `src/services/users.ts`)

### Phase 3: Build a Small Feature (Week 3-4)

Pick one of these starter features:

**Option A: Connection history UI**
- Create `app/(tabs)/history.tsx` (new tab)
- Use `getConnectionHistory` from `src/services/connections.ts`
- Display a list of past catch-ups

**Option B: Snoozed indicator**
- In `src/components/FriendRow.tsx`, check if the friend is snoozed
- Show a muted style or "Snoozed" badge for snoozed friends

**Option C: Availability message**
- Add a `message?: string` field to `Availability` in `src/types/index.ts`
- Update `src/services/availability.ts` to accept and store the message
- Show it in `src/components/AvailableFriendCard.tsx`

### Phase 4: Deeper Skills (Month 2+)

- **Testing:** Learn Jest + React Testing Library. Start with `utils/priority.ts`
- **State management:** Understand when to use Context vs local state vs a library like Zustand
- **Performance:** Learn about `React.memo`, `useMemo`, `useCallback` and when they matter
- **Firebase advanced:** Compound queries, indexes, batched writes, transactions

## Suggested Codebase Reading Order

If you want to read every file, here's the optimal order (simplest → most complex):

```
1. src/types/index.ts                    — Data shapes (reference while reading everything else)
2. src/constants/index.ts                — Simple configuration values
3. src/theme/tokens.ts                   — Color palette
4. src/utils/time.ts                     — Pure formatting functions
5. src/config/firebase.ts                — Firebase initialization
6. src/services/users.ts                 — Basic CRUD
7. src/services/auth.ts                  — Auth flows
8. src/services/friends.ts               — Bidirectional writes
9. src/services/availability.ts          — Real-time subscriptions
10. src/services/connections.ts           — Denormalized writes
11. src/services/notifications.ts         — Push notification setup
12. src/components/ui/Text.tsx            — Simplest UI component
13. src/components/ui/Chip.tsx            — Animation intro
14. src/components/ui/Button.tsx          — Full animated component
15. src/components/Avatar.tsx             — Conditional rendering
16. src/components/FriendRow.tsx          — Props and callbacks
17. src/components/AvailableFriendCard.tsx — useEffect + timer
18. src/components/DurationPicker.tsx     — Sheet + chip selection
19. src/components/FriendRequestsSheet.tsx — List rendering
20. src/components/FriendSettingsSheet.tsx — Multiple interactions
21. src/components/AddFriendSheet.tsx     — Tabs, camera, search
22. src/hooks/useAuth.tsx                 — Context provider pattern
23. src/contexts/AddFriendModalContext.tsx — Modal context
24. src/hooks/useFriends.ts              — Real-time subscription hook
25. src/hooks/useAvailability.ts         — Complex hook with timers
26. src/utils/priority.ts                — Algorithm (tier system)
27. app/_layout.tsx                       — Root layout
28. app/index.tsx                         — Auth routing
29. app/login.tsx                         — Form handling
30. app/setup-profile.tsx                 — Validation
31. app/(tabs)/_layout.tsx               — Tab configuration
32. app/(tabs)/profile.tsx               — Profile editing
33. app/(tabs)/index.tsx                 — The main screen (most complex)
34. app/friend/[username].tsx            — Dynamic routing
35. functions/src/index.ts               — Server-side logic
36. firestore.rules                      — Security rules
```

## External Resources

### JavaScript / TypeScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — start here for TS
- [MDN JavaScript Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide) — the definitive JS reference
- [JavaScript for Python Developers](https://www.valentinog.com/blog/python-js/) — targeted comparison

### React
- [React Quick Start](https://react.dev/learn) — official interactive tutorial
- [Thinking in React](https://react.dev/learn/thinking-in-react) — mental model
- [React Hooks docs](https://react.dev/reference/react/hooks) — every hook explained

### React Native / Expo
- [React Native docs](https://reactnative.dev/docs/getting-started) — core concepts
- [Expo docs](https://docs.expo.dev/) — the platform
- [Expo Router](https://docs.expo.dev/router/introduction/) — file-based routing
- [NativeWind](https://www.nativewind.dev/) — Tailwind for RN

### Firebase
- [Firestore Getting Started](https://firebase.google.com/docs/firestore/quickstart) — setup and basics
- [Firebase Auth](https://firebase.google.com/docs/auth) — authentication
- [Cloud Functions](https://firebase.google.com/docs/functions) — server-side code
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started) — access control
- [Firebase + React Native](https://firebase.google.com/docs/web/setup) — integration guide

### General
- [Expo YouTube channel](https://www.youtube.com/@expo-dev) — tutorials and talks
- [Fireship](https://www.youtube.com/@Fireship) — fast-paced tech explainers
