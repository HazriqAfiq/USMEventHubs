'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, User, UserPlus, Clock } from 'lucide-react';
import ProfileForm from '@/components/ProfileForm';
import OrganizerRequestDialog from '@/components/OrganizerRequestDialog';
import { Button } from '@/components/ui/button';

export default function ProfilePage() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();
  const [isRequestDialogOpen, setIsRequestDialogOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

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

        {canRequestOrganizer && (
            <div className="mt-8 text-center">
                <Button onClick={() => setIsRequestDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4"/>
                    Request to Become an Organizer
                </Button>
            </div>
        )}

        {isPendingOrganizer && (
            <Alert className="mt-8 bg-blue-500/10 border-blue-500/30">
                <Clock className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-300">Application Pending</AlertTitle>
                <AlertDescription className="text-blue-400/80">
                    Your request to become an organizer is currently under review by an admin. You will be notified once it has been processed.
                </AlertDescription>
            </Alert>
        )}
      </div>
    </div>
    <OrganizerRequestDialog isOpen={isRequestDialogOpen} onClose={() => setIsRequestDialogOpen(false)} />
    </>
  );
}
