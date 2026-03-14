# JavaScript & TypeScript for Python Developers

This doc maps JavaScript and TypeScript concepts to Python equivalents, using real examples from the HereNow codebase.

## Variables

| Python | JavaScript/TypeScript |
|--------|----------------------|
| `name = "Blake"` | `const name = "Blake"` (can't reassign) |
| `count = 0` (reassignable) | `let count = 0` (can reassign) |
| No equivalent | `var count = 0` (old-style, avoid) |

**Rule of thumb:** Use `const` by default. Use `let` only when you need to reassign. Never use `var`.

```typescript
// From src/hooks/useAvailability.ts:14
const [availability, setAvailabilityState] = useState<Availability | null>(null);
// 'availability' is const — the variable binding never changes
// But React replaces the VALUE behind the scenes when you call setAvailabilityState
```

## Functions

Python and JS/TS have very similar function concepts, just different syntax:

```python
# Python
def format_time(seconds):
    if seconds <= 0:
        return "expired"
    minutes = seconds // 60
    return f"{minutes}m"

# Lambda
double = lambda x: x * 2
```

```typescript
// TypeScript — named function (from src/utils/time.ts:20)
export function formatTimeRemaining(totalSeconds: number): string {
  if (totalSeconds <= 0) return 'expired';
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return `${minutes}m`;
}

// Arrow function (like Python lambda, but can be multi-line)
const double = (x: number) => x * 2;

// Arrow function with body
const getLastConnectedText = (friend: FriendRecord): string =>
  formatLastConnected(friend.lastConnectionAt, { prefix: true });
```

**Key difference:** Arrow functions (`=>`) are used everywhere in JS/TS. They're like Python lambdas but can have full bodies. You'll see them constantly in React.

## Arrays and Objects

```python
# Python list
durations = [5, 15, 30, 60]
durations.append(120)
filtered = [d for d in durations if d > 10]
mapped = [d * 60 for d in durations]
```

```typescript
// TypeScript array (from src/constants/index.ts:3-9)
const DURATION_OPTIONS: DurationOption[] = [
  { label: '5 min', minutes: 5 },
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
];

// filter (like list comprehension with if)
const filtered = durations.filter(d => d > 10);

// map (like list comprehension)
const mapped = durations.map(d => d * 60);

// From app/(tabs)/index.tsx:54-57 — real usage
const friendIds = useMemo(
  () => acceptedFriends.map((f) => f.friendId),
  [acceptedFriends]
);
```

```python
# Python dict
user = {"name": "Blake", "age": 30}
user["name"]  # access
```

```typescript
// TypeScript object
const user = { name: "Blake", age: 30 };
user.name     // access (dot notation — preferred)
user["name"]  // also works (bracket notation)
```

**Key differences:**
- Python dicts use `dict["key"]`; JS objects use `obj.key`
- Python has `list.append()`; JS has `array.push()`
- Python has list comprehensions; JS has `.map()`, `.filter()`, `.reduce()`
- Python has `in` operator; JS has `.includes()` for arrays, `in` for object keys

## Destructuring (No Python Equivalent)

This is one of the biggest syntax differences. JS/TS lets you "unpack" objects and arrays inline:

```typescript
// Object destructuring — pull specific fields out of an object
// From app/(tabs)/index.tsx:46-52
const { firebaseUser } = useAuth();
// Equivalent Python: firebaseUser = useAuth()["firebaseUser"]

const {
  acceptedFriends,
  pendingReceived,
  pendingSent,
  friendProfiles,
} = useFriends(firebaseUser?.uid);
// Equivalent Python:
// result = useFriends(uid)
// acceptedFriends = result["acceptedFriends"]
// pendingReceived = result["pendingReceived"]
// ... etc

// Array destructuring — pull by position
// From app/(tabs)/index.tsx:69
const [showDurationPicker, setShowDurationPicker] = useState(false);
// Equivalent Python: showDurationPicker, setShowDurationPicker = use_state(False)
```

## Async/Await

This one maps almost 1:1 from Python:

```python
# Python
async def send_friend_request(current_user_id, target_user_id):
    existing = await get_doc(f"users/{current_user_id}/friends/{target_user_id}")
    if existing:
        raise Exception("Friend request already exists")
    await set_doc(...)
```

```typescript
// TypeScript (from src/services/friends.ts:19-49)
export async function sendFriendRequest(
  currentUserId: string,
  targetUserId: string
): Promise<void> {
  const existing = await getDoc(
    doc(db, 'users', currentUserId, 'friends', targetUserId)
  );
  if (existing.exists()) {
    throw new Error('Friend request already exists');
  }
  await setDoc(doc(db, 'users', currentUserId, 'friends', targetUserId), {
    status: 'pending_sent',
    createdAt: serverTimestamp(),
    // ...
  });
}
```

**Key difference:** JS uses `Promise<void>` where Python uses `async def` return type. Both use `async/await` the same way.

```typescript
// Promise.all — run multiple async operations in parallel
// From src/hooks/useFriends.ts:19-27
await Promise.all(
  friendRecords.map(async (fr) => {
    const profile = await getUserProfile(fr.friendId);
    if (profile) {
      profiles.set(fr.friendId, profile);
    }
  })
);
// Python equivalent: await asyncio.gather(*[get_profile(fr.id) for fr in records])
```

## Imports and Exports

```python
# Python
from services.auth import sign_in_with_apple, sign_out
import services.users as users
```

```typescript
// TypeScript — named imports (from app/login.tsx:12)
import { signInWithApple, signInWithGoogle, signUpWithEmail } from '../src/services/auth';

// Default import (from app/_layout.tsx:2)
import { Stack } from 'expo-router';

// To make something importable, you export it:

// Named export (from src/services/auth.ts:32)
export async function signInWithApple(): Promise<FirebaseUser> { ... }

// Default export (from app/login.tsx:18)
export default function LoginScreen() { ... }
```

**Differences from Python:**
- You must explicitly `export` things (Python makes everything importable by default)
- Paths use `./` or `../` (relative) — no Python-style `package.module` dots
- `export default` = one main thing per file; `export` = named exports (can have many)

## Template Literals (f-strings)

```python
# Python
name = "Blake"
greeting = f"Hello, {name}!"
```

```typescript
// TypeScript — uses backticks and ${} instead of f"" and {}
const name = "Blake";
const greeting = `Hello, ${name}!`;

// From functions/src/index.ts:174
body: `${displayName} is available for the next ${durationLabel}`,
```

## TypeScript Type Annotations

TypeScript type annotations work like Python type hints, but they're *enforced* — your code won't compile if types don't match.

```python
# Python type hints (not enforced at runtime)
def greet(name: str, age: int) -> str:
    return f"Hi {name}, you're {age}"

scores: list[int] = [1, 2, 3]
user: dict[str, str] = {"name": "Blake"}
maybe_name: str | None = None
```

```typescript
// TypeScript type annotations (enforced at compile time)
function greet(name: string, age: number): string {
  return `Hi ${name}, you're ${age}`;
}

