'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, getMonth, getYear, startOfToday, isAfter, isBefore, startOfMonth, endOfMonth, isWithinInterval, parse } from 'date-fns';
import { CalendarCheck, CalendarClock, CalendarX, Package } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonthlyEventCount = {
  name: string;
  total: number;
};

interface AdminDashboardProps {
  onMonthClick: (date: Date | null) => void;
}


export default function AdminDashboard({ onMonthClick }: AdminDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());


  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setLoading(false);
      return;
    }

    const eventsRef = collection(db, 'events');
    const q = query(eventsRef, where('organizerId', '==', user.uid));
    
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
  }, [user, authLoading]);

  const { upcomingCount, pastCount, thisMonthCount, monthlyData, availableYears } = useMemo(() => {
    const today = startOfToday();
    const currentMonthInterval = { start: startOfMonth(today), end: endOfMonth(today) };
    
    let upcomingCount = 0;
    let pastCount = 0;
    let thisMonthCount = 0;
    
    const yearSet = new Set<number>();
    
    const monthCounts: { [key: number]: number[] } = {}; // year -> month counts

    events.forEach(event => {
      if (!event.date) return;
      const eventDate = event.date.toDate();
      const eventYear = getYear(eventDate);
      yearSet.add(eventYear);

      if (isAfter(eventDate, today)) {
        upcomingCount++;
      } else if (isBefore(eventDate, today)) {
        pastCount++;
      }

      if (isWithinInterval(eventDate, currentMonthInterval)) {
          thisMonthCount++;
      }

      const month = getMonth(eventDate);
      if (!monthCounts[eventYear]) {
        monthCounts[eventYear] = Array(12).fill(0);
      }
      monthCounts[eventYear][month]++;
    });
    
    const currentYearData = monthCounts[selectedYear] || Array(12).fill(0);

    const monthlyData: MonthlyEventCount[] = currentYearData.map((total, monthIndex) => {
      const date = new Date(selectedYear, monthIndex);
      return {
        name: format(date, 'MMM'),
        total: total,
      };
    });

    const availableYears = Array.from(yearSet).sort((a,b) => b - a);
    if (availableYears.length === 0 || !yearSet.has(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
        availableYears.sort((a,b) => b - a);
    }

    return { upcomingCount, pastCount, thisMonthCount, monthlyData, availableYears };
  }, [events, selectedYear]);

  if (loading || authLoading) {
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

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const monthName = data.activePayload[0].payload.name;
      const clickedDate = parse(monthName, 'MMM', new Date(selectedYear, 0));
      onMonthClick(clickedDate);
    }
  };

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
            <p className="text-xs text-muted-foreground">All events you have created.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Events Overview</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Number of events you've scheduled per month for the year {selectedYear}.
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
                <BarChart data={monthlyData} onClick={handleBarClick}>
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
                    <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
