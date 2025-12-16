'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@/types';
import { useEventFilters } from '@/hooks/use-event-filters';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DollarSign, Laptop, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/SplashScreen';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const { priceFilter, setPriceFilter, typeFilter, setTypeFilter } = useEventFilters();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (authLoading || !user) return;

    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: Event[] = [];
      const now = new Date();

      querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as Event;
        
        // Calculate the event's end time
        if (event.date && event.endTime) {
          const eventEndDate = event.date.toDate();
          const [endHours, endMinutes] = event.endTime.split(':').map(Number);
          eventEndDate.setHours(endHours, endMinutes, 0, 0);

          // Only show events that have not ended yet
          if (eventEndDate >= now) {
            eventsData.push(event);
          }
        }
      });
      setEvents(eventsData);
      setLoadingEvents(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoadingEvents(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  // Hide splash screen after a delay, but only if auth is finished.
  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1700); // Same duration as splash screen animation
      return () => clearTimeout(timer);
    }
  }, [authLoading, user]);

  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      const priceMatch = 
        priceFilter === 'all' || 
        (priceFilter === 'free' && event.isFree) || 
        (priceFilter === 'paid' && !event.isFree);
      
      const typeMatch = 
        typeFilter === 'all' || 
        typeFilter === event.eventType;

      return priceMatch && typeMatch;
    });
  }, [events, priceFilter, typeFilter]);
  
  if (authLoading || !user) {
    // Show a skeleton loader while checking for auth or redirecting
    return (
       <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
            <Skeleton className="h-12 w-1/2 mx-auto" />
            <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-3/e" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.5)]">Upcoming Events</h1>
         <p className="text-lg text-white/90 mt-2 max-w-2xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
          Join events conducted in USM and get your MyCSD points.
        </p>
      </div>

       <div className="flex justify-center mb-8">
        <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-card/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={priceFilter}
                  onValueChange={(value) => setPriceFilter(value as any || 'all')}
                  aria-label="Filter by price"
                >
                  <ToggleGroupItem value="all" aria-label="All prices">All</ToggleGroupItem>
                  <ToggleGroupItem value="free" aria-label="Free events">Free</ToggleGroupItem>
                  <ToggleGroupItem value="paid" aria-label="Paid events"><DollarSign className="h-4 w-4 mr-1"/>Paid</ToggleGroupItem>
                </ToggleGroup>
            </div>
             <div className="flex items-center gap-2">
                 <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as any || 'all')}
                  aria-label="Filter by type"
                >
                  <ToggleGroupItem value="all" aria-label="All event types">All</ToggleGroupItem>
                  <ToggleGroupItem value="online" aria-label="Online events"><Laptop className="h-4 w-4 mr-1"/>Online</ToggleGroupItem>
                  <ToggleGroupItem value="physical" aria-label="Physical events"><Users className="h-4 w-4 mr-1"/>Physical</ToggleGroupItem>
                </ToggleGroup>
            </div>
        </div>
      </div>
      
      {loadingEvents ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg bg-black/20">
          <h2 className="text-xl font-semibold text-white">No Matching Events Found</h2>
          <p className="text-white/80 mt-2">Try adjusting your filters or check back soon!</p>
        </div>
      )}
    </div>
  );
}
