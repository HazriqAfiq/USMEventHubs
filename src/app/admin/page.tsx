
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Shield, Users, CalendarDays, CheckSquare, ArrowRight, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AdminDashboard from '@/components/AdminDashboard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import AdminEventList from '@/components/AdminEventList';

export default function AdminPage() {
  const { user, userProfile, isAdmin, isSuperAdmin, loading } = useAuth();
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState<Date | null>(null);

  useEffect(() => {
    if (!loading && !isAdmin && !isSuperAdmin) {
      router.push('/');
    } else if (!loading && isSuperAdmin) {
      router.push('/superadmin'); // Superadmins use their own more powerful dashboard
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
          <AdminDashboard onMonthClick={setMonthFilter} />
        </div>

        {monthFilter && (
            <>
                <Separator />
                <div>
                  <h2 className="text-2xl font-bold font-headline text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Filtered Events</h2>
                  <AdminEventList monthFilter={monthFilter} onClearMonthFilter={() => setMonthFilter(null)} />
                </div>
            </>
        )}
        
        <Separator />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
           <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><CheckSquare className="mr-2 h-5 w-5"/>Event Approvals</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <p className="text-muted-foreground mb-4 flex-grow">
                Review and approve or reject new events from your campus.
              </p>
              <Button asChild>
                <Link href="/admin/approvals">
                  Go to Approvals <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
           </Card>
           <Card className="flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center"><UserPlus className="mr-2 h-5 w-5"/>Organizer Requests</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
                <p className="text-muted-foreground mb-4 flex-grow">
                Review and approve users to become event organizers.
                </p>
                <Button asChild>
                <Link href="/admin/organizers">
                    Manage Requests <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
                </Button>
            </CardContent>
            </Card>
           <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5"/>Manage Campus Users</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <p className="text-muted-foreground mb-4 flex-grow">
                View, disable, or assign roles to users within your campus.
              </p>
              <Button asChild>
                <Link href="/admin/users">
                  Go to User Management <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
           </Card>
           <Card className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center"><CalendarDays className="mr-2 h-5 w-5"/>Manage Campus Events</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <p className="text-muted-foreground mb-4 flex-grow">
                Review, edit, or delete events conducted by your campus.
              </p>
              <Button asChild>
                <Link href="/admin/events">
                  Go to Event Management <ArrowRight className="ml-2 h-4 w-4"/>
                </Link>
              </Button>
            </CardContent>
           </Card>
        </div>

      </div>
    </div>
  );
}
