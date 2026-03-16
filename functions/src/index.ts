import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { assignTiers } from './priority';

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * When a user sets themselves as available:
 * 1. Detect overlapping availability (auto-log connections)
 * 2. Compute friend tiers based on priority
 * 3. Write tier data to the availability doc
 * 4. Send push notifications (with cooldown rate limiting)
 */
export const onAvailabilityCreated = onDocumentCreated(
  'availability/{userId}',
  async (event) => {
    const userId = event.params.userId;
    const data = event.data?.data();
    if (!data || !data.isAvailable) return;

    // Get the user's display name
    const userDoc = await db.doc(`users/${userId}`).get();
    const userData = userDoc.data();
    if (!userData) return;

    const displayName = userData.displayName || 'Someone';

    // Calculate duration label
    const availableUntil = data.availableUntil.toDate();
    const now = new Date();
    const diffMinutes = Math.round(
      (availableUntil.getTime() - now.getTime()) / 60000
    );
    let durationLabel: string;
    if (diffMinutes >= 60) {
      const hours = Math.floor(diffMinutes / 60);
      durationLabel = `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      durationLabel = `${diffMinutes} minutes`;
    }

    // Get all accepted friends with their priority data
    const friendsSnap = await db
      .collection(`users/${userId}/friends`)
      .where('status', '==', 'accepted')
      .get();

    if (friendsSnap.empty) return;

    // Build friend data for priority computation
    const friendDataList = friendsSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        friendId: doc.id,
        lastConnectionAt: d.lastConnectionAt?.toDate() || null,
        connectionCount: d.connectionCount || 0,
        frequencyGoal: d.frequencyGoal || null,
        snoozedUntil: d.snoozedUntil?.toDate() || null,
      };
    });

    // Phase 1: Overlap detection - check if any friends are also available
    const friendIds = friendDataList.map((f) => f.friendId);
    const overlapPromises: Promise<void>[] = [];

    // Batch check availability (max 30 per query)
    for (let i = 0; i < friendIds.length; i += 30) {
      const batch = friendIds.slice(i, i + 30);
      const availSnap = await db
        .collection('availability')
        .where(admin.firestore.FieldPath.documentId(), 'in', batch)
        .get();

      for (const availDoc of availSnap.docs) {
        const friendAvail = availDoc.data();
        if (
          friendAvail.isAvailable &&
          friendAvail.availableUntil.toDate() > now
        ) {
          // Both available at the same time - auto-log overlap connection
          const orderedIds =
            userId < availDoc.id
              ? [userId, availDoc.id]
              : [availDoc.id, userId];

          overlapPromises.push(
            db.collection('connections').add({
              userIds: orderedIds,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
              type: 'overlap',
              reportedBy: null,
            }).then(async () => {
              // Denormalize to friend subcollections
              const ts = admin.firestore.FieldValue.serverTimestamp();
              const inc = admin.firestore.FieldValue.increment(1);
              await db
                .doc(`users/${userId}/friends/${availDoc.id}`)
                .update({ lastConnectionAt: ts, connectionCount: inc });
              await db
                .doc(`users/${availDoc.id}/friends/${userId}`)
                .update({ lastConnectionAt: ts, connectionCount: inc });
            })
          );
        }
      }
    }

    // Wait for overlap logging
    await Promise.all(overlapPromises);

    // Phase 2/3: Compute tiers
    const tierMap = assignTiers(friendDataList, now);

    // Build tier reveal times (all immediate now — client handles staggered display)
    const tierRevealTimes: Record<number, admin.firestore.Timestamp> = {};
    const nowTimestamp = admin.firestore.Timestamp.fromDate(now);
    for (let tier = 1; tier <= 4; tier++) {
      tierRevealTimes[tier] = nowTimestamp;
    }

    // Build friendTiers object
    const friendTiers: Record<string, number> = {};
    for (const [friendId, tier] of tierMap) {
      friendTiers[friendId] = tier;
    }

    // Write tier data to availability doc
    await db.doc(`availability/${userId}`).update({
      tierRevealTimes,
      friendTiers,
    });

    // Send push notifications with cooldown rate limiting
    // Sort friends by tier (highest priority first) for digest ordering
    const sortedFriends = Array.from(tierMap.entries()).sort(
      ([, tierA], [, tierB]) => tierA - tierB
    );

    const messages: ExpoPushMessage[] = [];

    for (const [friendId] of sortedFriends) {
      // Check per-friend notification preference
      const friendFriendDoc = await db
        .doc(`users/${friendId}/friends/${userId}`)
        .get();
      const friendFriendData = friendFriendDoc.data();
      if (friendFriendData?.notificationsEnabled === false) continue;

      // Get recipient's user doc (needed for push token + global toggle)
      const friendUserDoc = await db.doc(`users/${friendId}`).get();
      const friendData = friendUserDoc.data();
      if (!friendData?.pushToken) continue;
      if (!Expo.isExpoPushToken(friendData.pushToken)) continue;

      // Check global availability notifications toggle
      if (friendData.availabilityNotificationsEnabled === false) continue;

      // Check cooldown
      const cooldownRef = db.doc(`notificationCooldowns/${friendId}`);
      const cooldownDoc = await cooldownRef.get();
      const cooldownData = cooldownDoc.data();

      const lastNotifiedAt = cooldownData?.lastNotifiedAt?.toDate();
      const isInCooldown =
        lastNotifiedAt && now.getTime() - lastNotifiedAt.getTime() < COOLDOWN_MS;

      if (isInCooldown) {
        // Append to pending names for digest
        await cooldownRef.update({
          pendingNames: admin.firestore.FieldValue.arrayUnion(displayName),
        });
      } else {
        // Send immediately
        messages.push({
          to: friendData.pushToken,
          sound: 'default',
          title: 'HereNow',
          body: `${displayName} is available for the next ${durationLabel}`,
          data: { userId, type: 'availability' },
        });

        // Update cooldown record
        await cooldownRef.set({
          lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          pendingNames: [],
        });
      }
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('Error sending push notifications:', error);
        }
      }
    }
  }
);

/**
 * Scheduled digest: send batched notifications for users in cooldown.
 * Runs every 5 minutes.
 */
export const sendDigestNotifications = onSchedule(
  'every 5 minutes',
  async () => {
    const now = admin.firestore.Timestamp.now();
    const cutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - COOLDOWN_MS
    );

    // Find cooldown docs with pending names whose cooldown has expired
    const cooldownSnap = await db
      .collection('notificationCooldowns')
      .where('lastNotifiedAt', '<=', cutoff)
      .get();

    const messages: ExpoPushMessage[] = [];

    for (const doc of cooldownSnap.docs) {
      const data = doc.data();
      const pendingNames: string[] = data.pendingNames || [];
      if (pendingNames.length === 0) continue;

      const recipientId = doc.id;
      const recipientDoc = await db.doc(`users/${recipientId}`).get();
      const recipientData = recipientDoc.data();
      if (!recipientData?.pushToken) continue;
      if (!Expo.isExpoPushToken(recipientData.pushToken)) continue;
      if (recipientData.availabilityNotificationsEnabled === false) continue;

      // Build digest body
      let body: string;
      if (pendingNames.length === 1) {
        body = `${pendingNames[0]} is now online`;
      } else {
        const othersCount = pendingNames.length - 1;
        body = `${pendingNames[0]} and ${othersCount} ${othersCount === 1 ? 'other' : 'others'} are now online`;
      }

      messages.push({
        to: recipientData.pushToken,
        sound: 'default',
        title: 'HereNow',
        body,
        data: { type: 'availability_digest' },
      });

      // Clear pending and update timestamp
      await doc.ref.update({
        pendingNames: [],
        lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    if (messages.length > 0) {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        try {
          await expo.sendPushNotificationsAsync(chunk);
        } catch (error) {
          console.error('Error sending digest notifications:', error);
        }
      }
      console.log(`Sent ${messages.length} digest notifications`);
    }
  }
);

/**
 * Scheduled cleanup: remove expired availability documents and old cooldown records.
 * Runs every 5 minutes.
 */
export const cleanupExpiredAvailability = onSchedule(
  'every 5 minutes',
  async () => {
    const now = admin.firestore.Timestamp.now();

    // Clean up expired availability
    const expiredSnap = await db
      .collection('availability')
      .where('availableUntil', '<=', now)
      .get();

    const batch = db.batch();
    for (const doc of expiredSnap.docs) {
      batch.delete(doc.ref);
    }

    // Clean up old cooldown records (older than 1 hour)
    const cooldownCutoff = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 60 * 60 * 1000
    );
    const oldCooldowns = await db
      .collection('notificationCooldowns')
      .where('lastNotifiedAt', '<=', cooldownCutoff)
      .get();

    for (const doc of oldCooldowns.docs) {
      batch.delete(doc.ref);
    }

    const totalCleaned = expiredSnap.size + oldCooldowns.size;
    if (totalCleaned > 0) {
      await batch.commit();
      console.log(
        `Cleaned up ${expiredSnap.size} expired availability records and ${oldCooldowns.size} old cooldown records`
      );
    }
  }
);
