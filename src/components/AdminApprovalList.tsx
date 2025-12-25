

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Check, X, FileClock, History, AlertTriangle, Trash2, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, query, where, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import type { Event, UserProfile } from '@/types';
import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import ApprovalDialog from '@/components/ApprovalDialog';
import { ref, deleteObject } from 'firebase/storage';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getRegisteredUserIds, sendNotificationToUsers } from '@/lib/notifications';

type EventStatusFilter = 'pending' | 'pending-update' | 'pending-deletion' | 'all';

interface AdminApprovalListProps {
  preselectedStatus?: string | null;
}


export default function AdminApprovalList({ preselectedStatus }: AdminApprovalListProps) {
  const { user, userProfile, isAdmin, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [selectedEventForAction, setSelectedEventForAction] = useState<Event | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isValidStatus = (status: string | null): status is EventStatusFilter => {
    return status === 'pending' || status === 'pending-update' || status === 'pending-deletion' || status === 'all';
  };
  const [statusFilter, setStatusFilter] = useState<EventStatusFilter>(isValidStatus(preselectedStatus) ? preselectedStatus : 'all');
  
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [eventToView, setEventToView] = useState<Event | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [organizerFilter, setOrganizerFilter] = useState('all');

  useEffect(() => {
    if (authLoading || !isAdmin || !userProfile?.campus) {
        if (!authLoading) setLoading(false);
        return;
    }

    const eventsRef = collection(db, 'events');
    const qEvents = query(eventsRef, where('conductingCampus', '==', userProfile.campus), where('status', 'in', ['pending', 'pending-update', 'pending-deletion']));

    const unsubscribeEvents = onSnapshot(qEvents, (snapshot) => {
      const eventsData: Event[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      eventsData.sort((a, b) => (a.date?.toDate()?.getTime() || 0) - (b.date?.toDate()?.getTime() || 0));
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events for approval: ", error);
      setLoading(false);
    });
    
    const usersRef = collection(db, 'users');
    const qUsers = query(usersRef, where('campus', '==', userProfile.campus));
    const unsubscribeUsers = onSnapshot(qUsers, (snapshot) => {
        setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    });

    return () => {
      unsubscribeEvents();
      unsubscribeUsers();
    };
  }, [authLoading, isAdmin, userProfile]);
  
  const getOrganizerName = (organizerId?: string) => {
    if (!organizerId) return 'Unknown';
    const organizer = users.find(u => u.uid === organizerId);
    return organizer?.name || 'Unknown';
  }
  
  const organizers = useMemo(() => {
    const organizerIds = new Set(events.map(e => e.organizerId));
    return users.filter(u => u.role === 'organizer' && organizerIds.has(u.uid));
  }, [events, users]);
  
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
        const statusMatch = statusFilter === 'all' || event.status === statusFilter;
        const organizerMatch = organizerFilter === 'all' || event.organizerId === organizerFilter;
        const searchMatch = !searchQuery || event.title.toLowerCase().includes(searchQuery.toLowerCase()) || getOrganizerName(event.organizerId).toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && organizerMatch && searchMatch;
    });
  }, [events, statusFilter, organizerFilter, searchQuery, users]);

  const handleApprove = async (event: Event) => {
    if (!user) return;
    try {
      const eventRef = doc(db, 'events', event.id);
      const originalStatus = event.status;
      const updateReason = event.updateReason;
      
      await updateDoc(eventRef, { 
          status: 'approved', 
          rejectionReason: '', 
          updateReason: '', 
          deletionReason: '', 
          isApprovedOnce: true 
      });

      if (originalStatus === 'pending-update') {
        const registeredUserIds = await getRegisteredUserIds(event.id);
        if (registeredUserIds.length > 0) {
          const notificationMessage = `Event Updated: "${event.title}". Reason: ${updateReason || 'Details updated'}.`;
          await sendNotificationToUsers(registeredUserIds, notificationMessage, `/event/${event.id}`, event.id);
        }
      }
      
      toast({ title: 'Event Approved', description: `"${event.title}" is now live.` });
      closeDetailView();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: error.message });
    }
  };

  const openRejectDialog = (event: Event) => {
    setSelectedEventForAction(event);
    setIsRejectDialogOpen(true);
    setRejectionReason('');
  };

  const handleReject = async () => {
    if (!selectedEventForAction || !rejectionReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const eventRef = doc(db, 'events', selectedEventForAction.id);
      if (selectedEventForAction.status === 'pending-deletion') {
         await updateDoc(eventRef, { status: 'approved', deletionReason: '' });
         await sendNotificationToUsers(await getRegisteredUserIds(selectedEventForAction.id), `A request to cancel "${selectedEventForAction.title}" was denied.`, `/event/${selectedEventForAction.id}`, selectedEventForAction.id);
         toast({ title: 'Deletion Request Rejected', description: 'The event remains approved.' });
      } else {
        await updateDoc(eventRef, { status: 'rejected', rejectionReason: rejectionReason.trim(), updateReason: '' });
        if (selectedEventForAction.status === 'pending-update') {
            await sendNotificationToUsers(await getRegisteredUserIds(selectedEventForAction.id), `An update for "${selectedEventForAction.title}" was not approved.`, `/event/${selectedEventForAction.id}`, selectedEventForAction.id, selectedEventForAction.updateReason);
        }
        toast({ title: 'Event Rejected' });
      }
      setIsRejectDialogOpen(false);
      closeDetailView();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleApproveDeletion = async (event: Event) => {
     try {
      if (event.imageUrl) {
        try { await deleteObject(ref(storage, event.imageUrl)); } catch (e: any) { if (e.code !== 'storage/object-not-found') console.error("Error deleting event image:", e); }
      }
      await deleteDoc(doc(db, 'events', event.id));
      await sendNotificationToUsers(await getRegisteredUserIds(event.id), `The event "${event.title}" has been cancelled and removed.`, `/`, event.id);
      toast({ title: 'Deletion Approved' });
      closeDetailView();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Deletion Failed', description: error.message });
    }
  }

  const openDetailView = (event: Event) => { setEventToView(event); setIsDetailViewOpen(true); };
  const closeDetailView = () => { setEventToView(null); setIsDetailViewOpen(false); }
  
  const getStatusBadge = (status: Event['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-400 border-yellow-400/50"><FileClock className="mr-1 h-3 w-3" />New</Badge>;
      case 'pending-update': return <Badge variant="outline" className="text-blue-400 border-blue-400/50"><History className="mr-1 h-3 w-3" />Updated</Badge>;
      case 'pending-deletion': return <Badge variant="outline" className="text-orange-400 border-orange-400/50"><AlertTriangle className="mr-1 h-3 w-3" />Deletion Request</Badge>;
      default: return null;
    }
  }

  if (authLoading || loading) {
    return <div className="space-y-4 mt-8"><Skeleton className="h-28 w-full" /><Skeleton className="h-28 w-full" /></div>;
  }
  
  return (
    <>
      <div className="my-8 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Search by title or organizer name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:flex-grow"/>
          <Select value={organizerFilter} onValueChange={setOrganizerFilter}><SelectTrigger className="w-full md:w-[250px]"><SelectValue placeholder="Filter by organizer"/></SelectTrigger><SelectContent><SelectItem value="all">All Organizers</SelectItem>{organizers.map(org => <SelectItem key={org.uid} value={org.uid}>{org.name}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="flex justify-center">
          <ToggleGroup type="single" value={statusFilter} onValueChange={(value) => {if(value) setStatusFilter(value as EventStatusFilter)}} className="w-full max-w-lg">
            <ToggleGroupItem value="all" className="w-full data-[state=on]:bg-zinc-500/20 data-[state=on]:border-zinc-500/50 data-[state=on]:text-zinc-300">All</ToggleGroupItem>
            <ToggleGroupItem value="pending" className="w-full data-[state=on]:bg-yellow-500/20 data-[state=on]:border-yellow-500/50 data-[state=on]:text-yellow-300">New</ToggleGroupItem>
            <ToggleGroupItem value="pending-update" className="w-full data-[state=on]:bg-blue-500/20 data-[state=on]:border-blue-500/50 data-[state=on]:text-blue-300">Updates</ToggleGroupItem>
            <ToggleGroupItem value="pending-deletion" className="w-full data-[state=on]:bg-orange-500/20 data-[state=on]:border-orange-500/50 data-[state=on]:text-orange-300">Deletions</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground"><CheckSquare className="mx-auto h-12 w-12 text-green-500" /><p className="mt-4">No pending requests for your campus.</p></Card>
        ) : (
          filteredEvents.map((event) => (
            <Card key={event.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all hover:shadow-md">
              <div className="relative h-24 w-full sm:w-32 sm:h-20 rounded-md overflow-hidden flex-shrink-0 bg-muted"><Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} /></div>
              <div className="flex-grow"><div className="flex items-center gap-2 mb-1">{getStatusBadge(event.status)}<h3 className="font-bold">{event.title}</h3></div><p className="text-sm text-muted-foreground">By: {getOrganizerName(event.organizerId)}</p><p className="text-sm text-muted-foreground">{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</p>{(event.status === 'pending-update' && event.updateReason) && (<p className="text-xs text-blue-400 mt-1">Reason: {event.updateReason}</p>)}{(event.status === 'pending-deletion' && event.deletionReason) && (<p className="text-xs text-orange-400 mt-1">Reason: {event.deletionReason}</p>)}<Button variant="link" className="text-sm text-primary h-auto p-0" onClick={() => openDetailView(event)}>View Details</Button></div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
               {event.status === 'pending-deletion' ? (<><Button variant="outline" size="sm" onClick={() => openRejectDialog(event)}><X className="mr-2 h-4 w-4" /> Reject</Button><Button variant="destructive" size="sm" onClick={() => handleApproveDeletion(event)}><Trash2 className="mr-2 h-4 w-4" /> Approve</Button></>) : (<><Button variant="outline" size="sm" onClick={() => handleApprove(event)}><Check className="mr-2 h-4 w-4 text-green-500" /> Approve</Button><Button variant="destructive" size="sm" onClick={() => openRejectDialog(event)}><X className="mr-2 h-4 w-4" /> Reject</Button></>)}
              </div>
            </Card>
          ))
        )}
      </div>
      
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}><DialogContent><DialogHeader><DialogTitle>Reject Request: {selectedEventForAction?.title}</DialogTitle><DialogDescription>Provide a reason for rejecting this request. This will be shown to the organizer.</DialogDescription></DialogHeader><div className="py-4"><Textarea placeholder="e.g., The event description is incomplete." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} disabled={isSubmitting}/></div><DialogFooter><Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting}>Cancel</Button><Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>{isSubmitting ? 'Submitting...' : 'Confirm Rejection'}</Button></DialogFooter></DialogContent></Dialog>
      {eventToView && <ApprovalDialog event={eventToView} isOpen={isDetailViewOpen} onClose={closeDetailView} onApprove={handleApprove} onReject={openRejectDialog} onApproveDeletion={handleApproveDeletion} />}
    </>
  );
}
