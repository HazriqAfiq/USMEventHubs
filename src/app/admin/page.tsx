
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Shield, Users, CalendarDays } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminUserTable from '@/components/AdminUserTable';
import AdminEventList from '@/components/AdminEventList';

export default function AdminPage() {
  const { user, userProfile, isAdmin, isSuperAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAdmin && !isSuperAdmin) {
      router.push('/');
    } else if (!loading && isSuperAdmin) {
      router.push('/superadmin'); // Superadmins should use their own more powerful dashboard
    }
  }, [isAdmin, isSuperAdmin, loading, router]);

  if (loading || !isAdmin || isSuperAdmin) {
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <Shield className="mr-3 h-8 w-8 text-primary"/>
            Admin Dashboard
          </h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            Management tools for the <span className="font-bold text-primary">{userProfile?.campus}</span>.
          </p>
        </div>
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>Manage Campus Users</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground mb-4">
                    View, disable, or assign roles to users within your campus.
                </p>
                <AdminUserTable />
            </CardContent>
        </Card>
        
        <Separator />
        
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5"/>Manage Campus Events</CardTitle>
            </CardHeader>
            <CardContent>
                 <p className="text-muted-foreground mb-4">
                    Review, edit, or delete events conducted by your campus.
                </p>
                <AdminEventList />
            </CardContent>
        </Card>

      </div>
    </div>
  );
}
