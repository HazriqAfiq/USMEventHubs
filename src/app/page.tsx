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


export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { priceFilter, setPriceFilter, typeFilter, setTypeFilter } = useEventFilters();

  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: Event[] = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as Event;
        if (event.date && event.date.toDate() >= today) {
          eventsData.push(event);
        }
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary [text-shadow:0_2px_4px_rgba(0,0,0,0.3)]">Upcoming Events</h1>
         <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.2)]">
          Join events conducted in USM and get your MyCSD points.
        </p>
      </div>

       <div className="sm:hidden mb-6 space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-lg">Filter Events</h3>
          <div className="space-y-4">
             <div>
              <label className="text-sm font-medium mb-2 block">Price</label>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  value={priceFilter}
                  onValueChange={(value) => setPriceFilter(value as any || 'all')}
                  className="w-full justify-start"
                >
                  <ToggleGroupItem value="all" className="flex-1">All</ToggleGroupItem>
                  <ToggleGroupItem value="free" className="flex-1">Free</ToggleGroupItem>
                  <ToggleGroupItem value="paid" className="flex-1"><DollarSign className="h-4 w-4 mr-1"/>Paid</ToggleGroupItem>
                </ToggleGroup>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <ToggleGroup
                type="single"
                variant="outline"
                value={typeFilter}
                onValueChange={(value) => setTypeFilter(value as any || 'all')}
                className="w-full justify-start"
              >
                <ToggleGroupItem value="all" className="flex-1">All</ToggleGroupItem>
                <ToggleGroupItem value="online" className="flex-1"><Laptop className="h-4 w-4 mr-1"/>Online</ToggleGroupItem>
                <ToggleGroupItem value="physical" className="flex-1"><Users className="h-4 w-4 mr-1"/>Physical</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
      
      {loading ? (
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
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No Matching Events Found</h2>
          <p className="text-muted-foreground mt-2">Try adjusting your filters or check back soon!</p>
        </div>
      )}
    </div>
  );
}
