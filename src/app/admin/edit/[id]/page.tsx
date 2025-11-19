'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/types';
import { ArrowLeft, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function EditEventPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      // If not loading and not an admin, redirect to homepage.
      router.push('/');
    }
  }, [isAdmin, authLoading, router]);
  
  useEffect(() => {
    if (eventId && isAdmin) { // Only fetch if user is an admin
      const fetchEvent = async () => {
        try {
          const docRef = doc(db, 'events', eventId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setEvent({ id: docSnap.id, ...docSnap.data() } as Event);
          } else {
            // Handle not found case, maybe redirect to a 404 page or admin dashboard
            console.log("No such document!");
            router.push('/admin');
          }
        } finally {
          setLoading(false);
        }
      };
      fetchEvent();
    } else if (!authLoading && !isAdmin) {
        setLoading(false);
    }
  }, [eventId, router, authLoading, isAdmin]);

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
  
  if (!isAdmin) {
     return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You do not have permission to view this page. Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
           <Button variant="ghost" onClick={() => router.back()} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold font-headline">Edit Event</h1>
          <p className="text-muted-foreground">Modify the details for the event "{event?.title}".</p>
          <EventForm event={event!} />
        </div>
      </div>
    </div>
  );
}
