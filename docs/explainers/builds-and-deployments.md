# Builds & Deployments

## Build Profiles

All three profiles live in the same codebase. `APP_VARIANT` in `eas.json` controls the app name, bundle ID, and icon at build time via `app.config.ts`.

| Profile | App Name | Bundle ID | Distribution |
|---|---|---|---|
| `development` | HereNow (Dev) | `com.bhparsons.herenow.dev` | Ad-hoc (registered devices) |
| `preview` | HereNow (Preview) | `com.bhparsons.herenow.preview` | Ad-hoc (registered devices) |
| `production` | HereNow | `com.bhparsons.herenow` | TestFlight / App Store |

All three install side-by-side — separate bundle IDs, separate app names.

## Installing Each Build

### Development (custom dev client — not Expo Go)

This project uses `expo-apple-authentication` and other native modules not included in Expo Go, so you need a **custom dev client** build. You only build this once (rebuild when native plugins change).

```bash
eas device:create                                # register your device (first time only)
eas build --profile development --platform ios   # build the dev client
```

Open the install link EAS gives you. Then for daily development:

```bash
npx expo start
```

The dev client connects to Metro over your local network — hot reload, debugging tools, and whatever branch/worktree Metro is running from is what you see.

### Preview (standalone, no Metro)

A production-like build distributed via ad-hoc provisioning (not TestFlight). No debugger, no Metro — behaves like the real app.

```bash
eas device:create                              # if device not already registered
eas build --profile preview --platform ios
```

Open the install URL from EAS on your phone.

### Production (App Store / TestFlight)

```bash
eas build --profile production --platform ios
eas submit --profile production
```

Install via the TestFlight app. No device registration needed.

## When to Use Each

| Situation | Profile |
|---|---|
| Coding with hot reload | **Development** — connects to local Metro |
| Testing feature in real-app mode before merging | **Preview** — build from feature branch |
| QA a release candidate after merging to main | **Preview** — build from `main` |
| Ship to users | **Production** — always from `main` |

## Development Workflow

```
1. git worktree add .claude/worktrees/<name> -b dev/<name> main
2. cd .claude/worktrees/<name> && npx expo start     # dev client + hot reload
3. (optional) eas build --profile preview             # real-app test from branch
4. git push -u origin dev/<name> && gh pr create
5. Merge PR → eas build --profile preview from main   # final QA
6. eas build --profile production && eas submit       # ship it
7. git worktree remove .claude/worktrees/<name>
```

## OTA Updates (JS-only changes)

Skip full rebuilds for JS/TS/style/asset changes:

```bash
eas update --channel preview --message "description"
eas update --channel production --message "description"
```

OTA updates target a **channel**, not a branch — be careful not to push unfinished work to a channel with testers on it.

**Requires a full rebuild instead:** new/removed native modules, `app.config.ts` changes, Expo SDK upgrades.

## Version Management

- **Build number**: Auto-incremented on production builds (`autoIncrement` in `eas.json`)
- **App version**: Bump manually in `app.config.ts` for major/minor releases
- **Runtime version**: `appVersion` policy — OTA updates only reach builds with matching app version

## Parallel Work with Worktrees

```
~/ClaudeCode/HereNow/                            → main repo
~/ClaudeCode/HereNow/.claude/worktrees/feat-a/    → branch dev/feat-a
~/ClaudeCode/HereNow/.claude/worktrees/feat-b/    → branch dev/feat-b
```

Each worktree = one branch = one feature. All branch off `main`, merge back via PR. Only one can run Metro at a time (use `--port` to run multiple).
