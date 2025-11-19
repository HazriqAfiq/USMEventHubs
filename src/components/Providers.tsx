'use client';

import { AuthProvider } from '@/hooks/use-auth';
import { EventFilterProvider } from '@/hooks/use-event-filters';
import { FirebaseErrorListener } from './FirebaseErrorListener';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FirebaseErrorListener />
      <EventFilterProvider>
        {children}
      </EventFilterProvider>
    </AuthProvider>
  );
}
