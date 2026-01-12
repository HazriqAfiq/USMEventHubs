

'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc, deleteDoc, serverTimestamp, updateDoc, increment, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format, addMinutes } from 'date-fns';
import { ArrowLeft, Calendar, MapPin, UserCheck, UserPlus, FilePenLine, Clock, Link as LinkIcon, PartyPopper, QrCode, Ban, Building2, Eye, AlertCircle } from 'lucide-react';
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
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

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

const formatDateRange = (start: Date, end: Date | undefined) => {
  const startDate = format(toMalaysiaTime(start), 'MMM d, yyyy');
  if (end) {
    const endDate = format(toMalaysiaTime(end), 'MMM d, yyyy');
    if (startDate === endDate) {
      return format(toMalaysiaTime(start), 'EEEE, MMMM d, yyyy');
    }
    return `${format(toMalaysiaTime(start), 'MMM d')} - ${format(toMalaysiaTime(end), 'MMM d, yyyy')}`;
  }
  return format(toMalaysiaTime(start), 'EEEE, MMMM d, yyyy');
}


export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventExists, setEventExists] = useState(true);
  const { user, isOrganizer, isSuperAdmin, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationDetails, setRegistrationDetails] = useState<Registration | null>(null);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [communityLink, setCommunityLink] = useState<string | undefined>(undefined);
  const [now, setNow] = useState(new Date());
  
  const viewCountIncremented = useRef(false);

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

    const endDateTimeSource = event.endDate?.toDate() || eventDate;
    const [endHours, endMinutes] = event.endTime.split(':');
    const endDateTime = new Date(endDateTimeSource.getFullYear(), endDateTimeSource.getMonth(), endDateTimeSource.getDate(), parseInt(endHours), parseInt(endMinutes));
    
    return {
      isRegistrationClosed: now > registrationDeadline || now > endDateTime,
      isEventOver: now > endDateTime,
    };
  }, [event, now]);
  
  useEffect(() => {
    if (!eventId) return;

    const docRef = doc(db, 'events', eventId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() } as Event;

        // If user is not an admin/organizer and the event is not approved, treat as non-existent
        if (eventData.status !== 'approved' && !isAdmin && !isOrganizer && !isSuperAdmin) {
            setEventExists(false);
            setEvent(null);
        } else {
            setEvent(eventData);
            setEventExists(true);
        }
      } else {
        setEventExists(false);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching event:", error);
      setEventExists(false);
      setLoading(false);
    });

    return () => unsubscribe();

  }, [eventId, isAdmin, isOrganizer, isSuperAdmin]);

  useEffect(() => {
    if (eventId && user && !isOrganizer && !isAdmin && !viewCountIncremented.current) {
      const docRef = doc(db, 'events', eventId);
      updateDoc(docRef, { viewCount: increment(1) })
        .catch((serverError) => {
           const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: { viewCount: 'increment' },
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
        });
      
      viewCountIncremented.current = true;
    }
  }, [eventId, user, isOrganizer, isAdmin]);

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
    
    if (event.status !== 'approved') {
        toast({ variant: 'destructive', title: 'Not Available', description: 'This event is not currently open for registration.' });
        setIsFormOpen(false);
        return;
    }

    setIsSubmitting(true);
    
    // Create a batch to write to both locations atomically
    const batch = writeBatch(db);

    // 1. Reference to the registration document in the event's subcollection
    const eventRegRef = doc(db, 'events', event.id, 'registrations', user.uid);
    const registrationData: Registration = {
        ...data,
        id: user.uid, // a.k.a registrationId
        registeredAt: serverTimestamp() as Timestamp,
        attended: true,
    };
    batch.set(eventRegRef, registrationData);

    // 2. Reference to the registration document in the user's subcollection
    const userRegRef = doc(db, 'users', user.uid, 'registrations', event.id);
    const userRegistrationData = {
        eventId: event.id,
        registeredAt: serverTimestamp(),
    };
    batch.set(userRegRef, userRegistrationData);

    try {
      await batch.commit();
      
      setCommunityLink(event.groupLink);
      setIsSuccessDialogOpen(true);
      setIsFormOpen(false);

    } catch (error: any) {
      console.error("Error submitting registration:", error);
      // Since this is a batch, it's hard to know which write failed.
      // We can create a more generic permission error.
      const permissionError = new FirestorePermissionError({
          path: `batch write for event ${event.id} and user ${user.uid}`,
          operation: 'create',
          requestResourceData: { eventRegistration: registrationData, userRegistration: userRegistrationData },
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
    
    if (isOrganizer || isAdmin || isSuperAdmin) {
      toast({ title: 'Admin/Organizer Action Not Allowed', description: 'Admins and Organizers cannot register for events.' });
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
  
  const isEventOrganizer = user ? (isOrganizer || isSuperAdmin) && event?.organizerId === user.uid : false;
  
  const showChat = useMemo(() => {
    if (!user || !event) return false;
    
    if (event.status !== 'approved') return false;

    if (isEventOrganizer || isSuperAdmin || isAdmin) {
      return true;
    }
    
    if (isRegistered && !isEventOver) {
      return true;
    }
    
    return false;
  }, [user, event, isEventOrganizer, isRegistered, isEventOver, isSuperAdmin, isAdmin]);

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
          <AlertDescription>The event you are looking for does not exist, has not been approved, or may have been moved.</AlertDescription>
        </Alert>
        <Button onClick={() => router.push('/')} className="mt-6">Go to Homepage</Button>
      </div>
    );
  }
  
  if (!event) {
    return null;
  }

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-4xl">
       <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white hover:text-white/80">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
       {event.status !== 'approved' && (isOrganizer || isSuperAdmin || isAdmin) && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Admin Preview</AlertTitle>
            <AlertDescription>
              This event is currently <strong>{event.status}</strong> and is not visible to the public.
              {event.status === 'rejected' && event.rejectionReason && (
                <p className="mt-2 text-xs">Reason: {event.rejectionReason}</p>
              )}
            </AlertDescription>
          </Alert>
        )}
      <Card className="overflow-hidden mt-4">
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              <CarouselItem>
                <div className="relative h-64 md:h-96 w-full">
                  <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} priority />
                </div>
              </CarouselItem>
              {event.videoUrl && (
                <CarouselItem>
                  <div className="relative h-64 md:h-96 w-full bg-black flex items-center justify-center">
                    <video
                      src={event.videoUrl}
                      controls
                      className="max-w-full max-h-full"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
             {(event.videoUrl) && (
              <>
                <CarouselPrevious className="left-4" />
                <CarouselNext className="right-4" />
              </>
            )}
          </Carousel>
          {(isEventOrganizer || isSuperAdmin || isAdmin) && (
            <Button asChild className="absolute top-4 right-4 z-10" variant="secondary">
              <Link href={`/organizer/edit/${event.id}`}>
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
                  <span>{event.date ? formatDateRange(event.date.toDate(), event.endDate?.toDate()) : 'Date not set'}</span>
                </div>
                 <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span>{event.location}</span>
                </div>
                <div className="flex items-center">
                  <Eye className="h-4 w-4 mr-2" />
                  <span>{event.viewCount || 0} views</span>
                </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="prose prose-stone dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
            {event.description}
          </div>
          
          {(event.conductingCampus || (event.eligibleCampuses && event.eligibleCampuses.length > 0)) && (
            <div className='space-y-4 rounded-lg border bg-card text-card-foreground shadow-sm p-4'>
                <h3 className="font-semibold flex items-center"><Building2 className='mr-2 h-5 w-5'/>Campus Information</h3>
                {event.conductingCampus && (
                    <div className="text-sm">
                        <p className="font-medium">Conducted by:</p>
                        <p className="text-muted-foreground">{event.conductingCampus}</p>
                    </div>
                )}
                {event.eligibleCampuses && event.eligibleCampuses.length > 0 && (
                     <div className="text-sm">
                        <p className="font-medium">Open to:</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                            {event.eligibleCampuses.map(campus => (
                                <Badge key={campus} variant='outline'>{campus}</Badge>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          {!isOrganizer && !isAdmin && user && event.status === 'approved' && (
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

          {!user && !authLoading && event.status === 'approved' && (
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
      
      {showChat && (
        <div className="mt-8">
            <ChatRoom eventId={event.id} organizerId={event.organizerId} />
        </div>
      )}
    </div>

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
