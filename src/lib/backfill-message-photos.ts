/**
 * Backfill script for updating existing messages with senderPhotoURL from user profiles.
 * Run this in the browser console or import as a utility function.
 *
 * Usage: Import and call backfillMessagePhotos(eventId) to update all messages for an event.
 */

import { collection, query, getDocs, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function backfillMessagePhotos(eventId: string) {
  try {
    console.log(`Starting backfill for event: ${eventId}`);
    
    const messagesRef = collection(db, 'events', eventId, 'messages');
    const q = query(messagesRef);
    const messagesSnap = await getDocs(q);

    if (messagesSnap.empty) {
      console.log('No messages found for this event.');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const msgDoc of messagesSnap.docs) {
      const message = msgDoc.data();
      
      // Skip if senderPhotoURL already exists
      if (message.senderPhotoURL) {
        console.log(`Message ${msgDoc.id} already has photoURL, skipping.`);
        continue;
      }

      try {
        // Fetch user profile
        const userDocRef = doc(db, 'users', message.senderId);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          const photoURL = userSnap.data().photoURL || null;
          const name = userSnap.data().name || message.senderName;

          // Update message with photoURL and latest name
          await updateDoc(msgDoc.ref, {
            senderPhotoURL: photoURL,
            senderName: name,
          });

          console.log(`✓ Updated message ${msgDoc.id} with photoURL and name.`);
          updated++;
        } else {
          console.warn(`User profile not found for senderId: ${message.senderId}`);
          failed++;
        }
      } catch (err) {
        console.error(`Failed to update message ${msgDoc.id}:`, err);
        failed++;
      }
    }

    console.log(`\n✓ Backfill complete! Updated: ${updated}, Failed: ${failed}`);
  } catch (err) {
    console.error('Backfill error:', err);
  }
}

// Export as global for browser console access (optional)
if (typeof window !== 'undefined') {
  (window as any).backfillMessagePhotos = backfillMessagePhotos;
}
