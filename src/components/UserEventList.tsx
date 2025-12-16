'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format, getMonth, getYear, startOfToday } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Event } from '@/types';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarCheck, CalendarX, Eye } from 'lucide-react';
import { Button } from './ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface UserEventListProps {
  userId: string;
}

type MonthlyEventCount = {
  name: string;
  total: number;
};


export default function UserEventList({ userId }: UserEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'upcoming' | 'past'>('upcoming');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchRegisteredEvents = async () => {
      setLoading(true);
      try {
        const eventsQuery = query(collection(db, 'events'));
        const eventsSnapshot = await getDocs(eventsQuery);
        
        const registeredEventsPromises = eventsSnapshot.docs.map(async (eventDoc) => {
          const eventId = eventDoc.id;
          const registrationRef = doc(db, 'events', eventId, 'registrations', userId);
          const registrationSnap = await getDoc(registrationRef).catch(() => null); // Catch potential permission errors on individual docs
          
          if (registrationSnap && registrationSnap.exists()) {
            return { id: eventId, ...eventDoc.data() } as Event;
          }
          return null;
        });

        const registeredEvents = (await Promise.all(registeredEventsPromises)).filter(event => event !== null) as Event[];
        
        registeredEvents.sort((a, b) => b.date.toDate().getTime() - a.date.toDate().getTime());
        setEvents(registeredEvents);

      } catch (serverError) {
         const permissionError = new FirestorePermissionError({
            path: 'events', 
            operation: 'list',
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRegisteredEvents();
    
    const unsubscribe = onSnapshot(collection(db, 'events'), () => {
        fetchRegisteredEvents();
    });

    return () => unsubscribe();

  }, [userId]);

  const { filteredEvents, upcomingCount, pastCount, monthlyData, availableYears } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const upcoming = events.filter(event => event.date && event.date.toDate() >= today);
    const past = events.filter(event => event.date && event.date.toDate() < today);

    const yearSet = new Set<number>();
    const monthCounts: { [key: number]: number[] } = {}; // year -> month counts

     events.forEach(event => {
      if (!event.date) return;
      const eventDate = event.date.toDate();
      const eventYear = getYear(eventDate);
      yearSet.add(eventYear);
      
      if(eventYear === selectedYear) {
         const month = getMonth(eventDate);
         if (!monthCounts[eventYear]) {
           monthCounts[eventYear] = Array(12).fill(0);
         }
         monthCounts[eventYear][month]++;
      }
    });

    const monthlyData: MonthlyEventCount[] = [];
    const yearCounts = monthCounts[selectedYear] || Array(12).fill(0);

    for (let month = 0; month < 12; month++) {
      const date = new Date(selectedYear, month);
      monthlyData.push({
        name: format(date, 'MMM'),
        total: yearCounts[month],
      });
    }

    const availableYears = Array.from(yearSet).sort((a,b) => b-a);
     if (!yearSet.has(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
        availableYears.sort((a,b) => b - a);
    }

    return {
      filteredEvents: filter === 'upcoming' ? upcoming : past,
      upcomingCount: upcoming.length,
      pastCount: past.length,
      monthlyData,
      availableYears,
    };
  }, [events, filter, selectedYear]);

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-28"/>
            <Skeleton className="h-28"/>
        </div>
         <div className="mt-8">
            <Skeleton className="h-[350px] w-full" />
        </div>
        <Skeleton className="h-12 w-64 mt-8" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming Registered Events</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{upcomingCount}</div>
                    <p className="text-xs text-muted-foreground">Events you've registered for that are yet to happen.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Past Attended Events</CardTitle>
                    <CalendarX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pastCount}</div>
                    <p className="text-xs text-muted-foreground">Events you've registered for that have already occurred.</p>
                </CardContent>
            </Card>
        </div>

        <div className="mt-8">
            <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>My Participation</CardTitle>
                      <p className="text-sm text-muted-foreground">
                          Number of events you've joined per month for the year {selectedYear}.
                      </p>
                    </div>
                     {availableYears.length > 0 && (
                        <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Select Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableYears.map(year => (
                                    <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip 
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                        <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
      </div>

      <div className='mt-8'>
        <ToggleGroup
            type="single"
            variant="outline"
            value={filter}
            onValueChange={(value) => setFilter(value as any || 'upcoming')}
            className="mb-4"
            >
            <ToggleGroupItem value="upcoming" className="text-white">Upcoming</ToggleGroupItem>
            <ToggleGroupItem value="past" className="text-white">Past</ToggleGroupItem>
        </ToggleGroup>

        {filteredEvents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
            No {filter} events found.
            </Card>
        ) : (
            <div className="space-y-4">
            {filteredEvents.map((event) => (
            <Card key={event.id} className="flex items-center p-4 gap-4 transition-all hover:shadow-md">
                <div className="relative h-16 w-16 md:h-20 md:w-28 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
                </div>
                <div className="flex-grow overflow-hidden">
                <h3 className="font-bold truncate">{event.title}</h3>
                <p className="text-sm text-muted-foreground">{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</p>
                 <p className="text-sm text-muted-foreground">{event.location}</p>
                </div>
                <div className='flex gap-2 flex-shrink-0'>
                <Link href={`/event/${event.id}`}>
                    <Button variant="outline" size="sm">
                       <Eye className="h-4 w-4 mr-2" />
                        View Event
                    </Button>
                </Link>
                </div>
            </Card>
            ))}
            </div>
        )}
      </div>
    </div>
  );
}
