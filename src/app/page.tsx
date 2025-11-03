'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@/types';
import { useEventFilters } from '@/hooks/use-event-filters';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';


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
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary">Upcoming Events</h1>
        <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">
          Join events conducted in USM and get your MyCSD points.
        </p>
        <p className="text-sm text-muted-foreground mt-2">Powered and developed by Chillframe.</p>
      </div>

       <div className="sm:hidden mb-6 space-y-4 p-4 border rounded-lg bg-card">
          <h3 className="font-semibold text-lg">Filter Events</h3>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Price</label>
              <Select value={priceFilter} onValueChange={(value) => setPriceFilter(value as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="By Price" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium">Type</label>
              <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="By Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                  <SelectItem value="physical">Physical</SelectItem>
                </SelectContent>
              </Select>
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
