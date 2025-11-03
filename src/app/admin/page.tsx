'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import EventForm from '@/components/EventForm';
import AdminEventList from '@/components/AdminEventList';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline">Create New Event</h1>
          <p className="text-muted-foreground">Fill in the details to add a new event to the homepage.</p>
          <EventForm />
        </div>
        <Separator />
        <div>
          <h2 className="text-3xl font-bold font-headline">Manage Events</h2>
          <p className="text-muted-foreground">Review and delete existing events.</p>
          <AdminEventList />
        </div>
      </div>
    </div>
  );
}
