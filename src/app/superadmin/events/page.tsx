
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, CalendarDays } from 'lucide-react';
import SuperAdminEventList from '@/components/SuperAdminEventList';
import { Button } from '@/components/ui/button';

export default function ManageEventsPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/');
    }
  }, [isSuperAdmin, loading, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="space-y-2">
            <Skeleton className="h-10 w-1/3" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isSuperAdmin) {
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

  return (
    <div className="container mx-auto px-4 py-8">
       <Button variant="ghost" onClick={() => router.push('/superadmin')} className="mb-4 text-white hover:text-white/80">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <CalendarDays className="mr-3 h-8 w-8 text-primary"/>
            Manage All Events
        </h1>
        <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Review, edit, or delete any event on the platform.</p>
      </div>
      <div className="mt-8">
        <SuperAdminEventList />
      </div>
    </div>
  );
}
