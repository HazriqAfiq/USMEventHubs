
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Download, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ScrollArea } from './ui/scroll-area';
import {
  Dialog as ImageDialog,
  DialogContent as ImageDialogContent,
  DialogHeader as ImageDialogHeader,
  DialogTitle as ImageDialogTitle,
  DialogTrigger as ImageDialogTrigger,
} from '@/components/ui/dialog';
import Image from 'next/image';
import type { Registration } from '@/types';

interface AttendeesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  isPaidEvent: boolean;
}

export default function AttendeesDialog({ isOpen, onClose, eventId, eventName, isPaidEvent }: AttendeesDialogProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setRegistrations([]);
      return;
    }

    const registrationsRef = collection(db, 'events', eventId, 'registrations');
    const q = query(registrationsRef, onSnapshot);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const regs: Registration[] = [];
      snapshot.forEach(doc => {
        regs.push({ id: doc.id, ...doc.data() } as Registration);
      });
      setRegistrations(regs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching registrations:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, eventId]);

  const handleGenerateReport = () => {
    if (!registrations.length) return;

    const headers = ['Name', 'Matric No', 'Faculty', 'Registered At'];
    const csvContent = [
      headers.join(','),
      ...registrations.map(reg => [
        `"${reg.name}"`,
        `"${reg.matricNo}"`,
        `"${reg.faculty}"`,
        `"${reg.registeredAt ? format(reg.registeredAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    
    const safeTitle = eventName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    link.setAttribute('download', `attendees_${safeTitle}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendees for: {eventName} ({registrations.length})</DialogTitle>
          <DialogDescription>
            Below is the list of all registered attendees for this event.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-6">
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : registrations.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Matric No.</TableHead>
                            <TableHead>Faculty</TableHead>
                            {isPaidEvent && <TableHead>Payment</TableHead>}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {registrations.map((reg) => (
                            <TableRow key={reg.id}>
                            <TableCell>{reg.name}</TableCell>
                            <TableCell>{reg.matricNo}</TableCell>
                            <TableCell>{reg.faculty}</TableCell>
                            {isPaidEvent && (
                                <TableCell>
                                {reg.paymentProofUrl ? (
                                    <ImageDialog>
                                    <ImageDialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <Eye className="mr-2 h-4 w-4" />
                                            View Proof
                                        </Button>
                                        </ImageDialogTrigger>
                                        <ImageDialogContent className="max-w-xl">
                                        <ImageDialogHeader>
                                            <ImageDialogTitle>Payment Proof for {reg.name}</ImageDialogTitle>
                                        </ImageDialogHeader>
                                        <div className="relative mt-4 aspect-square">
                                            <Image 
                                            src={reg.paymentProofUrl}
                                            alt={`Payment proof for ${reg.name}`}
                                            fill
                                            style={{objectFit: 'contain'}}
                                            />
                                        </div>
                                        </ImageDialogContent>
                                    </ImageDialog>
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
                    <p className='text-muted-foreground text-center py-10'>No one has registered for this event yet.</p>
                )}
            </ScrollArea>
        </div>
        <DialogFooter>
          {registrations.length > 0 && (
            <Button onClick={handleGenerateReport} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
