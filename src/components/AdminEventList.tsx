'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from 'date-fns';
import { Button } from './ui/button';
import { FilePenLine, Trash2, Users, XCircle } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface AdminEventListProps {
  monthFilter: Date | null;
  onClearMonthFilter: () => void;
}

export default function AdminEventList({ monthFilter: chartMonthFilter, onClearMonthFilter }: AdminEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [participantCounts, setParticipantCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const { user, isAdmin, loading: authLoading } = useAuth();


  useEffect(() => {
    if (authLoading || !isAdmin || !user) {
        if (!authLoading) setLoading(false);
        return;
    }
    
    const eventsRef = collection(db, 'events');
    const q = query(
      eventsRef,
      where('organizerId', '==', user.uid)
    );

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
  }, [authLoading, isAdmin, user]);
  
  useEffect(() => {
    // Set up listeners for participant counts for each event
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

    // Cleanup listeners on component unmount or when events change
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [events]);


  const { filteredEvents, availableMonths } = useMemo(() => {
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

    let baseFilteredEvents: Event[];
    
    if (chartMonthFilter) {
      const interval = { start: startOfMonth(chartMonthFilter), end: endOfMonth(chartMonthFilter) };
      baseFilteredEvents = events.filter(event => isWithinInterval(event.date.toDate(), interval));
    } else {
      if (filter === 'upcoming') {
        baseFilteredEvents = events.filter(event => {
            const eventEndDate = getEventEndTime(event);
            return eventEndDate ? eventEndDate >= now : false;
        });
      } else if (filter === 'past') {
        baseFilteredEvents = events.filter(event => {
            const eventEndDate = getEventEndTime(event);
            return eventEndDate ? eventEndDate < now : true;
        });
      } else {
         baseFilteredEvents = events;
      }
    }
    
    const pastEvents = events.filter(event => {
      const eventEndDate = getEventEndTime(event);
      return eventEndDate ? eventEndDate < now : true;
    });

    const monthSet = new Set<string>();
    pastEvents.forEach(event => {
        monthSet.add(format(event.date.toDate(), 'yyyy-MM'));
    });
    const availableMonths = Array.from(monthSet);
      
    if (!chartMonthFilter && filter === 'past' && monthFilter !== 'all') {
      const selectedMonthDate = new Date(monthFilter);
      const interval = {
          start: startOfMonth(selectedMonthDate),
          end: endOfMonth(selectedMonthDate)
      };
      baseFilteredEvents = baseFilteredEvents.filter(event => isWithinInterval(event.date.toDate(), interval));
    }

    return { filteredEvents: baseFilteredEvents, availableMonths };
  }, [events, filter, monthFilter, chartMonthFilter]);

  const handleDelete = async (eventId: string, eventTitle: string) => {
    try {
      await deleteDoc(doc(db, 'events', eventId));
      toast({
        title: 'Event Deleted',
        description: `"${eventTitle}" has been removed.`,
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
  
  useEffect(() => {
    // Reset month filter when main filter changes
    setMonthFilter('all');
  }, [filter]);

  if (loading || authLoading) {
    return (
      <div className="mt-6 space-y-4">
        {[...Array(2)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
       <div className="flex flex-wrap gap-4 justify-between items-center">
        {!chartMonthFilter ? (
          <>
            <ToggleGroup
              type="single"
              variant="outline"
              value={filter}
              onValueChange={(value) => {
                if (value) setFilter(value as any);
              }}
            >
              <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
              <ToggleGroupItem value="past">Past</ToggleGroupItem>
              <ToggleGroupItem value="all">All</ToggleGroupItem>
            </ToggleGroup>

            {filter === 'past' && availableMonths.length > 0 && (
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map(monthStr => (
                            <SelectItem key={monthStr} value={monthStr}>
                                {format(new Date(monthStr), 'MMMM yyyy')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
          </>
        ) : (
          <div className="w-full">
            <Button variant="ghost" onClick={onClearMonthFilter}>
              <XCircle className="mr-2 h-4 w-4" />
              Clear filter for {format(chartMonthFilter, 'MMMM yyyy')}
            </Button>
          </div>
        )}
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          No events found for the selected criteria.
        </Card>
      ) : (
        filteredEvents.map((event) => (
          <Card key={event.id} className="flex items-center p-4 gap-4 transition-all hover:shadow-md">
            <div className="relative h-16 w-16 md:h-20 md:w-28 rounded-md overflow-hidden flex-shrink-0 bg-muted">
              <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
            </div>
            <div className="flex-grow overflow-hidden">
              <h3 className="font-bold truncate">{event.title}</h3>
              <div className="flex items-center gap-x-4 text-sm text-muted-foreground">
                <span>{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</span>
                <span className='flex items-center'>
                    <Users className="mr-1.5 h-4 w-4" />
                    {participantCounts[event.id] ?? 0}
                </span>
              </div>
            </div>
            <div className='flex gap-2 flex-shrink-0'>
              <Link href={`/admin/edit/${event.id}`}>
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
                    <AlertDialogAction onClick={() => handleDelete(event.id, event.title)}>
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