const scores: number[] = [1, 2, 3];
const user: Record<string, string> = { name: "Blake" };
let maybeName: string | null = null;
```

### Interfaces — Defining Data Shapes

This is like Python's `TypedDict` or a `dataclass`, but more powerful:

```typescript
// From src/types/index.ts:1-14
export interface User {
  uid: string;                    // required string
  displayName: string;            // required string
  username: string;               // required string
  photoUrl: string | null;        // required, but can be null
  createdAt: Date;                // required Date object
  pushToken?: string;             // OPTIONAL (the ? means it might not exist)
  isPublic?: boolean;             // OPTIONAL
  contactMethods?: {              // OPTIONAL nested object
    phone?: string;
    facetime?: string;
    whatsapp?: string;
  };
}
```

```python
# Python equivalent would be:
from typing import TypedDict, Optional

class User(TypedDict):
    uid: str
    displayName: str
    username: str
    photoUrl: str | None
    createdAt: datetime
    pushToken: str  # Not required in TypedDict — you'd use NotRequired
    isPublic: bool  # same
```

### Union Types and Literal Types

```typescript
// From src/types/index.ts:16
export type FrequencyGoal = 'daily' | 'weekly' | 'monthly' | 'quarterly';
// This means FrequencyGoal can ONLY be one of these 4 exact strings
// Python equivalent: Literal['daily', 'weekly', 'monthly', 'quarterly']

// From src/types/index.ts:18-32
export interface FriendRecord {
  friendId: string;
  status: 'pending_sent' | 'pending_received' | 'accepted';  // union of literals
  createdAt: Date;
  lastConnectionAt: Date | null;   // Date OR null (like Optional[datetime])
  connectionCount: number;
  frequencyGoal: FrequencyGoal | null;
  snoozedUntil: Date | null;
}
```

### Generics

Generics let you write code that works with different types. Python has the same concept:

```python
# Python
def first_item(items: list[T]) -> T:
    return items[0]
