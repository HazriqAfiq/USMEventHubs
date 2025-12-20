
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, User } from 'lucide-react';
import UserEventList from '@/components/UserEventList';

export default function DashboardPage() {
  const { user, isOrganizer, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not loading and user is not logged in, or if user is an organizer, redirect to homepage.
    if (!loading && (!user || isOrganizer || isSuperAdmin)) {
      router.push('/');
    }
  }, [user, isOrganizer, isSuperAdmin, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/4" />
            <Skeleton className="h-6 w-1/2" />
          </div>
           <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32"/>
              <Skeleton className="h-32"/>
            </div>
          <div className="space-y-2 mt-8">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in or is an organizer, show a message while redirecting.
  if (!user || isOrganizer || isSuperAdmin) {
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

  // If we reach here, user is a logged-in student
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
             <User className="mr-3 h-8 w-8 text-white"/>
            My Dashboard
          </h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">An overview of your registered events.</p>
        </div>
        <div>
          <UserEventList userId={user.uid} />
        </div>
      </div>
    </div>
  );
}
