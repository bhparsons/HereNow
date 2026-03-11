import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const serviceAccount = require('../secrets/herenow-79f9e-firebase-adminsdk-fbsvc-19dc8f9d2c.json');
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();
const auth = getAuth();

const TEST_USERS = [
  { email: 'alice@test.herenow.app', password: 'Test1234!', displayName: 'Alice Johnson', username: 'alice_j', isPublic: true },
  { email: 'bob@test.herenow.app', password: 'Test1234!', displayName: 'Bob Smith', username: 'bob_smith', isPublic: true },
  { email: 'charlie@test.herenow.app', password: 'Test1234!', displayName: 'Charlie Brown', username: 'charlie_b', isPublic: true },
  { email: 'diana@test.herenow.app', password: 'Test1234!', displayName: 'Diana Prince', username: 'diana_p', isPublic: false },
  { email: 'eve@test.herenow.app', password: 'Test1234!', displayName: 'Eve Wilson', username: 'eve_w', isPublic: true },
];

async function seed() {
  for (const user of TEST_USERS) {
    try {
      // Check if auth user already exists by email
      let uid: string;
      try {
        const existing = await auth.getUserByEmail(user.email);
        uid = existing.uid;
        console.log(`  Auth user already exists: ${user.username} (${uid})`);
      } catch {
        const record = await auth.createUser({
          email: user.email,
          password: user.password,
          displayName: user.displayName,
        });
        uid = record.uid;
        console.log(`  Created auth user: ${user.username} (${uid})`);
      }

      await db.collection('users').doc(uid).set({
        displayName: user.displayName,
        username: user.username,
        photoUrl: null,
        isPublic: user.isPublic,
        createdAt: FieldValue.serverTimestamp(),
      });

      console.log(`  Firestore profile set: ${user.username} (isPublic: ${user.isPublic})`);
    } catch (err: any) {
      console.error(`  Failed for ${user.username}: ${err.message}`);
    }
  }

  console.log('\nDone seeding test users.');
  process.exit(0);
}

seed();
