'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, User } from 'lucide-react';
import ProfileForm from '@/components/ProfileForm';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

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

  return (
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
      </div>
    </div>
  );
}
