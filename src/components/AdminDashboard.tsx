'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, getMonth, getYear, startOfToday, isAfter, isBefore, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { CalendarCheck, CalendarClock, CalendarX, Package } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event } from '@/types';

type MonthlyEventCount = {
  name: string;
  total: number;
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'events'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: Event[] = [];
      querySnapshot.forEach((doc) => {
        eventsData.push({ id: doc.id, ...doc.data() } as Event);
      });
      setEvents(eventsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching events for dashboard: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const { upcomingCount, pastCount, thisMonthCount, monthlyData } = useMemo(() => {
    const today = startOfToday();
    const currentMonthInterval = { start: startOfMonth(today), end: endOfMonth(today) };
    
    let upcomingCount = 0;
    let pastCount = 0;
    let thisMonthCount = 0;
    
    const monthCounts: { [key: number]: number[] } = {}; // year -> month counts

    events.forEach(event => {
      if (!event.date) return;
      const eventDate = event.date.toDate();

      if (isAfter(eventDate, today)) {
        upcomingCount++;
      } else if (isBefore(eventDate, today)) {
        pastCount++;
      }

      if (isWithinInterval(eventDate, currentMonthInterval)) {
          thisMonthCount++;
      }

      const year = getYear(eventDate);
      const month = getMonth(eventDate);
      if (!monthCounts[year]) {
        monthCounts[year] = Array(12).fill(0);
      }
      monthCounts[year][month]++;
    });

    const monthlyData: MonthlyEventCount[] = [];
    const currentYear = getYear(today);
    // Show last 12 months including current
    for (let i = 11; i >= 0; i--) {
        const date = new Date(today);
        date.setMonth(date.getMonth() - i);
        const year = getYear(date);
        const month = getMonth(date);
        
        const total = monthCounts[year]?.[month] || 0;
        monthlyData.push({
            name: format(date, 'MMM yy'),
            total: total,
        });
    }

    return { upcomingCount, pastCount, thisMonthCount, monthlyData };
  }, [events]);

  if (loading) {
    return (
       <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32"/>)}
        </div>
        <div className="mt-8">
            <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCount}</div>
            <p className="text-xs text-muted-foreground">Events that are yet to happen.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Events</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastCount}</div>
            <p className="text-xs text-muted-foreground">Events that have already occurred.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events This Month</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonthCount}</div>
             <p className="text-xs text-muted-foreground">Total events in {format(new Date(), 'MMMM')}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-xs text-muted-foreground">All events created historically.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
            <CardHeader>
                <CardTitle>Events Overview</CardTitle>
                <p className="text-sm text-muted-foreground">
                    Number of events scheduled per month for the last 12 months.
                </p>
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
    </div>
  );
}
