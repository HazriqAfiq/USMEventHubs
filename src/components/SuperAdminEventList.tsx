

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { FilePenLine, Trash2, Users, MessageSquare, Eye, CheckCircle2, Clock, History, X, AlertTriangle } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/hooks/use-auth';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import EventDetailDialog from './EventDetailDialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';


const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function SuperAdminEventList() {
  const [events, setEvents] = useState<Event[]>([]);
  const [participantCounts, setParticipantCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-desc');
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const router = useRouter();

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
        // Defensive check for data integrity
        if (doc.data() && doc.data().date) {
            eventsData.push({ id: doc.id, ...doc.data() } as Event);
        }
      });
      setEvents(eventsData);
      setLoading(false);
    }, (serverError) => {
      const permissionError = new FirestorePermissionError({
        path: eventsRef.path,
        operation: 'list',
      }, serverError);
      errorEmitter.emit('permission-error', permissionError);
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
        // This can happen if an event is deleted. We just ignore the error.
        // console.error(`Error fetching registrations for event ${event.id}:`, error);
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

    let sortedEvents = [...events]
      .filter(event => {
        const timeFilter =
          filter === 'all' ||
          (filter === 'upcoming' && (getEventEndTime(event) ?? new Date(0)) >= now) ||
          (filter === 'past' && (getEventEndTime(event) ?? new Date(0)) < now);

        const searchFilter =
          !searchQuery ||
          event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          event.id.toLowerCase().includes(searchQuery.toLowerCase());
        
        const campusFilterMatch =
          campusFilter === 'all' || event.conductingCampus === campusFilter;
        
        return timeFilter && searchFilter && campusFilterMatch;
      });

    // Sorting logic
    sortedEvents.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return a.date.toDate().getTime() - b.date.toDate().getTime();
        case 'participants-desc':
          return (participantCounts[b.id] || 0) - (participantCounts[a.id] || 0);
        case 'views-desc':
            return (b.viewCount || 0) - (a.viewCount || 0);
        case 'date-desc':
        default:
          return b.date.toDate().getTime() - a.date.toDate().getTime();
      }
    });

    return sortedEvents;
  }, [events, filter, searchQuery, campusFilter, sortOption, participantCounts]);

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
       if (eventToDelete.videoUrl) {
         try {
          await deleteObject(ref(storage, eventToDelete.videoUrl));
        } catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting event video:", e); }
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
  
  const handleEditClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };
  
  const StatusBadge = ({ event }: { event: Event }) => {
    const isPending = ['pending', 'pending-update', 'pending-deletion'].includes(event.status);

    const statusConfig: { [key in Event['status']]: { label: string; icon: React.ElementType; className: string; tooltip: string } } = {
      approved: { label: 'Approved', icon: CheckCircle2, className: 'bg-green-500/20 text-green-400 border-green-500/30', tooltip: 'This event is live and visible.' },
      pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', tooltip: 'This event is awaiting approval.' },
      'pending-update': { label: 'Updated', icon: History, className: 'bg-blue-500/20 text-blue-400 border-blue-500/30', tooltip: 'This event update is awaiting approval.' },
      'pending-deletion': { label: 'Deletion', icon: AlertTriangle, className: 'bg-orange-500/20 text-orange-400 border-orange-500/30', tooltip: 'This deletion request is awaiting approval.' },
      rejected: { label: 'Rejected', icon: X, className: 'bg-red-500/20 text-red-400 border-red-500/30', tooltip: event.rejectionReason ? `Reason: ${event.rejectionReason}` : 'This event has been rejected.' }
    };
    
    const config = statusConfig[event.status];
    if (!config) return null;

    const badge = (
      <Badge className={cn('capitalize', config.className, isPending && 'cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-offset-background')} onClick={isPending ? () => router.push('/superadmin/approvals') : undefined}>
          <config.icon className="mr-1.5 h-3 w-3" />
          {config.label}
      </Badge>
    );

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badge}</TooltipTrigger>
          <TooltipContent>
            <p>{isPending ? `Click to go to approvals page` : config.tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading || authLoading) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-10 w-full" />
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
    <div className="mt-6 space-y-4">
       <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="flex-grow w-full md:w-auto">
            <Input
              placeholder="Search by event title or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <ToggleGroup
                type="single"
                variant="outline"
                value={filter}
                onValueChange={(value) => { if (value) setFilter(value as any); }}
                className="w-full sm:w-auto"
            >
                <ToggleGroupItem value="all" className="w-full">All</ToggleGroupItem>
                <ToggleGroupItem value="upcoming" className="w-full">Upcoming</ToggleGroupItem>
                <ToggleGroupItem value="past" className="w-full">Past</ToggleGroupItem>
            </ToggleGroup>
             <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by campus" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Campuses</SelectItem>
                    {campuses.map(campus => (
                        <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <Select value={sortOption} onValueChange={setSortOption}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="date-desc">Newest First</SelectItem>
                    <SelectItem value="date-asc">Oldest First</SelectItem>
                    <SelectItem value="participants-desc">Most Participants</SelectItem>
                    <SelectItem value="views-desc">Most Views</SelectItem>
                </SelectContent>
            </Select>
          </div>
      </div>

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
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge event={event} />
                <Badge variant="secondary">{event.conductingCampus}</Badge>
              </div>
            </div>
            <div className='flex gap-2 flex-shrink-0 self-end sm:self-center'>
               <Button asChild variant="outline" size="icon">
                  <a href={`/event/${event.id}`} target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="h-4 w-4" />
                    <span className="sr-only">View Chat</span>
                  </a>
               </Button>
                <Button variant="outline" size="icon" onClick={() => handleEditClick(event)}>
                  <FilePenLine className="h-4 w-4" />
                  <span className="sr-only">Edit Event</span>
                </Button>
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
    {selectedEvent && (
        <EventDetailDialog
            event={selectedEvent}
            isOpen={isDialogOpen}
            onClose={() => setIsDialogOpen(false)}
            isEditable={true} // Superadmin can always edit
        />
    )}
    </>
  );
}
