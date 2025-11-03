'use client';

import { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, MapPin, UserCheck, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import type { Event } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [eventExists, setEventExists] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const isRegistered = !!user && !!event?.registrations?.includes(user.uid);

  useEffect(() => {
    if (eventId) {
      const fetchEvent = async () => {
        try {
          const docRef = doc(db, 'events', eventId);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
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
    }
  }, [eventId]);
  
  const handleRegistration = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication Required',
        description: 'You must be logged in to register for an event.',
      });
      router.push('/login');
      return;
    }

    if (!event) return;

    const eventRef = doc(db, 'events', event.id);

    try {
      if (isRegistered) {
        // Unregister logic
        await updateDoc(eventRef, {
          registrations: arrayRemove(user.uid),
        });
        setEvent(prev => prev ? { ...prev, registrations: prev.registrations?.filter(uid => uid !== user.uid) } : null);
        toast({
          title: 'Unregistered',
          description: "You have been unregistered from this event.",
        });
      } else {
        // Register logic
        await updateDoc(eventRef, {
          registrations: arrayUnion(user.uid),
        });
        setEvent(prev => prev ? { ...prev, registrations: [...(prev.registrations || []), user.uid] } : null);
        toast({
          title: 'Registration Successful!',
          description: `You are now registered for "${event.title}".`,
        });
      }
    } catch (error) {
      console.error("Error updating registration:", error);
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: 'Could not update your registration status. Please try again.',
      });
    }
  };

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
    // This case should ideally not be reached if loading is false and eventExists is true,
    // but it's good for robustness.
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="overflow-hidden">
        <div className="relative h-64 md:h-96 w-full">
          <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} priority />
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
          
          {isRegistered ? (
            <div className="flex items-center gap-2 p-3 rounded-md border-2 border-green-500 bg-green-500/10 text-green-700 dark:text-green-400">
               <UserCheck className="h-5 w-5" />
               <span className="font-semibold">You are registered for this event!</span>
            </div>
          ) : event.registrationLink ? (
             <Button asChild size="lg" className="w-full sm:w-auto">
              <a href={event.registrationLink} target="_blank" rel="noopener noreferrer">
                <UserPlus className="mr-2 h-5 w-5" />
                Join Now
              </a>
            </Button>
          ) : (
             <Button onClick={handleRegistration} size="lg" className="w-full sm:w-auto" disabled={!user}>
               <UserPlus className="mr-2 h-5 w-5" />
               Register Interest
             </Button>
          )}

           {!user && !authLoading && (
             <p className="text-sm text-muted-foreground">
                <button onClick={() => router.push('/login')} className="text-primary underline">Log in</button> to register for this event.
             </p>
           )}

        </CardContent>
      </Card>
    </div>
  );
}
