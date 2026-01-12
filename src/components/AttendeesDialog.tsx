
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, doc, getDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { Download, Eye, Check, X } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from './ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';

interface AttendeesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  isPaidEvent: boolean;
}

type AttendanceFilter = 'all' | 'attended' | 'absent';

const campuses = ["all", "Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function AttendeesDialog({ isOpen, onClose, eventId, eventName, isPaidEvent }: AttendeesDialogProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('all');
  const [attendanceFilter, setAttendanceFilter] = useState<AttendanceFilter>('all');
  const [selected, setSelected] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setLoading(true);
      setRegistrations([]);
      setUserProfiles({});
      setSearchQuery('');
      setCampusFilter('all');
      setAttendanceFilter('all');
      setSelected([]);
      return;
    }

    const regsRef = collection(db, 'events', eventId, 'registrations');
    const unsubscribe = onSnapshot(regsRef, async (regsSnapshot) => {
        setLoading(true);
        const fetchedRegistrations = regsSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Registration));
        setRegistrations(fetchedRegistrations);

        if (fetchedRegistrations.length > 0) {
            const userIds = fetchedRegistrations.map(reg => reg.id);
            const profiles: Record<string, UserProfile> = {};
            
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
    }, (error) => {
        console.error("Error fetching attendees:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, eventId]);

  const filteredAttendees = useMemo(() => {
    return registrations.filter(reg => {
      const profile = userProfiles[reg.id];
      
      const searchMatch = !searchQuery ||
        reg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        reg.matricNo.toLowerCase().includes(searchQuery.toLowerCase());
      
      const campusMatch = campusFilter === 'all' || (profile && profile.campus === campusFilter);

      const attendanceMatch = attendanceFilter === 'all' ||
        (attendanceFilter === 'attended' && reg.attended) ||
        (attendanceFilter === 'absent' && !reg.attended);

      return searchMatch && campusMatch && attendanceMatch;
    });
  }, [registrations, userProfiles, searchQuery, campusFilter, attendanceFilter]);
  
  const handleBulkUpdate = async (attended: boolean) => {
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: 'No attendees selected' });
      return;
    }
    
    const batch = writeBatch(db);
    selected.forEach(id => {
      const regRef = doc(db, 'events', eventId, 'registrations', id);
      batch.update(regRef, { attended });
    });

    try {
      await batch.commit();
      toast({
        title: 'Attendance Updated',
        description: `${selected.length} attendee(s) have been marked as ${attended ? 'attended' : 'absent'}.`,
      });
      setSelected([]); // Clear selection after update
    } catch (error) {
       toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not update attendance status for selected attendees.",
        });
    }
  };


  const handleGenerateReport = () => {
    if (filteredAttendees.length === 0) return;

    const headers = ['Name', 'Matric No', 'Faculty', 'Campus', 'Registered At', 'Attended'];
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
          `"${reg.registeredAt ? format(reg.registeredAt.toDate(), 'yyyy-MM-dd HH:mm:ss') : 'N/A'}"`,
          `"${reg.attended ? 'Yes' : 'No'}"`
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
    link.setAttribute('download', `attendees_${safeTitle}_${attendanceFilter}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelected(filteredAttendees.map(a => a.id));
    } else {
      setSelected([]);
    }
  }

  const handleRowSelect = (id: string, checked: boolean) => {
     if (checked) {
       setSelected(prev => [...prev, id]);
     } else {
       setSelected(prev => prev.filter(selId => selId !== id));
     }
  }
  
  const isAllSelected = filteredAttendees.length > 0 && selected.length === filteredAttendees.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Attendees for: {eventName} ({filteredAttendees.length})</DialogTitle>
          <DialogDescription>
            Search, filter, and manage attendance for registered attendees.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-4 py-4">
            <GlowingSearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name or matric no..."
            />
            <Select value={attendanceFilter} onValueChange={(val) => setAttendanceFilter(val as AttendanceFilter)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by attendance" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Registered</SelectItem>
                    <SelectItem value="attended">Attended Only</SelectItem>
                    <SelectItem value="absent">Absent Only</SelectItem>
                </SelectContent>
            </Select>
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
        <div className="flex-grow overflow-hidden relative">
          <AnimatePresence>
            {selected.length > 0 && (
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 50, opacity: 0 }}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 p-2 bg-secondary rounded-lg shadow-2xl flex items-center gap-4 border border-primary/50"
                >
                    <p className="text-sm font-medium text-secondary-foreground">{selected.length} selected</p>
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={() => handleBulkUpdate(true)}>
                        <Check className="mr-2 h-4 w-4" />
                        Mark Attended
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleBulkUpdate(false)}>
                        <X className="mr-2 h-4 w-4" />
                        Mark Absent
                      </Button>
                    </div>
                </motion.div>
            )}
          </AnimatePresence>
          <ScrollArea className="h-full pr-6">
              {loading ? (
                  <div className="space-y-2">
                      {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
              ) : filteredAttendees.length > 0 ? (
                  <Table>
                      <TableHeader>
                      <TableRow>
                          <TableHead className="w-[50px]">
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={handleSelectAll}
                                aria-label="Select all"
                              />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Matric No.</TableHead>
                          <TableHead>Faculty</TableHead>
                          <TableHead>Campus</TableHead>
                          {isPaidEvent && <TableHead>Payment</TableHead>}
                          <TableHead>Status</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                      {filteredAttendees.map((reg) => {
                         const profile = userProfiles[reg.id];
                         return(
                          <TableRow key={reg.id} data-state={selected.includes(reg.id) && "selected"}>
                          <TableCell>
                            <Checkbox
                              checked={selected.includes(reg.id)}
                              onCheckedChange={(checked) => handleRowSelect(reg.id, !!checked)}
                              aria-label={`Select ${reg.name}`}
                            />
                          </TableCell>
                          <TableCell>{reg.name}</TableCell>
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
                          <TableCell>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${reg.attended ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {reg.attended ? 'Attended' : 'Absent'}
                            </span>
                          </TableCell>
                          </TableRow>
                         )
                      })}
                      </TableBody>
                  </Table>
              ) : (
                  <p className='text-muted-foreground text-center py-10'>
                      {searchQuery || campusFilter !== 'all' || attendanceFilter !== 'all' 
                       ? 'No attendees match your filters.' 
                       : 'No one has registered for this event yet.'}
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

