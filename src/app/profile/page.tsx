
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, User, UserPlus, Clock, XCircle } from 'lucide-react';
import ProfileForm from '@/components/ProfileForm';
import OrganizerRequestDialog from '@/components/OrganizerRequestDialog';
import { Button } from '@/components/ui/button';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { OrganizerApplication } from '@/types';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);
  const [rejectedApplication, setRejectedApplication] = useState<OrganizerApplication | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);
  
  useEffect(() => {
    if (user && userProfile?.role === 'student') {
        const appsRef = collection(db, 'organizer_applications');
        const q = query(
            appsRef,
            where('userId', '==', user.uid),
            where('status', '==', 'rejected'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latestRejectedApp = snapshot.docs[0].data() as OrganizerApplication;
                setRejectedApplication(latestRejectedApp);
            } else {
                setRejectedApplication(null);
            }
        }, (error) => {
            // This permission error is expected if rules are not set up yet,
            // but the UI should still function.
            console.warn("Could not check for rejected applications, possibly due to Firestore rules.");
            setRejectedApplication(null);
        });

        return () => unsubscribe();
    }
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-4">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-2/3" />
            <div className="pt-8 space-y-6">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-10 w-24 self-end" />
            </div>
        </div>
      </div>
    );
  }

  if (!user) {
     return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in to view this page. Redirecting...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const canRequestOrganizer = userProfile?.role === 'student';
  const isPendingOrganizer = userProfile?.role === 'pending-organizer';

  return (
    <>
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <User className="mr-3 h-8 w-8 text-white"/>
            My Profile
        </h1>
        <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Manage your personal information.</p>
      </div>
      <div className="mt-8">
        <ProfileForm />

        {isPendingOrganizer && (
            <Alert className="mt-8 bg-blue-500/10 border-blue-500/30">
                <Clock className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-300">Application Pending</AlertTitle>
                <AlertDescription className="text-blue-400/80">
                    Your request to become an organizer is currently under review by an admin. You will be notified once it has been processed.
                </AlertDescription>
            </Alert>
        )}
        
        {rejectedApplication && userProfile?.role === 'student' && (
             <Alert variant="destructive" className="mt-8">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Organizer Application Rejected</AlertTitle>
                <AlertDescription>
                    Your recent application was not approved for the following reason:
                    <p className="font-semibold mt-2 pl-4 border-l-2 border-destructive/50">{rejectedApplication.rejectionReason}</p>
                </AlertDescription>
            </Alert>
        )}

        {canRequestOrganizer && (
            <div className="mt-8 text-center">
                <Button onClick={() => setIsRequestDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Request to Become an Organizer
                </Button>
            </div>
        )}

      </div>
    </div>
    <OrganizerRequestDialog isOpen={isRequestDialogOpen} onClose={() => setIsRequestDialogOpen(false)} />
    </>
  );
}

    