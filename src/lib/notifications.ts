

import { db } from './firebase';
import { collection, writeBatch, serverTimestamp, doc, getDocs, query, where } from 'firebase/firestore';

/**
 * Sends a notification to a list of users.
 * @param userIds - An array of user UIDs to send the notification to.
 * @param message - The notification message.
 * @param href - The URL the notification should link to.
 * @param eventId - The ID of the event this notification is related to.
 * @param organizerId - The UID of the organizer triggering the notification.
 * @param updateReason - The reason for the event update, if applicable.
 */
export async function sendNotificationToUsers(
    userIds: string[], 
    message: string, 
    href: string,
    eventId: string, // Added eventId
    organizerId?: string | null,
    updateReason?: string
) {
    if (userIds.length === 0) return;
    
    const batch = writeBatch(db);

    userIds.forEach(uid => {
        const notifRef = doc(collection(db, 'users', uid, 'notifications'));
        const notificationData: any = {
            message,
            href,
            createdAt: serverTimestamp(),
            read: false,
            eventId: eventId, // Include eventId for security rule validation
            organizerId: organizerId || null,
        };
        if (updateReason) {
            notificationData.updateReason = updateReason;
        }
        batch.set(notifRef, notificationData);
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

/**
 * Fetches the UIDs of all users with the 'superadmin' role.
 * @returns A promise that resolves to an array of superadmin user UIDs.
 */
export async function getSuperAdminUserIds(): Promise<string[]> {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('role', '==', 'superadmin'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.id);
    } catch (error) {
        console.error("Failed to get superadmin users:", error);
        return [];
    }
}
