'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import AdminEventList from '@/components/AdminEventList';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import AdminDashboard from '@/components/AdminDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

export default function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin) {
      // If not loading and not an admin, redirect to homepage.
      // This also handles the case where the user is not logged in.
      router.push('/');
    }
  }, [isAdmin, loading, router]);

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
  
  // If the user is not an admin, show an access denied message while redirecting
  if (!isAdmin) {
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

  // If we reach here, user is an admin
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Admin Dashboard</h1>
           <p className="text-muted-foreground">An overview of your event metrics.</p>
          <AdminDashboard />
        </div>
        <Separator />
        <div>
          <h2 className="text-3xl font-bold font-headline">Manage Events</h2>
          <p className="text-muted-foreground">Review and delete existing events.</p>
          <AdminEventList />
        </div>
         <Separator />
        <div>
          <h1 className="text-3xl font-bold font-headline">Create New Event</h1>
          <p className="text-muted-foreground">Fill in the details to add a new event to the homepage.</p>
          <EventForm />
        </div>
      </div>
    </div>
  );
}
