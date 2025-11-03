import type { Timestamp } from 'firebase/firestore';

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
  description: string;
  imageUrl: string;
  location: string;
  isFree: boolean;
  price?: number;
  eventType: 'online' | 'physical';
  registrationLink?: string;
  registrations?: string[];
}
