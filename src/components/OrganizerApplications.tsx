
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrganizerApplication } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Badge } from './ui/badge';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Skeleton } from './ui/skeleton';
import { Check, Eye, X, FileClock, XCircle, CheckCircle, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Textarea } from './ui/textarea';
import Image from 'next/image';

const campuses = ["All Campuses", "Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function OrganizerApplications() {
  const { user, userProfile, isSuperAdmin, isAdmin } = useAuth();
  const [applications, setApplications] = useState<OrganizerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [campusFilter, setCampusFilter] = useState('All Campuses');
  
  const [selectedApp, setSelectedApp] = useState<OrganizerApplication | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let q;
    const appsRef = collection(db, 'organizer_applications');
    if (isSuperAdmin) {
      q = query(appsRef);
    } else if (isAdmin && userProfile?.campus) {
      q = query(appsRef, where('campus', '==', userProfile.campus));
    } else {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const appsData: OrganizerApplication[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as OrganizerApplication));
      appsData.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime());
      setApplications(appsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching organizer applications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isSuperAdmin, isAdmin, userProfile]);

  const filteredApps = useMemo(() => {
    return applications.filter(app => {
      const statusMatch = statusFilter === 'all' || app.status === statusFilter;
      const searchMatch = !searchQuery || 
                          app.userName.toLowerCase().includes(searchQuery.toLowerCase());
      const campusMatch = campusFilter === 'All Campuses' || app.campus === campusFilter;
      return statusMatch && searchMatch && campusMatch;
    });
  }, [applications, statusFilter, searchQuery, campusFilter]);
  
  const handleApprove = async (app: OrganizerApplication) => {
    const batch = writeBatch(db);
    const appRef = doc(db, 'organizer_applications', app.id);
    const userRef = doc(db, 'users', app.userId);
    
    batch.update(appRef, { status: 'approved', rejectionReason: '' });
    batch.update(userRef, { role: 'organizer', disabled: false });
    
    try {
      await batch.commit();
      toast({ title: 'Application Approved', description: `${app.userName} is now an organizer and their account is enabled.` });
      handleCloseDetail();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Approval Failed', description: error.message });
    }
  };
  
  const handleReject = async () => {
    if (!selectedApp || !rejectionReason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for rejection.' });
      return;
    }
    setIsSubmitting(true);
    
    const batch = writeBatch(db);
    const appRef = doc(db, 'organizer_applications', selectedApp.id);
    const userRef = doc(db, 'users', selectedApp.userId);

    batch.update(appRef, { status: 'rejected', rejectionReason: rejectionReason.trim() });
    // Revert user role to student but keep them disabled, so they can't re-apply immediately
    // or access the system if their initial account creation was part of this flow.
    batch.update(userRef, { role: 'student' });
    
    try {
      await batch.commit();
      toast({ title: 'Application Rejected' });
      setIsRejectDialogOpen(false);
      handleCloseDetail();
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Rejection Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDetail = (app: OrganizerApplication) => {
    setSelectedApp(app);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setSelectedApp(null);
    setIsDetailOpen(false);
  };
  
  const openRejectDialog = () => {
    if (!selectedApp) return;
    setIsRejectDialogOpen(true);
    setRejectionReason('');
  }

  const getStatusBadge = (status: OrganizerApplication['status']) => {
    switch (status) {
      case 'pending': return <Badge variant="outline" className="text-yellow-400 border-yellow-400/50"><FileClock className="mr-1 h-3 w-3" />Pending</Badge>;
      case 'approved': return <Badge variant="outline" className="text-green-400 border-green-400/50"><CheckCircle className="mr-1 h-3 w-3" />Approved</Badge>;
      case 'rejected': return <Badge variant="outline" className="text-red-400 border-red-400/50"><XCircle className="mr-1 h-3 w-3" />Rejected</Badge>;
    }
  };

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <Input placeholder="Search by applicant name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full md:flex-grow"/>
          {isSuperAdmin && (
            <Select value={campusFilter} onValueChange={setCampusFilter}>
                <SelectTrigger className="w-full md:w-[250px]"><SelectValue /></SelectTrigger>
                <SelectContent>{campuses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </div>
        <div className="flex justify-center">
            <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => { if (v) setStatusFilter(v as any)}}>
                <ToggleGroupItem value="pending">Pending</ToggleGroupItem>
                <ToggleGroupItem value="approved">Approved</ToggleGroupItem>
                <ToggleGroupItem value="rejected">Rejected</ToggleGroupItem>
                <ToggleGroupItem value="all">All</ToggleGroupItem>
            </ToggleGroup>
        </div>

        {filteredApps.length === 0 ? (
          <Card className="p-12 text-center text-muted-foreground"><p>No applications match the current filters.</p></Card>
        ) : (
          filteredApps.map(app => (
            <Card key={app.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(app.status)}
                  <h3 className="font-bold">{app.userName}</h3>
                </div>
                <p className="text-sm text-muted-foreground">Campus: {app.campus}</p>
                <p className="text-sm text-muted-foreground">Submitted: {formatDistanceToNow(app.createdAt.toDate(), { addSuffix: true })}</p>
              </div>
              <div className="flex gap-2 flex-shrink-0 self-end sm:self-center">
                <Button variant="outline" size="sm" onClick={() => handleOpenDetail(app)}><Eye className="mr-2 h-4 w-4"/>View Details</Button>
                {app.status === 'pending' && (
                  <>
                    <Button size="sm" onClick={() => handleApprove(app)}><Check className="mr-2 h-4 w-4 text-white"/>Approve</Button>
                    <Button variant="destructive" size="sm" onClick={() => { setSelectedApp(app); openRejectDialog();}}><X className="mr-2 h-4 w-4"/>Reject</Button>
                  </>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Detail View Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={handleCloseDetail}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application from: {selectedApp?.userName}</DialogTitle>
            <DialogDescription>
              Email: {selectedApp?.userEmail}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-6">
            <h4 className="font-semibold">Description</h4>
            <p className="text-sm text-muted-foreground p-3 bg-muted/50 rounded-md">{selectedApp?.organizationDesc}</p>
            {selectedApp?.socialLink && (
              <div>
                <h4 className="font-semibold">Social Media</h4>
                <a href={selectedApp.socialLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline break-all">{selectedApp.socialLink}</a>
              </div>
            )}
            <div>
              <h4 className="font-semibold">Proof of Legitimacy</h4>
              <a href={selectedApp?.proofUrl} target="_blank" rel="noopener noreferrer">
                <div className="mt-2 relative aspect-video w-full rounded-md overflow-hidden border bg-muted cursor-pointer">
                    <Image src={selectedApp?.proofUrl || ''} alt="Proof of legitimacy" layout="fill" objectFit='contain' />
                </div>
              </a>
            </div>
             {selectedApp?.status === 'rejected' && selectedApp.rejectionReason && (
                <div>
                    <h4 className="font-semibold text-destructive">Rejection Reason</h4>
                    <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{selectedApp.rejectionReason}</p>
                </div>
            )}
          </div>
          <DialogFooter>
            {selectedApp?.status === 'pending' && (
                <>
                 <Button variant="destructive" onClick={openRejectDialog}>Reject</Button>
                 <Button onClick={() => handleApprove(selectedApp)}>Approve</Button>
                </>
            )}
             <Button variant="outline" onClick={handleCloseDetail}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Rejection Reason Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>Please provide a reason for rejecting this application. This will be visible to the user.</DialogDescription>
          </DialogHeader>
          <Textarea placeholder="e.g., Insufficient proof provided." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} disabled={isSubmitting} className="my-4"/>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsRejectDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={isSubmitting || !rejectionReason.trim()}>
                {isSubmitting ? 'Submitting...' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
