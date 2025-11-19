'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, MapPin, UserCheck, UserPlus, FilePenLine, Clock, Link as LinkIcon, PartyPopper, QrCode } from 'lucide-react';
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

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
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
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [communityLink, setCommunityLink] = useState<string | undefined>(undefined);
  const [isQrCodeDialogOpen, setIsQrCodeDialogOpen] = useState(false);
  
  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
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
    // Only check registration status if there is a logged in user and an eventId
    if (user && eventId) {
      const regRef = doc(db, 'events', eventId, 'registrations', user.uid);
      const unsubscribe = onSnapshot(regRef, (doc) => {
        setIsRegistered(doc.exists());
      }, (serverError) => {
        setIsRegistered(false);
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
              path: regRef.path,
              operation: 'get',
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
        }
      });
      return () => unsubscribe();
    } else {
      // Ensure that if user logs out or there's no event, we reset the state.
      setIsRegistered(false);
    }
   }, [user, eventId]);
  
  const handleRegistrationSubmit = async (data: { name: string, matricNo: string, faculty: string }) => {
    if (!user || !event) return;
    setIsSubmitting(true);
    const regRef = doc(db, 'events', event.id, 'registrations', user.uid);
    try {
      await setDoc(regRef, {
        ...data,
        id: user.uid,
        registeredAt: serverTimestamp(),
      });
      
      setCommunityLink(event.groupLink);
      setIsSuccessDialogOpen(true);
      setIsFormOpen(false);

    } catch (error: any) {
      console.error("Error submitting registration:", error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'Could not save your registration. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRegistration = () => {
     if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to register for an event.',
      });
      router.push('/login');
      return;
    }
    
    if (isAdmin) {
      toast({
        title: 'Admin Action Not Allowed',
        description: 'Admins cannot register for events.',
      });
      return;
    }

    if (event?.isFree === false && event.qrCodeUrl) {
      setIsQrCodeDialogOpen(true);
    } else {
      setIsFormOpen(true);
    }
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
          <AlertDescription>
            The event you are looking for does not exist or may have been moved.
          </AlertDescription>
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
      <Card className="overflow-hidden">
        <div className="relative h-64 md:h-96 w-full">
          <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} priority />
          {isAdmin && (
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
                  <span>{event.date ? format(event.date.toDate(), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
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
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 p-3 rounded-md border-2 border-green-500 bg-green-500/10 text-green-700 dark:text-green-400">
                   <UserCheck className="h-5 w-5" />
                   <span className="font-semibold">You are registered!</span>
                </div>
              </div>
            ) : (
               <Button onClick={openRegistration} size="lg" className="w-full sm:w-auto">
                 <UserPlus className="mr-2 h-5 w-5" />
                 Register for Event
               </Button>
            )
          )}

          {!user && !authLoading && (
            <div>
              <Button onClick={openRegistration} size="lg" className="w-full sm:w-auto">
                <UserPlus className="mr-2 h-5 w-5" />
                Register for Event
              </Button>
              <p className='text-sm text-muted-foreground mt-2'>
                You need to be logged in to register.
              </p>
            </div>
          )}

        </CardContent>
      </Card>
    </div>
    <RegistrationForm 
      isOpen={isFormOpen} 
      onClose={() => setIsFormOpen(false)}
      onSubmit={handleRegistrationSubmit}
      isSubmitting={isSubmitting}
      />
    <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
      <DialogContent>
        <DialogHeader>
           <div className='flex items-center justify-center flex-col text-center gap-y-2 pt-4'>
            <PartyPopper className='h-12 w-12 text-accent' strokeWidth={1.5} />
            <DialogTitle className="text-2xl font-bold font-headline">Registration Successful!</DialogTitle>
            <DialogDescription>
              You are now registered for "{event.title}".
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
     <Dialog open={isQrCodeDialogOpen} onOpenChange={setIsQrCodeDialogOpen}>
      <DialogContent>
        <DialogHeader>
           <div className='flex items-center justify-center flex-col text-center gap-y-2 pt-4'>
            <QrCode className='h-12 w-12 text-primary' strokeWidth={1.5} />
            <DialogTitle className="text-2xl font-bold font-headline">Scan to Pay</DialogTitle>
            <DialogDescription>
              Please scan the QR code to complete your payment of <strong>RM{event.price?.toFixed(2)}</strong>. After payment, you can fill out the registration form.
            </DialogDescription>
           </div>
        </DialogHeader>
         {event.qrCodeUrl && (
            <div className='my-4 flex justify-center'>
              <div className="relative h-64 w-64">
                <Image src={event.qrCodeUrl} alt="Payment QR Code" layout="fill" objectFit="contain" />
              </div>
            </div>
          )}
        <DialogFooter className="pt-4 sm:justify-between gap-2">
            <DialogClose asChild>
                <Button type="button" variant="outline" className='w-full sm:w-auto'>Cancel</Button>
            </DialogClose>
            <Button type="button" className='w-full sm:w-auto' onClick={() => { setIsQrCodeDialogOpen(false); setIsFormOpen(true); }}>
                I've Paid, Continue Registration
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}
