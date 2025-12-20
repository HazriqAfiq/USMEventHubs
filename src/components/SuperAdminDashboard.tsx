
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getMonth, getYear, format, isSameYear } from 'date-fns';
import { Users, Calendar, BarChart2, ShieldCheck, Building } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type MonthlyCount = {
  name: string;
  events: number;
};

type CampusCount = {
  name: string;
  users: number;
};

interface SuperAdminDashboardProps {
  onCampusClick: (campus: string | null) => void;
}

export default function SuperAdminDashboard({ onCampusClick }: SuperAdminDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const availableYears = useMemo(() => {
    if (events.length === 0) {
      return [new Date().getFullYear()];
    }
    const yearSet = new Set<number>();
    events.forEach(event => {
      if (event.date) {
        yearSet.add(getYear(event.date.toDate()));
      }
    });
    
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [events]);

  useEffect(() => {
    if (availableYears.length > 0) {
      setSelectedYear(availableYears[0]);
    }
  }, [availableYears]);

  useEffect(() => {
    if (authLoading || !isSuperAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }

    const eventsQuery = query(collection(db, 'events'));
    const usersQuery = query(collection(db, 'users'));

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
    }, (error) => console.error("Error fetching events:", error));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(usersData);
    }, (error) => console.error("Error fetching users:", error));

    Promise.all([new Promise(res => setTimeout(res, 500))]).then(() => setLoading(false));

    return () => {
      unsubEvents();
      unsubUsers();
    };
  }, [user, isSuperAdmin, authLoading]);

  const {
    totalEventsInYear,
    totalUsers,
    totalOrganizers,
    monthlyEventData,
    campusUserData,
  } = useMemo(() => {
    const eventsInSelectedYear = events.filter(event => 
        event.date && isSameYear(event.date.toDate(), new Date(selectedYear, 0, 1))
    );

    const monthCounts = Array(12).fill(0);
    eventsInSelectedYear.forEach(event => {
      if (event.date) {
        monthCounts[getMonth(event.date.toDate())]++;
      }
    });

    const monthlyEventData: MonthlyCount[] = monthCounts.map((count, index) => ({
      name: format(new Date(selectedYear, index), 'MMM'),
      events: count,
    }));
    
    const organizerCount = users.filter(u => u.role === 'organizer').length;

    const campusCounts: { [key: string]: number } = {};
    users.forEach(u => {
        if (u.campus) {
            campusCounts[u.campus] = (campusCounts[u.campus] || 0) + 1;
        } else {
            campusCounts['N/A'] = (campusCounts['N/A'] || 0) + 1;
        }
    });
    const campusUserData: CampusCount[] = Object.entries(campusCounts).map(([name, count]) => ({
        name,
        users: count,
    })).sort((a,b) => b.users - a.users);

    return {
      totalEventsInYear: eventsInSelectedYear.length,
      totalUsers: users.length,
      totalOrganizers: organizerCount,
      monthlyEventData,
      campusUserData,
    };
  }, [events, users, selectedYear]);

  if (loading || authLoading) {
    return (
      <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32"/>)}
        </div>
        <div className="mt-8">
          <Skeleton className="h-[350px] w-full" />
        </div>
         <div className="mt-8">
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    );
  }

  const handleBarClick = (data: any, type: 'campus' | 'event') => {
    if (data && data.activePayload && data.activePayload[0]) {
      if (type === 'campus') {
        const campusName = data.activePayload[0].payload.name;
        onCampusClick(campusName);
      }
    }
  };


  return (
    <div className="mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">All registered students and organizers.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Organizers</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrganizers}</div>
            <p className="text-xs text-muted-foreground">Number of users with organizer roles.</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Events in {selectedYear}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEventsInYear}</div>
            <p className="text-xs text-muted-foreground">Total events created this year.</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid md:grid-cols-2 gap-8 mt-8">
        <Card>
           <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  User Distribution by Campus
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a bar to filter the user table below.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
               <BarChart data={campusUserData} onClick={(data) => handleBarClick(data, 'campus')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                 <Tooltip 
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <BarChart2 className="mr-2 h-5 w-5" />
                  Platform-Wide Event Creation
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total events created per month.
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
              <BarChart data={monthlyEventData}>
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
                <Bar dataKey="events" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
