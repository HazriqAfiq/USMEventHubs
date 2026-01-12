

import type { Timestamp } from 'firebase/firestore';

export interface Registration {
  id: string; // Corresponds to the user's UID
  name: string;
  matricNo: string;
  faculty: string;
  registeredAt: Timestamp;
  paymentProofUrl?: string;
  attended: boolean;
}

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
  endDate?: Timestamp;
  startTime: string;
  endTime: string;
  description: string;
  imageUrl: string;
  videoUrl?: string;
  location: string;
  isFree: boolean;
  price?: number;
  eventType: 'online' | 'physical';
  registrations?: Registration[]; // UID of registered users
  organizerId?: string; // UID of the organizer who created the event
  groupLink?: string;
  qrCodeUrl?: string;
  conductingCampus: string;
  eligibleCampuses?: string[];
  viewCount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'pending-update' | 'pending-deletion';
  rejectionReason?: string;
  updateReason?: string;
  isApprovedOnce?: boolean; // Flag to track if event has ever been approved
  deletionReason?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'organizer' | 'student' | 'superadmin' | 'admin' | 'pending-organizer';
  name?: string;
  photoURL?: string | null;
  campus?: string;
  disabled?: boolean;
}

export interface OrganizerApplication {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    organizationName: string;
    organizationDesc: string;
    socialLink?: string;
    proofUrl: string;
    campus: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: Timestamp;
    rejectionReason?: string;
}


export interface AppNotification {
    id: string;
    message: string;
    href: string;
    createdAt: Timestamp;
    read: boolean;
    eventId?: string;
    updateReason?: string;
}
