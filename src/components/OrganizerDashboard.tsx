
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, getMonth, getYear, startOfToday, isAfter, isBefore, startOfMonth, endOfMonth, isWithinInterval, parse, startOfYear, endOfYear, isSameYear } from 'date-fns';
import { CalendarCheck, CalendarClock, CalendarX, Package, Calendar as CalendarIcon } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonthlyEventCount = {
  name: string;
  total: number;
};

interface OrganizerDashboardProps {
  onMonthClick: (date: Date | null) => void;
}


export default function OrganizerDashboard({ onMonthClick }: OrganizerDashboardProps) {
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
  
  const getEventEndTime = (event: Event): Date | null => {
    if (event.date && event.endTime) {
        const eventEndDate = event.date.toDate();
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }

  const {
    eventsInYearCount,
    upcomingInYearCount,
    pastInYearCount,
    totalEventsCount,
    monthlyData,
    availableYears,
  } = useMemo(() => {
    const now = new Date();
    
    // Base list of approved events by the organizer
    const approvedEvents = events.filter(e => e.status === 'approved');
    
    // Filter events by selected year
    const eventsInSelectedYear = approvedEvents.filter(event => 
        event.date && isSameYear(event.date.toDate(), new Date(selectedYear, 0, 1))
    );

    const eventsInYearCount = eventsInSelectedYear.length;
    let upcomingInYearCount = 0;
    let pastInYearCount = 0;

    eventsInSelectedYear.forEach(event => {
      const eventEndDate = getEventEndTime(event);
      if (eventEndDate) {
        if (eventEndDate >= now) {
            upcomingInYearCount++;
        } else {
            pastInYearCount++;
        }
      }
    });
    
    const yearSet = new Set<number>();
    approvedEvents.forEach(event => {
        if (event.date) {
            yearSet.add(getYear(event.date.toDate()));
        }
    });

    const monthCounts: number[] = Array(12).fill(0);
    eventsInSelectedYear.forEach(event => {
        if (event.date) {
            const month = getMonth(event.date.toDate());
            monthCounts[month]++;
        }
    });

    const monthlyData: MonthlyEventCount[] = monthCounts.map((total, monthIndex) => {
      const date = new Date(selectedYear, monthIndex);
      return {
        name: format(date, 'MMM'),
        total: total,
      };
    });

    const availableYears = Array.from(yearSet).sort((a,b) => b - a);
    if (availableYears.length === 0 || !yearSet.has(new Date().getFullYear())) {
        if (!availableYears.includes(new Date().getFullYear())) {
            availableYears.push(new Date().getFullYear());
            availableYears.sort((a,b) => b - a);
        }
    }

    return { 
        eventsInYearCount,
        upcomingInYearCount,
        pastInYearCount,
        totalEventsCount: approvedEvents.length,
        monthlyData, 
        availableYears 
    };
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
            <CardTitle className="text-sm font-medium">Approved Events in {selectedYear}</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{eventsInYearCount}</div>
            <p className="text-xs text-muted-foreground">Approved events scheduled for {selectedYear}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming in {selectedYear}</CardTitle>
            <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingInYearCount}</div>
            <p className="text-xs text-muted-foreground">Upcoming approved events in {selectedYear}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past in {selectedYear}</CardTitle>
            <CalendarX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pastInYearCount}</div>
             <p className="text-xs text-muted-foreground">Past approved events in {selectedYear}.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Approved Events</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEventsCount}</div>
            <p className="text-xs text-muted-foreground">All approved events you have ever created.</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <div>
                        <CardTitle>Approved Events Overview</CardTitle>
                        <p className="text-sm text-muted-foreground">
                            Number of approved events scheduled per month for {selectedYear}.
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
