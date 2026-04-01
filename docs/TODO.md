# HereNow — Next Steps

## High Priority — Ship Blockers

- [ ] **Clean up git history** — Commit all staged/working code with meaningful commit messages
- [ ] **Device testing pass** — Run the full app on a physical device; verify real-time availability, countdowns, push notifications, and QR scanning end-to-end
- [ ] **Error handling audit** — Add error handling for critical paths: batched Firestore writes (friend requests), push token registration failures, availability expiry race conditions
- [ ] **Fix login reliability** — Login has been inconsistent in the app simulation; debug and stabilize auth flows (Apple, Google, email/password)
- [x] **Auth account conflict resolution** — Handle cases where a user registers with email then tries to login with Google/Apple on the same email address (Firebase account linking)
- [x] **Update TestFlight URL** — Replace placeholder in `src/constants/index.ts` (`TESTFLIGHT_URL`) with the real public TestFlight link once Apple approves the external beta build

## Medium Priority — Feature Gaps

- [ ] **In-app notification handling** — Add foreground notification listener + deep-link navigation when a push arrives while the app is open
- [ ] **Contact-based friend discovery** — `expo-contacts` is a dependency but unused; build a "Find friends from contacts" flow
- [ ] **Contact search by phone number** — Let users search for and add friends by phone number
- [x] **Connection history UI** — `getConnectionHistory()` exists in `src/services/connections.ts` but has no corresponding screen; add a history view accessible from FriendSettingsSheet
- [x] **Profile photo upload to Firebase Storage** — Currently saves local URI from ImagePicker which won't persist across devices; upload to Storage and save the download URL; verify photos distribute correctly to friends
- [x] **FaceTime call initiation** — Add a FaceTime button to available friend cards for quick call initiation
- [x] **QR code friend add** — Make the scan QR code flow work end-to-end for adding friends
- [ ] **Friend settings sheet UX** — Make the friend sheet more intuitive and easier to navigate
- [ ] **Update ranking heuristic** — Revisit the priority/tier scoring algorithm for better friend ordering

## Lower Priority — Polish

- [x] **Offline state handling** — Detect network loss and show a status indicator; Firestore has offline persistence but the UI is silent about connectivity
- [ ] **Last online details** — Show when contacts were last online, with more granular timing
- [ ] **Adopt a UI kit + color palette** — Pick a popular UI kit and set up a color palette that's easy to swap; make style/color changes simple going forward
- [ ] **App store prep** — Privacy policy, terms of service, finalized app icons (generator script exists in `scripts/generate-icons.ts` but outputs are mockups)
- [ ] **Update web app / test bench** — Bring the testbench in sync with current app state

## Ideas — Future Exploration

- [ ] **Feature flags** — Add feature flag system to show/suppress features for different user populations; support different versions for personal use vs TestFlight groups
- [ ] **Scheduled availability** — Let users set a time when they plan to be online next, visible to friends
- [ ] **Availability pattern detection** — Analyze when a user tends to be online and surface patterns to their friends (e.g., "usually online weekdays 8–9pm") to increase overlap
- [ ] **Offline push notifications** — Notify users when someone they want to talk to goes online, even if the user is currently offline/app is backgrounded
