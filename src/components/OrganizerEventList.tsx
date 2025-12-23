

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, where, getCountFromServer, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';
import Image from 'next/image';
import { format, startOfMonth, endOfMonth, isWithinInterval, getMonth, getYear } from 'date-fns';
import { Button } from './ui/button';
import { FilePenLine, Trash2, Users, XCircle, MessageSquare, Eye, Clock, CheckCircle2, X, History, AlertTriangle, Undo2 } from 'lucide-react';
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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import type { Event } from '@/types';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from './ui/tooltip';
import { Textarea } from './ui/textarea';

interface OrganizerEventListProps {
  monthFilter: Date | null;
  onClearMonthFilter: () => void;
}

export default function OrganizerEventList({ monthFilter: chartMonthFilter, onClearMonthFilter }: OrganizerEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [participantCounts, setParticipantCounts] = useState<{[key: string]: number}>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'rejected' | 'pending-deletion'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const { user, isOrganizer, loading: authLoading } = useAuth();
  
  const [isRequestingDelete, setIsRequestingDelete] = useState(false);
  const [deletionReason, setDeletionReason] = useState("");
  const [eventToRequestDelete, setEventToRequestDelete] = useState<Event | null>(null);


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
        // Defensive check for data integrity
        if (doc.data() && doc.data().date) {
            eventsData.push({ id: doc.id, ...doc.data() } as Event);
        }
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
        // This can happen if an event is deleted. We just ignore the error.
        if (error.code !== 'permission-denied') {
          console.error(`Error fetching registrations for event ${event.id}:`, error);
        }
      });
      unsubscribers.push(unsubscribe);
    });

    // Cleanup listeners on component unmount or when events change
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [events]);

  const getEventEndTime = (event: Event): Date | null => {
    if (event.date && event.endTime) {
        const eventEndDate = event.date.toDate();
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }

  const { filteredEvents, availableMonths } = useMemo(() => {
    const now = new Date();
    let baseFilteredEvents: Event[] = events;

    // 1. Filter by Status
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        baseFilteredEvents = baseFilteredEvents.filter(e => e.status === 'pending' || e.status === 'pending-update');
      } else {
        baseFilteredEvents = baseFilteredEvents.filter(e => e.status === statusFilter);
      }
    }
    
    // 2. Filter by Time
    if (timeFilter !== 'all') {
      baseFilteredEvents = baseFilteredEvents.filter(event => {
        const eventEndDate = getEventEndTime(event);
        if (!eventEndDate) return false;
        return timeFilter === 'upcoming' ? eventEndDate >= now : eventEndDate < now;
      });
    }

    // 3. Filter by Month (from chart click)
    if (chartMonthFilter) {
      const interval = { start: startOfMonth(chartMonthFilter), end: endOfMonth(chartMonthFilter) };
      baseFilteredEvents = baseFilteredEvents.filter(event => isWithinInterval(event.date.toDate(), interval));
    }
    // 4. Filter by Month (from dropdown)
    else if (monthFilter !== 'all') {
      const selectedMonthDate = new Date(monthFilter);
      const interval = {
          start: startOfMonth(selectedMonthDate),
          end: endOfMonth(selectedMonthDate)
      };
      baseFilteredEvents = baseFilteredEvents.filter(event => isWithinInterval(event.date.toDate(), interval));
    }
    
    const monthSet = new Set<string>();
    events.forEach(event => {
        monthSet.add(format(event.date.toDate(), 'yyyy-MM'));
    });
    const availableMonths = Array.from(monthSet);

    return { filteredEvents: baseFilteredEvents, availableMonths };
  }, [events, statusFilter, timeFilter, monthFilter, chartMonthFilter]);

  const handleDelete = async (eventToDelete: Event) => {
    try {
      // An organizer can only delete events that are not approved
      if (eventToDelete.status === 'approved' || eventToDelete.status === 'pending-deletion') {
        toast({
          variant: 'destructive',
          title: 'Action Not Allowed',
          description: 'Cannot delete an event that is live or pending deletion. Please use "Request Deletion".',
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
  
  const handleRequestDelete = async () => {
    if (!eventToRequestDelete || !deletionReason.trim()) {
        toast({ variant: 'destructive', title: "Reason required", description: "Please provide a reason for requesting deletion." });
        return;
    }
    
    setIsRequestingDelete(true);
    const eventRef = doc(db, 'events', eventToRequestDelete.id);
    
    try {
        await updateDoc(eventRef, {
            status: 'pending-deletion',
            deletionReason: deletionReason.trim()
        });
        toast({ title: "Deletion Requested", description: "Your request has been sent to the superadmins for review." });
        setEventToRequestDelete(null);
        setDeletionReason("");
    } catch (error: any) {
        console.error("Error requesting deletion:", error);
        toast({ variant: 'destructive', title: "Request Failed", description: error.message });
    } finally {
        setIsRequestingDelete(false);
    }
  }

  const handleCancelUpdate = async (eventToCancel: Event) => {
    if (eventToCancel.status !== 'pending-update') return;

    const eventRef = doc(db, 'events', eventToCancel.id);
    try {
        await updateDoc(eventRef, {
            status: 'approved',
            updateReason: '' // Clear the update reason
        });
        toast({ title: 'Update Cancelled', description: 'Your event has been restored to its approved state.' });
    } catch (error: any) {
        console.error("Error cancelling update:", error);
        toast({ variant: 'destructive', title: 'Cancellation Failed', description: error.message });
    }
  }

  
  useEffect(() => {
    // Reset month filter when main filter changes
    setMonthFilter('all');
  }, [statusFilter, timeFilter]);
  
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
        tooltip: 'This new event is awaiting approval from a superadmin.'
      },
      'pending-update': {
        label: 'Updated',
        icon: History,
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        tooltip: 'This event has been updated and is awaiting re-approval.'
      },
      'pending-deletion': {
        label: 'Pending Deletion',
        icon: AlertTriangle,
        className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
        tooltip: 'Deletion request is awaiting approval from a superadmin.'
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
       <div className="flex flex-col gap-4">
        {!chartMonthFilter ? (
          <>
            <div className='flex flex-col sm:flex-row gap-4 justify-between items-center'>
              <ToggleGroup
                type="single"
                variant="outline"
                value={statusFilter}
                onValueChange={(value) => {
                  if (value) setStatusFilter(value as any);
                }}
              >
                <ToggleGroupItem value="all">All Statuses</ToggleGroupItem>
                <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
                <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
                <ToggleGroupItem value="rejected">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="pending-deletion">Pending Deletion</ToggleGroupItem>
              </ToggleGroup>
              
               <ToggleGroup
                type="single"
                variant="outline"
                value={timeFilter}
                onValueChange={(value) => {
                  if (value) setTimeFilter(value as any);
                }}
              >
                <ToggleGroupItem value="all">All Time</ToggleGroupItem>
                <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
                <ToggleGroupItem value="past">Past</ToggleGroupItem>
              </ToggleGroup>

              {availableMonths.length > 0 && (
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
            </div>
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
              
              {event.status === 'pending-update' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="icon" className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300">
                          <Undo2 className="h-4 w-4" />
                          <span className="sr-only">Cancel Update</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Update Request?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will revert your event to its last approved state and make it visible on the site again. Are you sure?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>No</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelUpdate(event)}>Yes, Cancel Update</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              )}

              {event.status === 'approved' ? (
                <Dialog open={eventToRequestDelete?.id === event.id} onOpenChange={(isOpen) => {
                    if (!isOpen) setEventToRequestDelete(null);
                }}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" size="icon" onClick={() => setEventToRequestDelete(event)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Request Deletion</span>
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Request to Delete Event</DialogTitle>
                            <DialogDescription>
                                To delete an approved event, you must provide a reason. This request will be sent to a superadmin for review.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4">
                            <Textarea
                                placeholder="e.g., Event has been cancelled due to unforeseen circumstances."
                                value={deletionReason}
                                onChange={(e) => setDeletionReason(e.target.value)}
                                disabled={isRequestingDelete}
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setEventToRequestDelete(null)}>Cancel</Button>
                            <Button variant="destructive" onClick={handleRequestDelete} disabled={isRequestingDelete || !deletionReason.trim()}>
                                {isRequestingDelete ? 'Submitting...' : 'Submit Request'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
              ) : (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="icon" disabled={event.status === 'pending-deletion' || event.status === 'pending-update'}>
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete Event</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the event "{event.title}" and its associated images. This action cannot be undone.
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
              )}

            </div>
          </Card>
        ))
      )}
    </div>
  );
}
