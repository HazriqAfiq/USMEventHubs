'use client';

import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format, addMinutes } from 'date-fns';
import { Calendar, MapPin, UserCheck, UserPlus, FilePenLine, Clock, Link as LinkIcon, PartyPopper, QrCode, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import type { Event, Registration } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import Link from 'next/link';
import RegistrationForm from '@/components/RegistrationForm';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import ChatRoom from '@/components/ChatRoom';

const toMalaysiaTime = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  
  const date = new Date();
  date.setHours(parseInt(hours,10));
  date.setMinutes(parseInt(minutes,10));
  date.setSeconds(0);

  return format(date, 'p');
};


export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventExists, setEventExists] = useState(true);
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<Registration | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [communityLink, setCommunityLink] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(new Date());

  // Set up an interval to update the current time every second for real-time checks
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000); // every second

    return () => clearInterval(timer);
  }, []);

  const { isRegistrationClosed, isEventOver } = useMemo(() => {
    if (!event || !event.date || !event.startTime || !event.endTime) {
      return { isRegistrationClosed: false, isEventOver: false };
    }

    const eventDate = event.date.toDate();

    const [startHours, startMinutes] = event.startTime.split(':');
    const startDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), parseInt(startHours), parseInt(startMinutes));
    const registrationDeadline = addMinutes(startDateTime, 15);

    const [endHours, endMinutes] = event.endTime.split(':');
    const endDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), parseInt(endHours), parseInt(endMinutes));
    
    return {
      isRegistrationClosed: now > registrationDeadline || now > endDateTime,
      isEventOver: now > endDateTime,
    };
  }, [event, now]);
  
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const eventData = { id: docSnap.id, ...docSnap.data() } as Event;
          setEvent(eventData);
          setEventExists(true);
        } else {
          setEventExists(false);
        }
      } catch (error) {
        console.error("Error fetching event:", error);
        setEventExists(false);
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();

  }, [eventId]);

   useEffect(() => {
    if (user && eventId) {
      const regRef = doc(db, 'events', eventId, 'registrations', user.uid);
      const unsubscribe = onSnapshot(regRef, (docSnap) => {
        if (docSnap.exists()) {
          setIsRegistered(true);
          setRegistrationDetails(docSnap.data() as Registration);
        } else {
          setIsRegistered(false);
          setRegistrationDetails(null);
        }
      }, (serverError) => {
        setIsRegistered(false);
        setRegistrationDetails(null);
      });
      return () => unsubscribe();
    } else {
      setIsRegistered(false);
      setRegistrationDetails(null);
    }
   }, [user, eventId]);
  
  const handleRegistrationSubmit = async (data: { name: string, matricNo: string, faculty: string, paymentProofUrl?: string }) => {
    if (!user || !event) return;

    if (isRegistrationClosed) {
      toast({ variant: 'destructive', title: 'Registration Closed', description: 'The registration window for this event has passed.' });
      setIsFormOpen(false);
      return;
    }

    setIsSubmitting(true);
    const regRef = doc(db, 'events', event.id, 'registrations', user.uid);
    try {
      const registrationData: any = {
        ...data,
        id: user.uid,
        registeredAt: serverTimestamp(),
      };
      
      await setDoc(regRef, registrationData);
      
      setCommunityLink(event.groupLink);
      setIsSuccessDialogOpen(true);
      setIsFormOpen(false);

    } catch (error: any) {
      console.error("Error submitting registration:", error);
      const permissionError = new FirestorePermissionError({
          path: regRef.path,
          operation: 'create',
          requestResourceData: { ...data, id: user.uid },
      }, error);
      errorEmitter.emit('permission-error', permissionError);
      
      toast({ variant: 'destructive', title: 'Registration Failed', description: 'Could not save your registration. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRegistration = () => {
     if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Required', description: 'You must be logged in to register for an event.' });
      router.push('/login');
      return;
    }
    
    if (isAdmin) {
      toast({ title: 'Admin Action Not Allowed', description: 'Admins cannot register for events.' });
      return;
    }

    if (isRegistrationClosed) {
      toast({ variant: 'destructive', title: 'Registration Closed', description: 'The registration window for this event has passed.' });
      return;
    }
    
    setIsFormOpen(true);
  }
  
  const handleSuccessDialogClose = (open: boolean) => {
    if (!open) {
      window.location.reload();
    }
    setIsSuccessDialogOpen(open);
  }

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full rounded-lg" />
          <Skeleton className="h-10 w-3/4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-48" />
        </div>
      </div>
    );
  }

  if (!eventExists) {
     return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>404 - Event Not Found</AlertTitle>
          <AlertDescription>The event you are looking for does not exist or may have been moved.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
      </div>
    );
  }
  
  if (!event) {
    return null;
  }
  
  const showChat = (isRegistered || (isAdmin && user?.uid === event.organizerId)) && user && event && !isEventOver;

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="overflow-hidden mt-4">
        <div className="relative h-64 md:h-96 w-full">
          <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} priority />
          {isAdmin && user?.uid === event.organizerId && (
            <Button asChild className="absolute top-4 right-4" variant="secondary">
              <Link href={`/admin/edit/${event.id}`}>
                <FilePenLine className="mr-2 h-4 w-4" />
                Edit Event
              </Link>
            </Button>
          )}
        </div>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
            <div>
              <CardTitle className="text-3xl md:text-4xl font-bold font-headline">{event.title}</CardTitle>
              {event.isFree ? (
                <Badge variant="secondary" className="mt-2 text-base">Free</Badge>
              ) : event.price ? (
                <Badge variant="secondary" className="mt-2 text-base">RM{event.price.toFixed(2)}</Badge>
              ) : null}
            </div>
            <div className="flex-shrink-0 grid gap-2 text-sm text-muted-foreground w-full md:w-auto">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span>{event.date ? format(toMalaysiaTime(event.date.toDate()), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
                </div>
                 <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{event.location}</span>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-stone dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
            {event.description}
          </div>
          
          {!isAdmin && user && (
            isRegistered ? (
              <Card className="bg-green-500/10 border-green-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center text-green-700 dark:text-green-400">
                    <UserCheck className="mr-2 h-5 w-5" />
                    You are registered!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {registrationDetails && (
                    <div className="text-sm space-y-2">
                       <p className="font-semibold">Your Registration Details:</p>
                       <ul className="list-disc list-inside text-muted-foreground space-y-1">
                          <li><strong>Name:</strong> {registrationDetails.name}</li>
                          <li><strong>Matric No:</strong> {registrationDetails.matricNo}</li>
                          <li><strong>Faculty:</strong> {registrationDetails.faculty}</li>
                       </ul>
                    </div>
                  )}
                  {event.groupLink && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-4 border-t border-green-500/20">
                      <p className='text-sm text-muted-foreground'>Join the event community group:</p>
                      <Button asChild size="sm">
                          <a href={event.groupLink} target="_blank" rel="noopener noreferrer">
                              <LinkIcon className='mr-2 h-4 w-4'/>
                              Join Community
                          </a>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
               <Button onClick={openRegistration} size="lg" className="w-full sm:w-auto" disabled={isRegistrationClosed}>
                 {isRegistrationClosed ? (
                    <>
                      <Ban className="mr-2 h-5 w-5" />
                      Registration Closed
                    </>
                 ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      Register for Event
                    </>
                 )}
               </Button>
            )
          )}

          {!user && !authLoading && (
            <div>
              <Button onClick={openRegistration} size="lg" className="w-full sm:w-auto" disabled={isRegistrationClosed}>
                {isRegistrationClosed ? (
                  <>
                    <Ban className="mr-2 h-5 w-5" />
                    Registration Closed
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-5 w-5" />
                    Register for Event
                  </>
                )}
              </Button>
              {!isRegistrationClosed && (
                <p className='text-sm text-muted-foreground mt-2'>
                  You need to be logged in to register.
                </p>
              )}
            </div>
          )}

        </CardContent>
      </Card>
    </div>

    {showChat && (
      <ChatRoom eventId={event.id} organizerId={event.organizerId} />
    )}

    <RegistrationForm 
      isOpen={isFormOpen} 
      onClose={() => setIsFormOpen(false)}
      onSubmit={handleRegistrationSubmit}
      isSubmitting={isSubmitting}
      eventPrice={event?.isFree === false ? event.price : undefined}
      eventQrCodeUrl={event?.isFree === false ? event.qrCodeUrl : undefined}
      isRegistrationClosed={isRegistrationClosed}
      eventId={event.id}
      />
    <Dialog open={isSuccessDialogOpen} onOpenChange={handleSuccessDialogClose}>
      <DialogContent>
        <DialogHeader>
           <div className='flex items-center justify-center flex-col text-center gap-y-2 pt-4'>
            <PartyPopper className='h-12 w-12 text-accent' strokeWidth={1.5} />
            <DialogTitle className="text-2xl font-bold font-headline">Registration Successful!</DialogTitle>
            <DialogDescription>
              You are now registered for "{event.title}". The page will now reload.
            </DialogDescription>
           </div>
        </DialogHeader>
          {communityLink && (
            <div className='space-y-4 text-center py-4'>
                <p className='text-sm text-muted-foreground'>Join the event community group to connect with other attendees:</p>
                <Button asChild>
                    <a href={communityLink} target="_blank" rel="noopener noreferrer">
                        <LinkIcon className='mr-2 h-4 w-4'/>
                        Join Community Group
                    </a>
                </Button>
            </div>
          )}
        <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" className='w-full'>Close</Button>
            </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

    
