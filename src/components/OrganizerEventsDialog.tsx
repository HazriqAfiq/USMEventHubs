
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Card } from './ui/card';
import Image from 'next/image';
import Link from 'next/link';
import { format, isSameYear, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { Eye, Users } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface OrganizerEventsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizerId: string;
  organizerName: string;
  year: number;
}

export default function OrganizerEventsDialog({ isOpen, onClose, organizerId, organizerName, year }: OrganizerEventsDialogProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [monthFilter, setMonthFilter] = useState<string>('all');

  useEffect(() => {
    if (!isOpen || !organizerId) {
      return;
    }
    setLoading(true);

    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('organizerId', '==', organizerId));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedEvents: Event[] = [];
      snapshot.forEach(doc => {
        const eventData = { id: doc.id, ...doc.data() } as Event;
        if (eventData.date && isSameYear(eventData.date.toDate(), new Date(year, 0, 1))) {
           fetchedEvents.push(eventData);
        }
      });
      
      setEvents(fetchedEvents);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching organizer's events:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, organizerId, year]);
  
  const getEventEndTime = (event: Event): Date | null => {
    if (event.date && event.endTime) {
        const eventEndDate = event.date.toDate();
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }

  const { filteredEvents, availableMonths } = useMemo(() => {
      const now = new Date();
      
      let baseFiltered = events;

      if (timeFilter === 'upcoming') {
          baseFiltered = events.filter(event => {
              const eventEndDate = getEventEndTime(event);
              return eventEndDate ? eventEndDate >= now : false;
          });
      } else if (timeFilter === 'past') {
          baseFiltered = events.filter(event => {
              const eventEndDate = getEventEndTime(event);
              return eventEndDate ? eventEndDate < now : true;
          });
      }

      const pastEvents = events.filter(event => {
          const eventEndDate = getEventEndTime(event);
          return eventEndDate ? eventEndDate < now : true;
      });

      const monthSet = new Set<string>();
      pastEvents.forEach(event => {
          monthSet.add(format(event.date.toDate(), 'yyyy-MM'));
      });
      const availableMonths = Array.from(monthSet);
      
      if (timeFilter === 'past' && monthFilter !== 'all') {
        const selectedMonthDate = new Date(monthFilter);
        const interval = {
            start: startOfMonth(selectedMonthDate),
            end: endOfMonth(selectedMonthDate)
        };
        baseFiltered = baseFiltered.filter(event => isWithinInterval(event.date.toDate(), interval));
      }

      baseFiltered.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());

      return { filteredEvents: baseFiltered, availableMonths };
  }, [events, timeFilter, monthFilter]);
  
  useEffect(() => {
    // Reset month filter when time filter changes
    setMonthFilter('all');
  }, [timeFilter]);


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Events by {organizerName} ({year})</DialogTitle>
          <DialogDescription>
            A list of all events created by this organizer in {year}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center my-4">
            <ToggleGroup
              type="single"
              variant="outline"
              value={timeFilter}
              onValueChange={(value) => { if (value) setTimeFilter(value as any); }}
            >
              <ToggleGroupItem value="all">All</ToggleGroupItem>
              <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
              <ToggleGroupItem value="past">Past</ToggleGroupItem>
            </ToggleGroup>

            {timeFilter === 'past' && availableMonths.length > 0 && (
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue placeholder="Filter by month" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Months</SelectItem>
                        {availableMonths.map(monthStr => (
                            <SelectItem key={monthStr} value={monthStr}>
                                {format(new Date(monthStr), 'MMMM yyyy')}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </div>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 py-4">
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : filteredEvents.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No events found for the selected criteria.</p>
            ) : (
              filteredEvents.map(event => (
                <Card key={event.id} className="p-4 flex items-center gap-4">
                  <div className="relative h-16 w-24 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                    <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="font-semibold">{event.title}</h4>
                    <p className="text-sm text-muted-foreground">{format(event.date.toDate(), 'PPP')}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className='flex items-center'><Users className="mr-1.5 h-4 w-4" /> {event.registrations?.length ?? 0}</span>
                        <span className='flex items-center'><Eye className="mr-1.5 h-4 w-4" /> {event.viewCount ?? 0}</span>
                    </div>
                  </div>
                   <Button asChild variant="outline" size="sm" className="flex-shrink-0">
                       <Link href={`/organizer/edit/${event.id}`}>
                           View
                       </Link>
                   </Button>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
