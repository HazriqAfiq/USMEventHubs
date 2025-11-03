'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { EventFilterProvider } from '@/hooks/use-event-filters';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <EventFilterProvider>
        {children}
      </EventFilterProvider>
    </AuthProvider>
  );
}