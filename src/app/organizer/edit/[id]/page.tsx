

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/types';
import { ArrowLeft, Terminal, Users, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import AttendeesDialog from '@/components/AttendeesDialog';

export default function EditEventPage() {
  const { user, isOrganizer, isSuperAdmin, isAdmin, userProfile, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [isAttendeesDialogOpen, setIsAttendeesDialogOpen] = useState(false);

  const getEventEndTime = (eventData: Event): Date | null => {
    if (eventData.date && eventData.endTime) {
        const eventEndDate = eventData.date.toDate();
        const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }
  
  const isPastEvent = useMemo(() => {
    if (!event) return false;
    const eventEndTime = getEventEndTime(event);
    return eventEndTime ? eventEndTime < new Date() : false;
  }, [event]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!isOrganizer && !isSuperAdmin && !isAdmin) {
      setHasPermission(false);
      setLoading(false);
      return;
    }
    
    if (!eventId) return;

    const docRef = doc(db, 'events', eventId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() } as Event;

        // Permission check
        const canView = isSuperAdmin || 
                        (isOrganizer && eventData.organizerId === user.uid) ||
                        (isAdmin && userProfile?.campus === eventData.conductingCampus);

        if (canView) {
          setEvent(eventData);
          setHasPermission(true);
        } else {
          setHasPermission(false);
        }
      } else {
        setHasPermission(false);
      }
      setLoading(false);
    }, (serverError: any) => {
        setHasPermission(false);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [eventId, authLoading, isOrganizer, isSuperAdmin, isAdmin, user, userProfile, router]);

  useEffect(() => {
    if (!loading && !hasPermission) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this event. Redirecting...',
      });
      const timer = setTimeout(() => {
        if (isSuperAdmin) router.push('/superadmin');
        else if (isAdmin) router.push('/admin');
        else if (isOrganizer) router.push('/organizer');
        else router.push('/');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasPermission, loading, router, isSuperAdmin, isAdmin, isOrganizer, toast]);


  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <Skeleton className="h-10 w-1/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  
  if (!hasPermission) {
     return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view or edit this event. Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  if (!event) {
    return null;
  }
  
  const isFormEditable = !isPastEvent;

  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
           <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white hover:text-white/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Event Details</h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{isFormEditable ? "Modify the details for the event" : "Viewing details for the past event"} "{event?.title}".</p>
          
          <div className="flex items-center gap-4 mt-4">
             <Button onClick={() => setIsAttendeesDialogOpen(true)}>
                <Users className="mr-2 h-4 w-4" />
                View Registered Attendees
            </Button>
          </div>
          
          {isPastEvent && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Event Has Passed</AlertTitle>
              <AlertDescription>
                This event has already occurred. The details can no longer be edited.
              </AlertDescription>
            </Alert>
          )}

          <EventForm event={event} isEditable={isFormEditable} />
        </div>
      </div>
    </div>
    
    <AttendeesDialog 
      eventId={event.id}
      eventName={event.title}
      isOpen={isAttendeesDialogOpen}
      onClose={() => setIsAttendeesDialogOpen(false)}
      isPaidEvent={!event.isFree}
    />
    </>
  );
}

    
