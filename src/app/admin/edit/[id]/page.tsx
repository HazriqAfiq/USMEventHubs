
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event, Registration } from '@/types';
import { ArrowLeft, Download, Terminal, Users, Info, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { format } from 'date-fns';
import Image from 'next/image';

export default function EditEventPage() {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(true);
  const [isPastEvent, setIsPastEvent] = useState(false);

  const getEventEndTime = (eventData: Event): Date | null => {
    if (eventData.date && eventData.endTime) {
        const eventEndDate = eventData.date.toDate();
        const [endHours, endMinutes] = eventData.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }

  useEffect(() => {
    if (authLoading) return;

    if (!isAdmin && !isSuperAdmin) {
      setHasPermission(false);
      return;
    }
    
    if (!eventId || !user) return;

    const fetchEvent = async () => {
      const docRef = doc(db, 'events', eventId);
      try {
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const eventData = { id: docSnap.id, ...docSnap.data() } as Event;

          // Admins can only edit their own events. Superadmins can edit any.
          if (isSuperAdmin || eventData.organizerId === user.uid) {
            setEvent(eventData);

            const eventEndTime = getEventEndTime(eventData);
            if (eventEndTime && eventEndTime < new Date()) {
                setIsPastEvent(true);
            }

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
            
            setLoading(false);
            return () => unsubscribe();

          } else {
            setHasPermission(false);
            setLoading(false);
          }
        } else {
          router.push('/admin');
        }
      } catch (serverError: any) {
        if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
        }
        setHasPermission(false);
        setLoading(false);
      }
    };

    fetchEvent();

  }, [eventId, router, authLoading, isAdmin, isSuperAdmin, user]);

  useEffect(() => {
    if (!authLoading && !user && !loading) {
      router.push('/login');
    } else if (!authLoading && !isAdmin && !isSuperAdmin && !loading) {
       router.push('/');
    } else if (!loading && !hasPermission) {
      const timer = setTimeout(() => {
        router.push(isSuperAdmin ? '/superadmin' : '/admin');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, user, isAdmin, isSuperAdmin, hasPermission, loading, router]);

  const handleGenerateReport = () => {
    if (!registrations.length || !event) return;

    const headers = ['Name', 'Matric No', 'Faculty', 'Registered At'];
    const csvContent = [
      headers.join(','),
      ...registrations.map(reg => [
        `"${reg.name}"`,
        `"${reg.matricNo}"`,
        `"${reg.faculty}"`,
        `"${format(reg.registeredAt.toDate(), 'yyyy-MM-dd HH:mm:ss')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const safeTitle = event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `attendees_${safeTitle}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };


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
  
  return (
    <>
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
           <Button variant="ghost" onClick={() => router.back()} className="mb-4 text-white hover:text-white/80">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Event Details</h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{isPastEvent ? "Viewing details for the past event" : "Modify the details for the event"} "{event?.title}".</p>
          {isPastEvent && (
            <Alert className="mt-4">
              <Info className="h-4 w-4" />
              <AlertTitle>Event Has Passed</AlertTitle>
              <AlertDescription>
                This event has already occurred. The details can no longer be edited.
              </AlertDescription>
            </Alert>
          )}
          <EventForm event={event!} isEditable={!isPastEvent} />
        </div>
         <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
                <CardTitle className="flex items-center">
                <Users className="mr-2" />
                Registered Attendees ({registrations.length})
                </CardTitle>
                {registrations.length > 0 && (
                  <Button onClick={handleGenerateReport} variant="outline" size="sm">
                      <Download className="mr-2 h-4 w-4" />
                      Generate Report
                  </Button>
                )}
            </div>
          </CardHeader>
          <CardContent>
            {registrations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Matric No.</TableHead>
                  <TableHead>Faculty</TableHead>
                  {!event?.isFree && <TableHead>Payment</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((reg) => (
                  <TableRow key={reg.id}>
                    <TableCell>{reg.name}</TableCell>
                    <TableCell>{reg.matricNo}</TableCell>
                    <TableCell>{reg.faculty}</TableCell>
                     {!event?.isFree && (
                      <TableCell>
                        {reg.paymentProofUrl ? (
                           <Dialog>
                            <DialogTrigger asChild>
                               <Button variant="outline" size="sm">
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Proof
                               </Button>
                             </DialogTrigger>
                             <DialogContent className="max-w-xl">
                               <DialogHeader>
                                 <DialogTitle>Payment Proof for {reg.name}</DialogTitle>
                               </DialogHeader>
                               <div className="relative mt-4 aspect-square">
                                 <Image 
                                    src={reg.paymentProofUrl}
                                    alt={`Payment proof for ${reg.name}`}
                                    fill
                                    style={{objectFit: 'contain'}}
                                 />
                               </div>
                             </DialogContent>
                           </Dialog>
                        ) : (
                          <span className='text-xs text-muted-foreground'>No proof</span>
                        )}
                      </TableCell>
                     )}
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
    </>
  );
}
