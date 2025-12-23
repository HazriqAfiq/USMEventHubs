

'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { useToast } from '@/hooks/use-toast';

export default function EditEventPage() {
  const { user, isOrganizer, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;
  const { toast } = useToast();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

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

    if (!isOrganizer && !isSuperAdmin) {
      setHasPermission(false);
      setLoading(false);
      return;
    }
    
    if (!eventId) return;

    const docRef = doc(db, 'events', eventId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const eventData = { id: docSnap.id, ...docSnap.data() } as Event;

        // Superadmins can see any event. Organizers can only see their own.
        if (isSuperAdmin || (isOrganizer && eventData.organizerId === user.uid)) {
          setEvent(eventData);
          setHasPermission(true);
          
          const registrationsRef = collection(db, 'events', eventId, 'registrations');
          const unsubscribeRegs = onSnapshot(registrationsRef, (snapshot) => {
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
          return () => unsubscribeRegs();
        } else {
          setHasPermission(false);
          setLoading(false);
        }
      } else {
        // Event not found
        setHasPermission(false);
        setLoading(false);
      }
    }, (serverError: any) => {
       if (serverError.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: docRef.path,
            operation: 'get',
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
        }
        setHasPermission(false);
        setLoading(false);
    });

    return () => unsubscribe();

  }, [eventId, authLoading, isOrganizer, isSuperAdmin, user, router]);

  useEffect(() => {
    if (!loading && !hasPermission) {
      toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'You do not have permission to view this event. Redirecting...',
      });
      const timer = setTimeout(() => {
        router.push(isSuperAdmin ? '/superadmin' : '/organizer');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [hasPermission, loading, router, isSuperAdmin, toast]);

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
  
  if (!event) {
    return null; // Should be covered by the permission check
  }
  
  // The isEditable prop for EventForm is determined by whether the event is in the past.
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

    