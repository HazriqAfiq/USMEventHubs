
'use client';

import { useSearchParams } from 'next/navigation';
import AdminApprovalList from '@/components/AdminApprovalList';

export function ApprovalListWrapper() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get('status');

  return (
    <div className="mt-8">
      <AdminApprovalList preselectedStatus={statusParam} />
    </div>
  );
}
