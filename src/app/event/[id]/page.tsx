'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, collection, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, MapPin, UserCheck, UserPlus, FilePenLine, Clock } from 'lucide-react';
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
    if (user && eventId) {
      const regRef = doc(db, 'events', eventId, 'registrations', user.uid);
      const unsubscribe = onSnapshot(regRef, (doc) => {
        setIsRegistered(doc.exists());
      }, (error) => {
        console.error("Error checking registration status:", error);
        setIsRegistered(false);
      });
      return () => unsubscribe();
    } else {
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
      toast({
        title: 'Registration Successful!',
        description: `You are now registered for "${event.title}".`,
      });
      setIsFormOpen(false);
    } catch (error) {
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
    setIsFormOpen(true);
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
    </>
  );
}
