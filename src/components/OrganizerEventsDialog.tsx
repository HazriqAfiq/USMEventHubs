
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { format, isSameYear } from 'date-fns';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { Eye, Users } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface OrganizerEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizerId: string;
  organizerName: string;
  year: number;
}

export default function OrganizerEventsDialog({ isOpen, onClose, organizerId, organizerName, year }: OrganizerEventsDialogProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !organizerId) {
      return;
    }
    setLoading(true);

    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('organizerId', '==', organizerId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: Event[] = [];
      snapshot.forEach(doc => {
        const eventData = { id: doc.id, ...doc.data() } as Event;
        if (eventData.date && isSameYear(eventData.date.toDate(), new Date(year, 0, 1))) {
           fetchedEvents.push(eventData);
        }
      });
      
      fetchedEvents.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching organizer's events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, organizerId, year]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Events by {organizerName} ({year})</DialogTitle>
          <DialogDescription>
            A list of all events created by this organizer in {year}.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-center text-muted-foreground">No events found for this organizer in {year}.</p>
            ) : (
              events.map(event => (
                <Card key={event.id} className="p-4 flex items-center gap-4">
                  <div className="relative h-16 w-24 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="flex-grow">
                    <h4 className="font-semibold truncate">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">{format(event.date.toDate(), 'PPP')}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className='flex items-center'><Users className="mr-1.5 h-4 w-4" /> {event.registrations?.length ?? 0}</span>
                        <span className='flex items-center'><Eye className="mr-1.5 h-4 w-4" /> {event.viewCount ?? 0}</span>
                    </div>
                  </div>
                   <Button asChild variant="outline" size="sm">
                       <Link href={`/organizer/edit/${event.id}`}>
                           View
                       </Link>
                   </Button>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
