
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, ArrowLeft, CheckSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Event } from '@/types';
import AdminApprovalList from '@/components/AdminApprovalList';

export default function EventApprovalsPage() {
  const { user, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      if (isSuperAdmin) {
        router.push('/superadmin/approvals');
      } else {
        router.push('/');
      }
    }
  }, [isAdmin, isSuperAdmin, authLoading, router]);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-10 w-1/3 mb-2" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl text-center">
        <Alert variant="destructive" className="max-w-md mx-auto">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>You do not have permission to view this page. Redirecting...</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push('/admin')} className="mb-4 text-white hover:text-white/80">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="space-y-2">
          <h1 className="text-3xl font-bold font-headline flex items-center text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            <CheckSquare className="mr-3 h-8 w-8 text-primary"/>
            Event Approvals & Requests
          </h1>
          <p className="text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">Review new events and updates from organizers in your campus.</p>
        </div>
        
        <div className="mt-8">
            <AdminApprovalList preselectedStatus={statusParam} />
        </div>
      </div>
    </>
  );
}
