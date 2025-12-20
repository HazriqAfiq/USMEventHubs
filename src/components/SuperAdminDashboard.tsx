
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getMonth, getYear, format, isSameYear } from 'date-fns';
import { Users, Calendar, BarChart2, ShieldCheck, Building, PieChartIcon, UserCheck } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';

type MonthlyCount = {
  name: string;
  events: number;
};

type CampusCount = {
  name: string;
  count: number;
};

type OrganizerEventCount = {
    organizerId: string;
    name: string;
    count: number;
}

interface SuperAdminDashboardProps {
  onCampusClick: (campus: string | null) => void;
  onOrganizerClick: (organizer: {id: string, name: string} | null) => void;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't render label if slice is too small

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
      {`${payload.value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


export default function SuperAdminDashboard({ onCampusClick, onOrganizerClick }: SuperAdminDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isSuperAdmin, loading: authLoading } = useAuth();
  const [userDistributionFilter, setUserDistributionFilter] = useState<'all' | 'student' | 'organizer'>('all');
  
  const availableYears = useMemo(() => {
    if (events.length === 0) {
      return [getYear(new Date())];
    }
    const yearSet = new Set(events.map(e => e.date ? getYear(e.date.toDate()) : null).filter(Boolean));
    if (yearSet.size === 0) {
      return [getYear(new Date())];
    }
    const sortedYears = Array.from(yearSet).sort((a,b) => b - a);
    if (!sortedYears.includes(new Date().getFullYear())) {
        sortedYears.unshift(new Date().getFullYear());
    }
    return sortedYears;
  }, [events]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

  useEffect(() => {
    if(availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  },[availableYears, selectedYear]);

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
    roleData,
    campusEventData,
    organizerEventData
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
    
    const communityUsers = users.filter(u => u.role !== 'superadmin');
    const organizerCount = communityUsers.filter(u => u.role === 'organizer').length;
    const studentCount = communityUsers.filter(u => u.role === 'student').length;

    const roleData = [
        { name: 'Students', value: studentCount },
        { name: 'Organizers', value: organizerCount },
    ];

    const filteredUsersForCampusChart = communityUsers.filter(u => {
        if (userDistributionFilter === 'all') return true;
        return u.role === userDistributionFilter;
    });

    const userCampusCounts: { [key: string]: number } = {};
    filteredUsersForCampusChart.forEach(u => {
        if (u.campus) {
            userCampusCounts[u.campus] = (userCampusCounts[u.campus] || 0) + 1;
        } else {
            userCampusCounts['N/A'] = (userCampusCounts['N/A'] || 0) + 1;
        }
    });

    const campusUserData: CampusCount[] = Object.entries(userCampusCounts).map(([name, count]) => ({
        name,
        count: count,
    })).sort((a,b) => b.count - a.count);
    
    const eventCampusCounts: { [key: string]: number } = {};
    eventsInSelectedYear.forEach(event => {
        if (event.conductingCampus) {
            eventCampusCounts[event.conductingCampus] = (eventCampusCounts[event.conductingCampus] || 0) + 1;
        } else {
            eventCampusCounts['N/A'] = (eventCampusCounts['N/A'] || 0) + 1;
        }
    });
    const campusEventData: CampusCount[] = Object.entries(eventCampusCounts).map(([name, count]) => ({
        name,
        count: count,
    })).sort((a, b) => b.count - a.count);

    const organizerEventCounts: { [key: string]: number } = {};
     eventsInSelectedYear.forEach(event => {
        if (event.organizerId) {
            organizerEventCounts[event.organizerId] = (organizerEventCounts[event.organizerId] || 0) + 1;
        }
    });
    const organizerEventData: OrganizerEventCount[] = Object.entries(organizerEventCounts).map(([id, count]) => {
        const organizerProfile = users.find(u => u.uid === id);
        return {
            organizerId: id,
            name: organizerProfile?.name || 'Unknown',
            count,
        }
    }).sort((a,b) => b.count - a.count);


    return {
      totalEventsInYear: eventsInSelectedYear.length,
      totalUsers: communityUsers.length,
      totalOrganizers: organizerCount,
      monthlyEventData,
      campusUserData,
      roleData,
      campusEventData,
      organizerEventData
    };
  }, [events, users, selectedYear, userDistributionFilter]);

  if (loading || authLoading) {
    return (
      <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32"/>)}
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[350px] w-full" />
        </div>
         <div className="mt-8">
          <Skeleton className="h-[350px] w-full" />
        </div>
      </div>
    );
  }

  const handleBarClick = (data: any, type: 'campus' | 'organizer') => {
    if (data && data.activePayload && data.activePayload[0]) {
      const payload = data.activePayload[0].payload;
      if (type === 'campus') {
        onCampusClick(payload.name);
      } else if (type === 'organizer') {
        onOrganizerClick({ id: payload.organizerId, name: payload.name });
      }
    }
  };
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];


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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  User Distribution by Campus
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a bar to filter the user table below.
                </p>
              </div>
              <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={userDistributionFilter}
                  onValueChange={(value) => {
                      if (value) setUserDistributionFilter(value as any);
                  }}
                  aria-label="Filter user distribution"
                >
                  <ToggleGroupItem value="all" aria-label="All users">All</ToggleGroupItem>
                  <ToggleGroupItem value="student" aria-label="Students">Students</ToggleGroupItem>
                  <ToggleGroupItem value="organizer" aria-label="Organizers">Organizers</ToggleGroupItem>
                </ToggleGroup>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
               <BarChart data={campusUserData} onClick={(data) => handleBarClick(data, 'campus')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" name="Campus" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                 <Tooltip 
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" name="Users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle className="flex items-center">
                    <PieChartIcon className="mr-2 h-5 w-5" />
                    User Role Distribution
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                    Breakdown of students and organizers.
                </p>
            </CardHeader>
            <CardContent>
                 <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Pie
                            data={roleData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={120}
                            fill="#8884d8"
                            dataKey="value"
                        >
                            {roleData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Legend />
                        <Tooltip
                             contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
         </Card>
        <Card>
           <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <Building className="mr-2 h-5 w-5" />
                  Event Distribution by Campus ({selectedYear})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Events conducted by each campus.
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
               <BarChart data={campusEventData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" name="Campus" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                 <Tooltip 
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" name="Events" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
         <Card>
           <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center">
                  <UserCheck className="mr-2 h-5 w-5" />
                  Events per Organizer ({selectedYear})
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Click a bar to filter the event list below.
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
               <BarChart data={organizerEventData} onClick={(data) => handleBarClick(data, 'organizer')}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" name="Organizer" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} />
                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/>
                 <Tooltip 
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Bar dataKey="count" name="Events" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} className="cursor-pointer" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8">
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
                    <Bar dataKey="events" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
      </div>
    </div>
  );
}



