
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import OrganizerEventList from '@/components/OrganizerEventList';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import OrganizerDashboard from '@/components/OrganizerDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function OrganizerPage() {
  const { user, isOrganizer, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !isOrganizer) {
      if(isSuperAdmin) {
        router.push('/superadmin');
      } else {
        router.push('/');
      }
    }
  }, [isOrganizer, isSuperAdmin, loading, router]);

  // Show skeleton loader while checking auth state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-96 w-full" />
          </div>
          <Separator />
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/4" />
             <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  // If the user is not an organizer, show an access denied message while redirecting
  if (!isOrganizer) {
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

  // If we reach here, user is an organizer
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Organizer Dashboard</h1>
           <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">An overview of your event metrics.</p>
          <OrganizerDashboard onMonthClick={setMonthFilter} />
        </div>
        <Separator />
        <div>
          <h2 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Manage Events</h2>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Review and delete existing events.</p>
          <OrganizerEventList monthFilter={monthFilter} onClearMonthFilter={() => setMonthFilter(null)} />
        </div>
         <Separator />
        <div>
          <h1 className="text-3xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Create New Event</h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Fill in the details to add a new event to the homepage.</p>
          <EventForm />
        </div>
      </div>
    </div>
  );
}
