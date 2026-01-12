
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collectionGroup, onSnapshot, query, where, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import Image from 'next/image';
import { format, getMonth, getYear, startOfToday, isWithinInterval, startOfMonth, endOfMonth, parse, isAfter, isBefore, isSameYear } from 'date-fns';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import type { Event } from '@/types';
import Link from 'next/link';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CalendarCheck, CalendarX, Eye, MessageSquare, Package, XCircle, FilePenLine, Building } from 'lucide-react';
import { Button } from './ui/button';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ChatDialog from './ChatDialog';
import StudentEventViewDialog from './StudentEventViewDialog';

interface UserEventListProps {
  userId: string;
}

type MonthlyEventCount = {
  name: string;
  total: number;
};

const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"] as const;


export default function UserEventList({ userId }: UserEventListProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortOption, setSortOption] = useState('date-desc');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [chartMonthFilter, setChartMonthFilter] = useState<Date | null>(null);
  const [selectedEventForChat, setSelectedEventForChat] = useState<Event | null>(null);
  const [campusCountFilter, setCampusCountFilter] = useState<string>(campuses[0]);
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);

  useEffect(() => {
    if (!userId) {
        setLoading(false);
        return;
    }
    setLoading(true);

    // Query the 'registrations' collection group to find all registrations for the current user.
    const registrationsQuery = query(
        collectionGroup(db, 'registrations'),
        where('id', '==', userId)
    );

    const unsubscribe = onSnapshot(registrationsQuery, async (snapshot) => {
        if (snapshot.empty) {
            setEvents([]);
            setLoading(false);
            return;
        }
        
        const eventPromises = snapshot.docs.map(regDoc => {
            const parentEventRef = regDoc.ref.parent.parent;
            if (!parentEventRef) return Promise.resolve(null);
            return getDoc(parentEventRef);
        });

        const eventDocs = await Promise.all(eventPromises);
        
        const registeredEvents = eventDocs
            .filter(doc => doc && doc.exists() && doc.data().status === 'approved')
            .map(doc => ({ id: doc!.id, ...doc!.data() } as Event));
        
        setEvents(registeredEvents);
        setLoading(false);

    }, (error) => {
        console.error("Error fetching registered events:", error);
        const permissionError = new FirestorePermissionError({
            path: `registrations collection group for user ${userId}`, 
            operation: 'list',
        }, error);
        errorEmitter.emit('permission-error', permissionError);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);


  const getEventEndTime = (event: Event): Date | null => {
    if (event.date && event.endTime) {
        const eventEndDate = event.date.toDate();
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        eventEndDate.setHours(endHours, endMinutes, 0, 0);
        return eventEndDate;
    }
    return null;
  }
  
  const handleViewClick = (event: Event) => {
    setSelectedEventForView(event);
  };


  const { 
    filteredEvents, 
    upcomingCount, 
    pastCount, 
    totalEventsCount, 
    monthlyData, 
    availableYears, 
    availableMonths,
    campusEventCount,
  } = useMemo(() => {
    const now = new Date();
    
    let baseFiltered = events;
    
    if (timeFilter === 'all') {
      // No year filter when 'all' is selected
    } else {
      baseFiltered = baseFiltered.filter(e => e.date && isSameYear(e.date.toDate(), new Date(selectedYear, 0, 1)));
    }
    
    if (timeFilter === 'upcoming') {
        baseFiltered = baseFiltered.filter(event => {
            const eventEndDate = getEventEndTime(event);
            return eventEndDate ? eventEndDate >= now : false;
        });
    } else if (timeFilter === 'past') {
        baseFiltered = baseFiltered.filter(event => {
            const eventEndDate = getEventEndTime(event);
            return eventEndDate ? eventEndDate < now : true;
        });
    }

    if (campusFilter !== 'all') {
      baseFiltered = baseFiltered.filter(event => event.conductingCampus === campusFilter);
    }

    const yearForStats = selectedYear;
    const eventsInYearForStats = events.filter(e => e.date && isSameYear(e.date.toDate(), new Date(yearForStats, 0, 1)));
    let upcomingInYear = 0;
    let pastInYear = 0;
    eventsInYearForStats.forEach(event => {
        const eventEndDate = getEventEndTime(event);
        if(eventEndDate) {
            if (eventEndDate >= now) upcomingInYear++;
            else pastInYear++;
        }
    });

    const campusEventCount = events.filter(e => e.conductingCampus === campusCountFilter).length;


    if (chartMonthFilter) {
      const interval = { start: startOfMonth(chartMonthFilter), end: endOfMonth(chartMonthFilter) };
      baseFiltered = baseFiltered.filter(event => event.date && isWithinInterval(event.date.toDate(), interval));
    } else if (monthFilter !== 'all') {
      const selectedMonthDate = new Date(monthFilter);
      baseFiltered = baseFiltered.filter(event => {
        if (!event.date) return false;
        const eventDate = event.date.toDate();
        return getMonth(eventDate) === getMonth(selectedMonthDate) && getYear(eventDate) === getYear(selectedMonthDate);
      });
    }

    baseFiltered.sort((a, b) => {
      switch (sortOption) {
        case 'date-asc':
          return a.date.toDate().getTime() - b.date.toDate().getTime();
        case 'date-desc':
        default:
          return b.date.toDate().getTime() - a.date.toDate().getTime();
      }
    });

    const yearSet = new Set<number>();
    const monthSet = new Set<string>();
    
    events.forEach(event => {
      if (!event.date) return;
      const eventDate = event.date.toDate();
      yearSet.add(getYear(eventDate));
      monthSet.add(format(eventDate, 'yyyy-MM'));
    });

    const yearForChart = selectedYear;
    const monthCounts = Array(12).fill(0);
    events.forEach(event => {
        if(event.date && isSameYear(event.date.toDate(), new Date(yearForChart, 0, 1))) {
            const month = getMonth(event.date.toDate());
            monthCounts[month]++;
        }
    });

    const monthlyData: MonthlyEventCount[] = monthCounts.map((total, monthIndex) => ({
      name: format(new Date(yearForChart, monthIndex), 'MMM'),
      total: total,
    }));

    const availableYears = Array.from(yearSet).sort((a, b) => b - a);
    if (availableYears.length === 0 || !yearSet.has(new Date().getFullYear())) {
      if (!availableYears.includes(new Date().getFullYear())) {
        availableYears.push(new Date().getFullYear());
        availableYears.sort((a, b) => b - a);
      }
    }
    
    const allMonths = Array.from(new Set(events.map(e => format(e.date.toDate(), 'yyyy-MM'))))
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return {
      filteredEvents: baseFiltered,
      upcomingCount: upcomingInYear,
      pastCount: pastInYear,
      totalEventsCount: events.length,
      monthlyData,
      availableYears,
      availableMonths: allMonths,
      campusEventCount,
    };
  }, [events, timeFilter, monthFilter, sortOption, selectedYear, chartMonthFilter, campusCountFilter, campusFilter]);

  if (loading) {
    return (
      <div className="mt-6 space-y-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28"/>)}
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

  const handleBarClick = (data: any) => {
    if (data && data.activePayload && data.activePayload[0]) {
      const yearForChart = selectedYear;
      const monthName = data.activePayload[0].payload.name;
      const clickedDate = parse(monthName, 'MMM', new Date(yearForChart, 0));
      setChartMonthFilter(clickedDate);
      setTimeFilter('all');
      setMonthFilter('all');
    }
  };
  
  const isEventUpcoming = (event: Event) => {
    const eventEndDate = getEventEndTime(event);
    return eventEndDate ? eventEndDate >= new Date() : false;
  }
  
  const handleTimeFilterChange = (value: 'all' | 'upcoming' | 'past') => {
    setTimeFilter(value);
    setChartMonthFilter(null);
  };
  
  const handleMonthFilterChange = (value: string) => {
    setMonthFilter(value);
    setChartMonthFilter(null);
  };
  
  const handleYearChange = (value: string) => {
      setSelectedYear(Number(value));
  }
  
  const getYearForStats = () => {
    if (timeFilter === 'all') return 'All Time';
    return selectedYear;
  }

  return (
    <>
    <div className="mt-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Upcoming in {getYearForStats()}</CardTitle>
                    <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{upcomingCount}</div>
                    <p className="text-xs text-muted-foreground">Upcoming events you're registered for in {getYearForStats()}.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Past in {getYearForStats()}</CardTitle>
                    <CalendarX className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{pastCount}</div>
                    <p className="text-xs text-muted-foreground">Past events you were registered for in {getYearForStats()}.</p>
                </CardContent>
            </Card>
             <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events Joined</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEventsCount}</div>
                <p className="text-xs text-muted-foreground">All events you have ever registered for.</p>
              </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Events by Campus</CardTitle>
                    <Building className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-2xl font-bold">{campusEventCount}</div>
                      <Select value={campusCountFilter} onValueChange={setCampusCountFilter}>
                        <SelectTrigger className="w-[150px] text-xs">
                          <SelectValue placeholder="Select Campus"/>
                        </SelectTrigger>
                        <SelectContent>
                           {campuses.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">Events joined from {campusCountFilter}.</p>
                </CardContent>
            </Card>
        </div>

        <div className="mt-8">
            <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>My Participation ({getYearForStats()})</CardTitle>
                      <p className="text-sm text-muted-foreground">
                          Number of events you've joined per month for {getYearForStats()}.
                      </p>
                    </div>
                     {availableYears.length > 0 && (
                        <Select value={String(selectedYear)} onValueChange={handleYearChange}>
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

      <div className='mt-8 space-y-4'>
        {chartMonthFilter ? (
            <div className='flex justify-between items-center'>
              <h3 className="text-xl font-bold text-white">Events in {format(chartMonthFilter, 'MMMM yyyy')}</h3>
              <Button variant="ghost" onClick={() => setChartMonthFilter(null)}>
                <XCircle className="mr-2 h-4 w-4" />
                Clear Filter
              </Button>
            </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center p-4 border rounded-lg bg-card/80 backdrop-blur-sm">
              <ToggleGroup
                  type="single"
                  variant="outline"
                  value={timeFilter}
                  onValueChange={(value) => {
                      if (value) handleTimeFilterChange(value as any);
                  }}
                  >
                  <ToggleGroupItem value="all">All</ToggleGroupItem>
                  <ToggleGroupItem value="upcoming">Upcoming</ToggleGroupItem>
                  <ToggleGroupItem value="past">Past</ToggleGroupItem>
              </ToggleGroup>

              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                 {availableMonths.length > 0 && (
                  <Select value={monthFilter} onValueChange={handleMonthFilterChange}>
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
                 <Select value={campusFilter} onValueChange={setCampusFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Campuses</SelectItem>
                      {campuses.map(campus => <SelectItem key={campus} value={campus}>{campus}</SelectItem>)}
                    </SelectContent>
                  </Select>
                 <Select value={sortOption} onValueChange={setSortOption}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest First</SelectItem>
                      <SelectItem value="date-asc">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
              </div>
          </div>
        )}

        {filteredEvents.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground">
              No registered events found for the selected criteria.
            </Card>
        ) : (
            <div className="space-y-4">
            {filteredEvents.map((event) => (
            <Card key={event.id} className="p-4 flex items-center gap-4">
              <div className="relative h-16 w-24 rounded-md overflow-hidden flex-shrink-0 bg-muted">
                  <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
              </div>
              <div className="flex-grow overflow-hidden">
                  <h3 className="font-bold truncate">{event.title}</h3>
                  <p className="text-sm text-muted-foreground">{event.date ? format(event.date.toDate(), 'PPP') : 'No date'}</p>
                  <p className="text-sm text-muted-foreground">{event.location}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Button variant="outline" size="icon" onClick={() => handleViewClick(event)}>
                    <Eye className="h-4 w-4" />
                </Button>
                {isEventUpcoming(event) && (
                    <Button variant="outline" size="icon" onClick={() => setSelectedEventForChat(event)}>
                        <MessageSquare className="h-4 w-4" />
                    </Button>
                )}
            </div>
            </Card>
            ))}
            </div>
        )}
      </div>
    </div>
    
    <ChatDialog 
      isOpen={!!selectedEventForChat}
      onClose={() => setSelectedEventForChat(null)}
      event={selectedEventForChat}
    />
     {selectedEventForView && (
        <StudentEventViewDialog
            event={selectedEventForView}
            isOpen={!!selectedEventForView}
            onClose={() => setSelectedEventForView(null)}
        />
    )}
    </>
  );
}

