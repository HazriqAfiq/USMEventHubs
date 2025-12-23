
import { db } from './firebase';
import { collection, writeBatch, serverTimestamp, doc, getDocs } from 'firebase/firestore';

/**
 * Sends a notification to a list of users.
 * @param userIds - An array of user UIDs to send the notification to.
 * @param message - The notification message.
 * @param href - The URL the notification should link to.
 * @param organizerId - The UID of the organizer triggering the notification.
 */
export async function sendNotificationToUsers(
    userIds: string[], 
    message: string, 
    href: string,
    organizerId?: string
) {
    if (userIds.length === 0) return;
    
    const batch = writeBatch(db);

    userIds.forEach(uid => {
        const notifRef = doc(collection(db, 'users', uid, 'notifications'));
        batch.set(notifRef, {
            message,
            href,
            createdAt: serverTimestamp(),
            read: false,
            organizerId, // Include organizerId for security rule validation
        });
    });

    try {
        await batch.commit();
    } catch (error) {
        console.error("Failed to send notifications:", error);
    }
}

/**
 * Fetches the UIDs of all users registered for a specific event.
 * @param eventId - The ID of the event.
 * @returns A promise that resolves to an array of user UIDs.
 */
export async function getRegisteredUserIds(eventId: string): Promise<string[]> {
    try {
        const registrationsRef = collection(db, 'events', eventId, 'registrations');
        const snapshot = await getDocs(registrationsRef);
        return snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error(`Failed to get registered users for event ${eventId}:`, error);
        return [];
    }
}
