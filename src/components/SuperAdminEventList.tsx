
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, where } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { FilePenLine, Trash2, Users, MessageSquare, Eye, XCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import type { Event } from '@/types';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/hooks/use-auth';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

interface SuperAdminEventListProps {
  organizerFilter: { id: string, name: string } | null;
  onClearOrganizerFilter: () => void;
}


export default function SuperAdminEventList({ organizerFilter, onClearOrganizerFilter }: SuperAdminEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [participantCounts, setParticipantCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { user, isSuperAdmin, loading: authLoading } = useAuth();


  useEffect(() => {
    if (authLoading || !isSuperAdmin) {
        if (!authLoading) setLoading(false);
        return;
    }
    
    const eventsRef = collection(db, 'events');
    const q = query(eventsRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: Event[] = [];
      querySnapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      eventsData.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, isSuperAdmin]);
  
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];
    events.forEach(event => {
      const registrationsRef = collection(db, 'events', event.id, 'registrations');
      const unsubscribe = onSnapshot(registrationsRef, (snapshot) => {
        setParticipantCounts(prevCounts => ({
          ...prevCounts,
          [event.id]: snapshot.size
        }));
      }, (error) => {
        console.error(`Error fetching registrations for event ${event.id}:`, error);
      });
      unsubscribers.push(unsubscribe);
    });
    return () => unsubscribers.forEach(unsub => unsub());
  }, [events]);


  const filteredEvents = useMemo(() => {
    const now = new Date();

    const getEventEndTime = (event: Event): Date | null => {
        if (event.date && event.endTime) {
            const eventEndDate = event.date.toDate();
            const [endHours, endMinutes] = event.endTime.split(':').map(Number);
            eventEndDate.setHours(endHours, endMinutes, 0, 0);
            return eventEndDate;
        }
        return null;
    }

    return events.filter(event => {
      const timeFilter =
        filter === 'all' ||
        (filter === 'upcoming' && (getEventEndTime(event) ?? new Date(0)) >= now) ||
        (filter === 'past' && (getEventEndTime(event) ?? new Date(0)) < now);

      const searchFilter =
        !searchQuery ||
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const organizerMatch = !organizerFilter || event.organizerId === organizerFilter.id;

      return timeFilter && searchFilter && organizerMatch;
    });
  }, [events, filter, searchQuery, organizerFilter]);

  const handleDelete = async (eventToDelete: Event) => {
    if (!isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied' });
      return;
    }
    try {
      if (eventToDelete.imageUrl) {
        try {
          const imageRef = ref(storage, eventToDelete.imageUrl);
          await deleteObject(imageRef);
        } catch (storageError: any) {
          if (storageError.code !== 'storage/object-not-found') {
             console.error("Error deleting event image: ", storageError);
          }
        }
      }
      if (eventToDelete.qrCodeUrl) {
         try {
          const qrRef = ref(storage, eventToDelete.qrCodeUrl);
          await deleteObject(qrRef);
        } catch (storageError: any) {
           if (storageError.code !== 'storage/object-not-found') {
            console.error("Error deleting QR code image: ", storageError);
           }
        }
      }

      await deleteDoc(doc(db, 'events', eventToDelete.id));

      toast({
        title: 'Event Deleted',
        description: `"${eventToDelete.title}" has been removed.`,
      });

    } catch (error) {
      console.error("Error removing document: ", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: 'Could not remove the event from the database.',
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-1/2" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
       <div className="flex flex-wrap gap-4 justify-between items-center">
        <ToggleGroup
            type="single"
            variant="outline"
            value={filter}
            onValueChange={(value) => { if (value) setFilter(value as any); }}
        >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
            <ToggleGroupItem value="past">Past</ToggleGroupItem>
        </ToggleGroup>

        <Input
          placeholder="Search by event title or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

       {organizerFilter && (
        <div className="flex items-center gap-2">
            <p className="text-sm text-muted-foreground">Filtering by organizer:</p>
            <Badge variant="secondary" className="text-base">
            {organizerFilter.name}
            <button onClick={onClearOrganizerFilter} className="ml-2 rounded-full hover:bg-muted-foreground/20 p-0.5">
                <XCircle className="h-3 w-3"/>
            </button>
            </Badge>
        </div>
      )}


      {filteredEvents.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No events found for the selected criteria.
        </Card>
      ) : (
        filteredEvents.map((event) => (
          <Card key={event.id} className="flex items-start sm:items-center p-4 gap-4 transition-all hover:shadow-md flex-col sm:flex-row">
            <div className="relative h-16 w-full sm:w-28 sm:h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
            </div>
            <div className="flex-grow overflow-hidden">
              <h3 className="font-bold truncate">{event.title}</h3>
              <p className="text-xs text-muted-foreground">ID: {event.id}</p>
              <div className="flex items-center flex-wrap gap-x-4 text-sm text-muted-foreground mt-1">
                <span>{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</span>
                <span className='flex items-center'>
                    <Users className="mr-1.5 h-4 w-4" />
                    {participantCounts[event.id] ?? 0}
                </span>
                 <span className='flex items-center'>
                    <Eye className="mr-1.5 h-4 w-4" />
                    {event.viewCount ?? 0}
                </span>
              </div>
              <div className="mt-1">
                <Badge variant="secondary">{event.conductingCampus}</Badge>
              </div>
            </div>
            <div className='flex gap-2 flex-shrink-0 self-end sm:self-center'>
               <Link href={`/event/${event.id}`}>
                <Button variant="outline" size="icon">
                  <MessageSquare className="h-4 w-4" />
                  <span className="sr-only">View Chat</span>
                </Button>
              </Link>
              <Link href={`/organizer/edit/${event.id}`}>
                <Button variant="outline" size="icon">
                  <FilePenLine className="h-4 w-4" />
                  <span className="sr-only">Edit Event</span>
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="icon">
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Event</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the event "{event.title}".
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(event)}>
                      Continue
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
