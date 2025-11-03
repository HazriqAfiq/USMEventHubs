import type { Timestamp } from 'firebase/firestore';

export interface Event {
  id: string;
  title: string;
  date: Timestamp;
  description: string;
  imageUrl: string;
  imageHint: string;
  keywords?: string[];
}