```

```typescript
// TypeScript
function firstItem<T>(items: T[]): T {
  return items[0];
}

// Real usage from src/hooks/useAvailability.ts:14
const [availability, setAvailabilityState] = useState<Availability | null>(null);
// useState is generic — <Availability | null> tells it what type the state holds

// From src/hooks/useAuth.tsx:8
const [friendProfiles, setFriendProfiles] = useState<Map<string, User>>(new Map());
// The state is a Map from string keys to User values
```

### The `Partial`, `Pick`, and `Omit` Utility Types

```typescript
// From src/services/users.ts:43-45
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<User, 'displayName' | 'username' | 'photoUrl' | 'pushToken' | 'isPublic'>>
): Promise<void> { ... }

// Breaking this down:
// Pick<User, 'displayName' | 'username'>  →  { displayName: string; username: string }
//    (grabs only those fields from User)
// Partial<...>  →  { displayName?: string; username?: string }
//    (makes all fields optional)

// Python equivalent: no built-in equivalent, you'd just use **kwargs or a TypedDict
```

## Common Gotchas

### `===` vs `==`
```typescript
// ALWAYS use === (strict equality) in JavaScript
"5" == 5    // true  (JS converts types — BAD!)
"5" === 5   // false (different types — CORRECT!)

// Python doesn't have this problem: "5" == 5 is always False
```

### `null` vs `undefined`
```typescript
// JavaScript has TWO "nothing" values (Python only has None)
let a;           // undefined — variable exists but has no value
let b = null;    // null — explicitly set to "nothing"

// In HereNow, we generally use null (from src/types/index.ts):
photoUrl: string | null;       // null = no photo
lastConnectionAt: Date | null; // null = never connected

// Optional fields use undefined:
pushToken?: string;  // undefined = field not present at all
```

### Truthy/Falsy
```typescript
// These are "falsy" in JS (evaluate to false in an if):
if (0) ...          // falsy
if ("") ...         // falsy
if (null) ...       // falsy
if (undefined) ...  // falsy
if (false) ...      // falsy
if (NaN) ...        // falsy

// Everything else is "truthy", INCLUDING:
if ([]) ...         // truthy! (Python: empty list is falsy)
if ({}) ...         // truthy! (Python: empty dict is falsy)

// Real usage from app/(tabs)/index.tsx:108
const inConversation = availability?.inConversation || false;
// If availability is null/undefined, or inConversation is falsy, default to false
```

### Optional Chaining (`?.`)
```typescript
// Instead of checking for null at every step:
if (user && user.profile && user.profile.name) { ... }

// Use optional chaining:
const name = user?.profile?.name;
// Returns undefined if any part is null/undefined

// From app/(tabs)/index.tsx:46
const { firebaseUser } = useAuth();
// ... later:
useFriends(firebaseUser?.uid);
// If firebaseUser is null, passes undefined instead of crashing
```

### Nullish Coalescing (`??`)
```typescript
// ?? returns the right side ONLY if the left is null or undefined
const name = user.displayName ?? 'Unknown';

// Different from || which also triggers on 0, "", false:
const count = data.count ?? 0;   // if count is 0, keeps 0
const count = data.count || 0;   // if count is 0, replaces with 0 (probably wrong!)

// From src/services/users.ts:37
isPublic: data.isPublic ?? true,  // default to true if not set
```

## Spread Operator (`...`)

```typescript
// Spread an array (like Python's * unpacking)
const quickDurations = [15, 30, 60];
const allDurations = [5, ...quickDurations, 120];
// Result: [5, 15, 30, 60, 120]

// Spread an object (like Python's ** unpacking)
const base = { name: "Blake", age: 30 };
const updated = { ...base, age: 31 };
// Result: { name: "Blake", age: 31 }

// Real usage from src/utils/priority.ts:117
return [...friends].sort(
  (a, b) => computePriority(b, now) - computePriority(a, now)
);
// Creates a copy of the array (don't mutate the original), then sorts
```

## Going Deeper

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/) — official guide
- [JavaScript for Python Developers](https://www.valentinog.com/blog/python-js/) — targeted comparison
- [MDN JavaScript Reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference) — the definitive JS reference (like Python docs)

Next: **[React Fundamentals](./02-react-fundamentals.md)** — how these language features come together to build UI.
