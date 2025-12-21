

import type { Timestamp } from 'firebase/firestore';

export interface Registration {
  id: string; // Corresponds to the user's UID
  name: string;
  matricNo: string;
  faculty: string;
  registeredAt: Timestamp;
  paymentProofUrl?: string;
}

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
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
  status: 'pending' | 'approved' | 'rejected' | 'pending-update';
  rejectionReason?: string;
  updateReason?: string;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  role: 'organizer' | 'student' | 'superadmin';
  name?: string;
  photoURL?: string | null;
  campus?: string;
  disabled?: boolean;
}
