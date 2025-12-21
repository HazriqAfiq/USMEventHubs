

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, where, getCountFromServer } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from 'date-fns';
import { Button } from './ui/button';
import { FilePenLine, Trash2, Users, XCircle, MessageSquare, Eye, Clock, CheckCircle2, X } from 'lucide-react';
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
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface OrganizerEventListProps {
  monthFilter: Date | null;
  onClearMonthFilter: () => void;
}

export default function OrganizerEventList({ monthFilter: chartMonthFilter, onClearMonthFilter }: OrganizerEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [participantCounts, setParticipantCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming');
  const [monthFilter, setMonthFilter] = useState<string>('all');
  const { user, isOrganizer, loading: authLoading } = useAuth();


  useEffect(() => {
    if (authLoading || !isOrganizer || !user) {
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
  }, [authLoading, isOrganizer, user]);
  
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

  const handleDelete = async (eventToDelete: Event) => {
    try {
      // An organizer can only delete events that are not approved
      if (eventToDelete.status === 'approved') {
        toast({
          variant: 'destructive',
          title: 'Action Not Allowed',
          description: 'Cannot delete an event that has been approved. Contact a superadmin for assistance.',
        });
        return;
      }

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
        description: `"${eventToDelete.title}" and its associated images have been removed.`,
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
  
  const StatusBadge = ({ event }: { event: Event }) => {
    const statusConfig = {
      approved: {
        label: 'Approved',
        icon: CheckCircle2,
        className: 'bg-green-500/20 text-green-400 border-green-500/30',
        tooltip: 'This event is live and visible to students.'
      },
      pending: {
        label: 'Pending',
        icon: Clock,
        className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        tooltip: 'This event is awaiting approval from a superadmin.'
      },
      rejected: {
        label: 'Rejected',
        icon: X,
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
        tooltip: event.rejectionReason ? `Reason: ${event.rejectionReason}` : 'This event has been rejected.'
      }
    };

    const config = statusConfig[event.status];
    if (!config) return null;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
             <Badge className={cn('capitalize', config.className)}>
                <config.icon className="mr-1.5 h-3 w-3" />
                {config.label}
              </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

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
                 <span className='flex items-center'>
                    <Eye className="mr-1.5 h-4 w-4" />
                    {event.viewCount ?? 0}
                </span>
              </div>
               <div className="mt-2">
                <StatusBadge event={event} />
              </div>
            </div>
            <div className='flex gap-2 flex-shrink-0'>
               <Link href={`/event/${event.id}`}>
                <Button variant="outline" size="icon" disabled={event.status !== 'approved'}>
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
                  <Button variant="destructive" size="icon" disabled={event.status === 'approved'}>
                    <Trash2 className="h-4 w-4" />
                    <span className="sr-only">Delete Event</span>
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete the event "{event.title}" and its associated images from storage.
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

