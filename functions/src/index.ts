import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import { assignTiers } from './priority';

admin.initializeApp();
const db = admin.firestore();
const expo = new Expo();

// Tier -> delay in milliseconds for staggered notifications
const TIER_DELAYS: Record<number, number> = {
  1: 0,        // Immediate
  2: 30000,    // 30 seconds
  3: 60000,    // 1 minute
  4: 120000,   // 2 minutes
};

/**
 * When a user sets themselves as available:
 * 1. Detect overlapping availability (auto-log connections)
 * 2. Compute friend tiers based on priority
 * 3. Write tier data to the availability doc
 * 4. Send staggered push notifications
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

    // Build tier reveal times
    const tierRevealTimes: Record<number, admin.firestore.Timestamp> = {};
    for (let tier = 1; tier <= 4; tier++) {
      const delay = TIER_DELAYS[tier] || 0;
      tierRevealTimes[tier] = admin.firestore.Timestamp.fromMillis(
        now.getTime() + delay
      );
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

    // Phase 3: Send staggered push notifications by tier
    // Group friends by tier
    const tierGroups = new Map<number, string[]>();
    for (const [friendId, tier] of tierMap) {
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(friendId);
    }

    // Send notifications for each tier with appropriate delays
    for (const [tier, tierFriendIds] of tierGroups) {
      const delay = TIER_DELAYS[tier] || 0;

      const sendNotifications = async () => {
        const messages: ExpoPushMessage[] = [];

        for (const friendId of tierFriendIds) {
          const friendUserDoc = await db.doc(`users/${friendId}`).get();
          const friendData = friendUserDoc.data();
          if (!friendData?.pushToken) continue;
          if (!Expo.isExpoPushToken(friendData.pushToken)) continue;

          messages.push({
            to: friendData.pushToken,
            sound: 'default',
            title: 'HereNow',
            body: `${displayName} is available for the next ${durationLabel}`,
            data: { userId, type: 'availability' },
          });
        }

        if (messages.length === 0) return;

        const chunks = expo.chunkPushNotifications(messages);
        for (const chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk);
          } catch (error) {
            console.error(
              `Error sending tier ${tier} push notifications:`,
              error
            );
          }
        }
      };

      if (delay === 0) {
        await sendNotifications();
      } else {
        // Use setTimeout for staggered delivery (within Cloud Function v2 limits)
        setTimeout(sendNotifications, delay);
      }
    }
  }
);

/**
 * Scheduled cleanup: remove expired availability documents.
 * Runs every 5 minutes.
 */
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
      console.log(`Cleaned up ${expiredSnap.size} expired availability records`);
    }
  }
);
