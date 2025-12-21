

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Terminal, ShieldCheck, Users, ArrowRight, CheckSquare } from 'lucide-react';
import SuperAdminEventList from '@/components/SuperAdminEventList';
import SuperAdminDashboard from '@/components/SuperAdminDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import GlobalBannerForm from '@/components/GlobalBannerForm';

export default function SuperAdminPage() {
  const { user, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.push('/');
    }
  }, [isSuperAdmin, loading, router]);
  
  const handleCampusClick = (campus: string | null) => {
    if (campus) {
      router.push(`/superadmin/users?campus=${encodeURIComponent(campus)}`);
    } else {
      router.push('/superadmin/users');
    }
  };

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
           <SuperAdminDashboard onCampusClick={handleCampusClick} />
        </div>
        <Separator />
        <div>
          <h2 className="text-2xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Global Broadcast Banner</h2>
           <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Display a site-wide announcement banner on the homepage.
          </p>
          <GlobalBannerForm />
        </div>
        <Separator />
        <div className="grid md:grid-cols-2 gap-8">
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><CheckSquare className="mr-2 h-5 w-5"/>Event Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Review and approve or reject new events submitted by organizers.
              </p>
              <Button asChild>
                <Link href="/superadmin/approvals">
                  Go to Approvals <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
           </Card>
           <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>Manage All Users</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                View, edit, disable, or delete user accounts.
              </p>
              <Button asChild>
                <Link href="/superadmin/users">
                  Go to User Management <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
           </Card>
        </div>
        <Separator />
         <div>
          <h2 className="text-2xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Manage All Events</h2>
           <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Review, edit, or delete any event on the platform.
          </p>
          <SuperAdminEventList />
        </div>
      </div>
    </div>
  );
}

