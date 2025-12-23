

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, CheckSquare, Check, X, Info, FileClock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/types';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';


type EventStatusFilter = 'pending' | 'pending-update' | 'all';

export default function EventApprovalsPage() {
  const { isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>('pending');


  useEffect(() => {
    if (!authLoading && !isSuperAdmin) {
      router.push('/');
    }
  }, [isSuperAdmin, authLoading, router]);

  useEffect(() => {
    if (!isSuperAdmin) return;

    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('status', 'in', ['pending', 'pending-update']));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData: Event[] = [];
      snapshot.forEach(doc => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      eventsData.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events for approval: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin]);
  
  const filteredEvents = useMemo(() => {
    if (statusFilter === 'all') return events;
    return events.filter(event => event.status === statusFilter);
  }, [events, statusFilter]);

  const handleApprove = async (eventId: string) => {
    try {
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, { status: 'approved', rejectionReason: '', updateReason: '' });
      toast({ title: 'Event Approved', description: 'The event is now live.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: error.message });
    }
  };

  const openRejectDialog = (event: Event) => {
    setSelectedEvent(event);
    setIsRejectDialogOpen(true);
    setRejectionReason('');
  };

  const handleReject = async () => {
    if (!selectedEvent || !rejectionReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const eventRef = doc(db, 'events', selectedEvent.id);
      await updateDoc(eventRef, { 
        status: 'rejected',
        rejectionReason: rejectionReason.trim(),
        updateReason: '', // Clear update reason on rejection
      });
      toast({ title: 'Event Rejected', description: 'The organizer has been notified.' });
      setIsRejectDialogOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getStatusBadge = (status: Event['status']) => {
    switch (status) {
        case 'pending': return <Badge variant="outline" className="text-yellow-400 border-yellow-400/50"><FileClock className="mr-1 h-3 w-3" />New</Badge>
        case 'pending-update': return <Badge variant="outline" className="text-blue-400 border-blue-400/50"><History className="mr-1 h-3 w-3" />Updated</Badge>
        case 'rejected': return <Badge variant="destructive"><X className="mr-1 h-3 w-3" />Rejected</Badge>
        default: return null;
    }
  }


  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page. Redirecting...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/superadmin')} className="mb-4 text-white hover:text-white/80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <CheckSquare className="mr-3 h-8 w-8 text-primary"/>
            Event Approvals
          </h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Review and approve or reject events submitted by organizers.</p>
        </div>
        
        <div className="my-8 flex justify-center">
          <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => {if(value) setStatusFilter(value as EventStatusFilter)}} className="w-full max-w-md">
            <ToggleGroupItem value="pending" className="w-full data-[state=on]:bg-yellow-500/20 data-[state=on]:border-yellow-500/50 data-[state=on]:text-yellow-300">Pending (New)</ToggleGroupItem>
            <ToggleGroupItem value="pending-update" className="w-full data-[state=on]:bg-blue-500/20 data-[state=on]:border-blue-500/50 data-[state=on]:text-blue-300">Pending (Updates)</ToggleGroupItem>
            <ToggleGroupItem value="all" className="w-full data-[state=on]:bg-zinc-500/20 data-[state=on]:border-zinc-500/50 data-[state=on]:text-zinc-300">All Pending</ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="mt-8 space-y-4">
          {filteredEvents.length === 0 ? (
            <Card className="p-12 text-center text-muted-foreground">
              <Check className="mx-auto h-12 w-12 text-green-500" />
              <p className="mt-4">No events found for this category.</p>
            </Card>
          ) : (
            filteredEvents.map((event) => (
              <Card key={event.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
                <div className="relative h-24 w-full sm:w-32 sm:h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                  <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                     {getStatusBadge(event.status)}
                     <h3 className="font-bold">{event.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</p>
                   {event.status === 'rejected' && event.rejectionReason && (
                     <p className="text-xs text-red-400 mt-1">Rejection Reason: {event.rejectionReason}</p>
                   )}
                   {event.status === 'pending-update' && event.updateReason && (
                     <p className="text-xs text-blue-400 mt-1">Update Reason: {event.updateReason}</p>
                   )}
                   <Link href={`/event/${event.id}`} className="text-sm text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                    View Full Details
                  </Link>
                </div>
                <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                  <Button variant="outline" size="sm" onClick={() => handleApprove(event.id)}>
                    <Check className="mr-2 h-4 w-4 text-green-500" /> Approve
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => openRejectDialog(event)}>
                    <X className="mr-2 h-4 w-4" /> Reject
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Event: {selectedEvent?.title}</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this event. This will be shown to the organizer.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="e.g., The event description is incomplete."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>
              {isSubmitting ? 'Rejecting...' : 'Reject Event'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
