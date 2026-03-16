import express from 'express';
import path from 'path';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const serviceAccount = require('../secrets/herenow-79f9e-firebase-adminsdk-fbsvc-19dc8f9d2c.json');
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const auth = getAuth();
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Users ───────────────────────────────────────────────────────────────────

app.get('/api/users', async (_req, res) => {
  try {
    const snap = await db.collection('users').get();
    const users = snap.docs.map((d) => {
      const data = d.data();
      return {
        uid: d.id,
        displayName: data.displayName,
        username: data.username,
        photoUrl: data.photoUrl ?? null,
        isPublic: data.isPublic ?? false,
        contactMethods: data.contactMethods ?? {},
        createdAt: data.createdAt?.toDate?.() ?? null,
      };
    });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { email, password, displayName, username } = req.body;
    if (!email || !password || !displayName || !username) {
      return res.status(400).json({ error: 'email, password, displayName, and username are required' });
    }

    // Create Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      displayName,
    });

    // Create Firestore profile
    await db.collection('users').doc(userRecord.uid).set({
      displayName,
      username,
      photoUrl: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    res.json({ uid: userRecord.uid, displayName, username, email });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { displayName, username, isPublic, contactMethods } = req.body;

    const update: Record<string, any> = {};
    if (displayName !== undefined) update.displayName = displayName;
    if (username !== undefined) update.username = username;
    if (isPublic !== undefined) update.isPublic = isPublic;
    if (contactMethods !== undefined) update.contactMethods = contactMethods;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    await db.collection('users').doc(uid).set(update, { merge: true });

    // Also update Auth displayName if changed
    if (displayName !== undefined) {
      await auth.updateUser(uid, { displayName });
    }

    res.json({ success: true, ...update });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    // Delete friends subcollection (both sides)
    const friendsSnap = await db.collection('users').doc(uid).collection('friends').get();
    for (const friendDoc of friendsSnap.docs) {
      // Remove from friend's side
      await db.collection('users').doc(friendDoc.id).collection('friends').doc(uid).delete();
      // Remove from this user's side
      await friendDoc.ref.delete();
    }

    // Delete availability
    await db.collection('availability').doc(uid).delete();

    // Delete Firestore profile
    await db.collection('users').doc(uid).delete();

    // Delete Auth account
    await auth.deleteUser(uid);

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Friends ─────────────────────────────────────────────────────────────────

app.get('/api/users/:uid/friends', async (req, res) => {
  try {
    const { uid } = req.params;
    const snap = await db.collection('users').doc(uid).collection('friends').get();
    const friends = snap.docs.map((d) => {
      const fd = d.data();
      return {
        friendId: d.id,
        status: fd.status,
        createdAt: fd.createdAt?.toDate?.() ?? null,
        frequencyGoal: fd.frequencyGoal ?? null,
        snoozedUntil: fd.snoozedUntil?.toDate?.() ?? null,
        notificationsEnabled: fd.notificationsEnabled ?? true,
        connectionCount: fd.connectionCount ?? 0,
        lastConnectionAt: fd.lastConnectionAt?.toDate?.() ?? null,
      };
    });
    res.json(friends);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/request', async (req, res) => {
  try {
    const { fromUid, toUid } = req.body;
    if (!fromUid || !toUid) {
      return res.status(400).json({ error: 'fromUid and toUid are required' });
    }
    if (fromUid === toUid) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check not already friends or pending
    const existing = await db.collection('users').doc(fromUid).collection('friends').doc(toUid).get();
    if (existing.exists) {
      return res.status(400).json({ error: 'Friend request already exists' });
    }

    // Sender side
    await db.collection('users').doc(fromUid).collection('friends').doc(toUid).set({
      status: 'pending_sent',
      createdAt: FieldValue.serverTimestamp(),
      lastConnectionAt: null,
      connectionCount: 0,
      frequencyGoal: null,
      snoozedUntil: null,
      notificationsEnabled: true,
    });

    // Receiver side
    await db.collection('users').doc(toUid).collection('friends').doc(fromUid).set({
      status: 'pending_received',
      createdAt: FieldValue.serverTimestamp(),
      lastConnectionAt: null,
      connectionCount: 0,
      frequencyGoal: null,
      snoozedUntil: null,
      notificationsEnabled: true,
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/accept', async (req, res) => {
  try {
    const { uid, friendId } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }

    await db.collection('users').doc(uid).collection('friends').doc(friendId).set(
      { status: 'accepted' },
      { merge: true }
    );
    await db.collection('users').doc(friendId).collection('friends').doc(uid).set(
      { status: 'accepted' },
      { merge: true }
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/decline', async (req, res) => {
  try {
    const { uid, friendId } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }

    await db.collection('users').doc(uid).collection('friends').doc(friendId).delete();
    await db.collection('users').doc(friendId).collection('friends').doc(uid).delete();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Friend Settings ────────────────────────────────────────────────────────

app.post('/api/friends/frequency-goal', async (req, res) => {
  try {
    const { uid, friendId, goal } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }
    await db.collection('users').doc(uid).collection('friends').doc(friendId).set(
      { frequencyGoal: goal ?? null },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/snooze', async (req, res) => {
  try {
    const { uid, friendId, days } = req.body;
    if (!uid || !friendId || !days) {
      return res.status(400).json({ error: 'uid, friendId, and days are required' });
    }
    const until = new Date();
    until.setDate(until.getDate() + days);
    const snoozedUntil = Timestamp.fromDate(until);
    await db.collection('users').doc(uid).collection('friends').doc(friendId).set(
      { snoozedUntil },
      { merge: true }
    );
    await db.collection('users').doc(friendId).collection('friends').doc(uid).set(
      { snoozedUntil },
      { merge: true }
    );
    res.json({ success: true, snoozedUntil: until.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/unsnooze', async (req, res) => {
  try {
    const { uid, friendId } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }
    await db.collection('users').doc(uid).collection('friends').doc(friendId).set(
      { snoozedUntil: null },
      { merge: true }
    );
    await db.collection('users').doc(friendId).collection('friends').doc(uid).set(
      { snoozedUntil: null },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/friends/toggle-notifications', async (req, res) => {
  try {
    const { uid, friendId } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }
    const friendDoc = await db.collection('users').doc(uid).collection('friends').doc(friendId).get();
    const current = friendDoc.data()?.notificationsEnabled ?? true;
    await db.collection('users').doc(uid).collection('friends').doc(friendId).set(
      { notificationsEnabled: !current },
      { merge: true }
    );
    res.json({ success: true, notificationsEnabled: !current });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Connections ─────────────────────────────────────────────────────────────

app.post('/api/connections/log', async (req, res) => {
  try {
    const { uid, friendId } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }

    const now = Timestamp.now();

    // Create connection record
    await db.collection('connections').add({
      userIds: [uid, friendId],
      timestamp: now,
      type: 'manual',
      reportedBy: uid,
    });

    // Update both sides' friend records
    const batch = db.batch();
    const userFriendRef = db.collection('users').doc(uid).collection('friends').doc(friendId);
    const friendFriendRef = db.collection('users').doc(friendId).collection('friends').doc(uid);

    const userFriendDoc = await userFriendRef.get();
    const friendFriendDoc = await friendFriendRef.get();

    batch.set(userFriendRef, {
      lastConnectionAt: now,
      connectionCount: (userFriendDoc.data()?.connectionCount || 0) + 1,
    }, { merge: true });

    batch.set(friendFriendRef, {
      lastConnectionAt: now,
      connectionCount: (friendFriendDoc.data()?.connectionCount || 0) + 1,
    }, { merge: true });

    await batch.commit();

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Availability ────────────────────────────────────────────────────────────

app.get('/api/availability', async (_req, res) => {
  try {
    const snap = await db.collection('availability').get();
    const availability = snap.docs.map((d) => {
      const data = d.data();
      return {
        userId: d.id,
        isAvailable: data.isAvailable,
        availableUntil: data.availableUntil?.toDate?.() ?? null,
        startedAt: data.startedAt?.toDate?.() ?? null,
        statusMessage: data.statusMessage ?? null,
        inConversation: data.inConversation ?? false,
        inConversationWith: data.inConversationWith ?? null,
      };
    });
    res.json(availability);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/availability', async (req, res) => {
  try {
    const { uid, durationMinutes, statusMessage } = req.body;
    if (!uid || !durationMinutes) {
      return res.status(400).json({ error: 'uid and durationMinutes are required' });
    }

    const now = new Date();
    const availableUntil = new Date(now.getTime() + durationMinutes * 60 * 1000);

    await db.collection('availability').doc(uid).set({
      isAvailable: true,
      availableUntil: Timestamp.fromDate(availableUntil),
      startedAt: Timestamp.fromDate(now),
      inConversation: false,
      inConversationWith: null,
      statusMessage: statusMessage || null,
    });

    res.json({ success: true, availableUntil: availableUntil.toISOString() });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/availability/:uid/status', async (req, res) => {
  try {
    const { uid } = req.params;
    const existing = await db.collection('availability').doc(uid).get();
    if (!existing.exists) {
      return res.status(400).json({ error: 'User is not currently available' });
    }
    const { statusMessage } = req.body;
    await db.collection('availability').doc(uid).set(
      { statusMessage: statusMessage || null },
      { merge: true }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/availability/in-conversation', async (req, res) => {
  try {
    const { uid, friendId, inConversation } = req.body;
    if (!uid || !friendId) {
      return res.status(400).json({ error: 'uid and friendId are required' });
    }

    // Only update docs that already exist — merging into a non-existent doc
    // creates a partial record missing startedAt/availableUntil, which crashes
    // the app's onSnapshot listener when it calls .toDate() on undefined.
    const [uidDoc, friendDoc] = await Promise.all([
      db.collection('availability').doc(uid).get(),
      db.collection('availability').doc(friendId).get(),
    ]);

    if (inConversation && (!uidDoc.exists || !friendDoc.exists)) {
      return res.status(400).json({ error: 'Both users must be available to start a conversation' });
    }

    const updates: { ref: FirebaseFirestore.DocumentReference; data: Record<string, any> }[] = [];
    if (uidDoc.exists) {
      updates.push({
        ref: db.collection('availability').doc(uid),
        data: inConversation
          ? { inConversation: true, inConversationWith: friendId }
          : { inConversation: false, inConversationWith: null },
      });
    }
    if (friendDoc.exists) {
      updates.push({
        ref: db.collection('availability').doc(friendId),
        data: inConversation
          ? { inConversation: true, inConversationWith: uid }
          : { inConversation: false, inConversationWith: null },
      });
    }

    await Promise.all(updates.map(u => u.ref.set(u.data, { merge: true })));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/availability/:uid', async (req, res) => {
  try {
    await db.collection('availability').doc(req.params.uid).delete();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Dashboard State ─────────────────────────────────────────────────────────

app.get('/api/state', async (_req, res) => {
  try {
    // Users
    const usersSnap = await db.collection('users').get();
    const users = await Promise.all(
      usersSnap.docs.map(async (d) => {
        const data = d.data();
        const friendsSnap = await d.ref.collection('friends').get();
        const friends = friendsSnap.docs.map((f) => {
          const fd = f.data();
          return {
            friendId: f.id,
            status: fd.status,
            frequencyGoal: fd.frequencyGoal ?? null,
            snoozedUntil: fd.snoozedUntil?.toDate?.() ?? null,
            notificationsEnabled: fd.notificationsEnabled ?? true,
            connectionCount: fd.connectionCount ?? 0,
            lastConnectionAt: fd.lastConnectionAt?.toDate?.() ?? null,
          };
        });
        return {
          uid: d.id,
          displayName: data.displayName,
          username: data.username,
          isPublic: data.isPublic ?? false,
          contactMethods: data.contactMethods ?? {},
          friends,
        };
      })
    );

    // Availability
    const availSnap = await db.collection('availability').get();
    const availability = availSnap.docs.map((d) => {
      const data = d.data();
      return {
        userId: d.id,
        isAvailable: data.isAvailable ?? true,
        availableUntil: data.availableUntil?.toDate?.() ?? null,
        startedAt: data.startedAt?.toDate?.() ?? null,
        statusMessage: data.statusMessage ?? null,
        inConversation: data.inConversation ?? false,
        inConversationWith: data.inConversationWith ?? null,
      };
    });

    res.json({ users, availability });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = 3456;
app.listen(PORT, () => {
  console.log(`HereNow Test Bench running at http://localhost:${PORT}`);
});
