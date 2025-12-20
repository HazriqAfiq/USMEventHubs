
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Terminal, ShieldCheck } from 'lucide-react';
import UserManagementTable from '@/components/SuperAdminUserTable';
import SuperAdminEventList from '@/components/SuperAdminEventList';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';

export default function SuperAdminPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [campusFilter, setCampusFilter] = useState<string | null>(null);


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
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <ShieldCheck className="mr-3 h-8 w-8 text-primary"/>
            Super Admin Dashboard
          </h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Site-wide analytics and management tools.
          </p>
           <SuperAdminDashboard onCampusClick={setCampusFilter}/>
        </div>
        <Separator />
         <div>
          <h2 className="text-2xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Manage All Events</h2>
           <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Review, edit, or delete any event on the platform.
          </p>
          <SuperAdminEventList />
        </div>
        <Separator />
        <div>
          <h2 className="text-2xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Manage All Users</h2>
           <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            View users, change roles, and manage accounts.
          </p>
          <UserManagementTable campusFilter={campusFilter} onClearCampusFilter={() => setCampusFilter(null)} />
        </div>
      </div>
    </div>
  );
}
