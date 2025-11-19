'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event, Registration } from '@/types';
import { ArrowLeft, Terminal, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function EditEventPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin) {
      router.push('/');
      return;
    }
    
    if (!eventId || !user) return;

    const fetchEvent = async () => {
      try {
        const docRef = doc(db, 'events', eventId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const eventData = { id: docSnap.id, ...docSnap.data() } as Event;

          if (eventData.organizerId === user.uid) {
            setEvent(eventData);
            setHasPermission(true);
            
            const registrationsRef = collection(db, 'events', eventId, 'registrations');
            const unsubscribe = onSnapshot(registrationsRef, (snapshot) => {
              const regs: Registration[] = [];
              snapshot.forEach(doc => {
                  regs.push({ id: doc.id, ...doc.data() } as Registration);
              });
              setRegistrations(regs);
            }, (serverError) => {
                const permissionError = new FirestorePermissionError({
                  path: registrationsRef.path,
                  operation: 'list',
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);
            });
            
            return () => unsubscribe();
          } else {
            setHasPermission(false);
          }
        } else {
          router.push('/admin');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();

  }, [eventId, router, authLoading, isAdmin, user]);

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
  
  if (!isAdmin || !hasPermission) {
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
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
           <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white hover:text-white/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Admin
          </Button>
          <h1 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Edit Event</h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Modify the details for the event "{event?.title}".</p>
          <EventForm event={event!} />
        </div>
         <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2" />
              Registered Attendees ({registrations.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {registrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Matric No.</TableHead>
                  <TableHead>Faculty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>{reg.name}</TableCell>
                    <TableCell>{reg.matricNo}</TableCell>
                    <TableCell>{reg.faculty}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            ) : (
                <p className='text-muted-foreground'>No one has registered for this event yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
