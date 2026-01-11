
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, doc, getDoc } from 'firebase/firestore';
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
import type { Registration, UserProfile } from '@/types';
import { GlowingSearchBar } from './GlowingSearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';

interface AttendeesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  isPaidEvent: boolean;
}

const campuses = ["all", "Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function AttendeesDialog({ isOpen, onClose, eventId, eventName, isPaidEvent }: AttendeesDialogProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setRegistrations([]);
      setUserProfiles({});
      setSearchQuery('');
      setCampusFilter('all');
      return;
    }

    const fetchAttendees = async () => {
        setLoading(true);
        const regsRef = collection(db, 'events', eventId, 'registrations');
        const regsSnapshot = await getDocs(regsRef);
        const fetchedRegistrations = regsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
        setRegistrations(fetchedRegistrations);

        if (fetchedRegistrations.length > 0) {
            const userIds = fetchedRegistrations.map(reg => reg.id);
            const profiles: Record<string, UserProfile> = {};
            
            // Fetch users in chunks of 10 to stay within 'in' query limits if needed, though here we fetch one by one
            for (const userId of userIds) {
                try {
                    const userDoc = await getDoc(doc(db, 'users', userId));
                    if (userDoc.exists()) {
                        profiles[userId] = userDoc.data() as UserProfile;
                    }
                } catch (e) {
                    console.error(`Failed to fetch profile for user ${userId}`, e);
                }
            }
            setUserProfiles(profiles);
        }
        setLoading(false);
    };

    fetchAttendees();

  }, [isOpen, eventId]);

  const filteredAttendees = useMemo(() => {
    return registrations.filter(reg => {
      const profile = userProfiles[reg.id];
      
      const searchMatch = !searchQuery ||
        reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.matricNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const campusMatch = campusFilter === 'all' || (profile && profile.campus === campusFilter);

      return searchMatch && campusMatch;
    });
  }, [registrations, userProfiles, searchQuery, campusFilter]);


  const handleGenerateReport = () => {
    if (filteredAttendees.length === 0) return;

    const headers = ['Name', 'Matric No', 'Faculty', 'Campus', 'Registered At'];
    if (isPaidEvent) {
      headers.push('Payment Proof URL');
    }
    const csvContent = [
      headers.join(','),
      ...filteredAttendees.map(reg => {
        const profile = userProfiles[reg.id];
        const row = [
          `"${reg.name}"`,
          `"${reg.matricNo}"`,
          `"${reg.faculty}"`,
          `"${profile?.campus || 'N/A'}"`,
          `"${reg.registeredAt ? format(reg.registeredAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"`
        ];
        if (isPaidEvent) {
          row.push(`"${reg.paymentProofUrl || 'N/A'}"`);
        }
        return row.join(',');
      })
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
          <DialogTitle>Attendees for: {eventName} ({filteredAttendees.length})</DialogTitle>
          <DialogDescription>
            Search, filter, and view the list of registered attendees.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-4 py-4">
            <GlowingSearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or matric no..."
            />
            <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="w-full sm:w-[240px]">
                    <SelectValue placeholder="Filter by campus" />
                </SelectTrigger>
                <SelectContent>
                    {campuses.map(campus => (
                        <SelectItem key={campus} value={campus} className="capitalize">{campus}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
        <div className="flex-grow overflow-hidden">
            <ScrollArea className="h-full pr-6">
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                ) : filteredAttendees.length > 0 ? (
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Matric No.</TableHead>
                            <TableHead>Faculty</TableHead>
                            <TableHead>Campus</TableHead>
                            {isPaidEvent && <TableHead>Payment</TableHead>}
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {filteredAttendees.map((reg) => {
                           const profile = userProfiles[reg.id];
                           return(
                            <TableRow key={reg.id}>
                            <TableCell>
                               <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage src={profile?.photoURL || undefined} />
                                    <AvatarFallback>{getInitials(reg.name)}</AvatarFallback>
                                  </Avatar>
                                  <span>{reg.name}</span>
                                </div>
                            </TableCell>
                            <TableCell>{reg.matricNo}</TableCell>
                            <TableCell>{reg.faculty}</TableCell>
                            <TableCell>{profile?.campus || 'N/A'}</TableCell>
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
                           )
                        })}
                        </TableBody>
                    </Table>
                ) : (
                    <p className='text-muted-foreground text-center py-10'>
                        {searchQuery || campusFilter !== 'all' ? 'No attendees match your filters.' : 'No one has registered for this event yet.'}
                    </p>
                )}
            </ScrollArea>
        </div>
        <DialogFooter>
          {filteredAttendees.length > 0 && (
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
