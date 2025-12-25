
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getMonth, getYear, format, isSameYear } from 'date-fns';
import { Users, Calendar, ShieldCheck, FileClock, PieChartIcon, UserCheck } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import type { Event, UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter } from 'next/navigation';

type MonthlyCount = { name: string; events: number; };
type StatusCount = { name: string; value: number; };
type OrganizerEventCount = { organizerId: string; name: string; count: number; };

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
      {`${payload.value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { userProfile, loading: authLoading } = useAuth();
  const router = useRouter();

  const availableYears = useMemo(() => {
    const yearSet = new Set<number>();
    events.forEach(e => { if (e.date) yearSet.add(getYear(e.date.toDate())); });
    if (yearSet.size === 0) yearSet.add(getYear(new Date()));
    const sortedYears = Array.from(yearSet).sort((a,b) => b - a);
    if (!sortedYears.includes(new Date().getFullYear())) sortedYears.unshift(new Date().getFullYear());
    return sortedYears;
  }, [events]);

  const [selectedYear, setSelectedYear] = useState<number>(availableYears[0]);

  useEffect(() => {
    if(availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }
  },[availableYears, selectedYear]);

  useEffect(() => {
    if (authLoading || !userProfile?.campus) {
      if (!authLoading) setLoading(false);
      return;
    }
    
    const campus = userProfile.campus;

    const eventsQuery = query(collection(db, 'events'), where('conductingCampus', '==', campus));
    const usersQuery = query(collection(db, 'users'), where('campus', '==', campus));

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event)));
    }, (error) => console.error("Error fetching campus events:", error));

    const unsubUsers = onSnapshot(usersQuery, (snapshot) => {
      setUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
    }, (error) => console.error("Error fetching campus users:", error));

    Promise.all([new Promise(res => setTimeout(res, 500))]).then(() => setLoading(false));

    return () => {
      unsubEvents();
      unsubUsers();
    };
  }, [userProfile, authLoading]);

  const dashboardData = useMemo(() => {
    const campusUsers = users.filter(u => u.role === 'student' || u.role === 'organizer');
    const campusOrganizers = campusUsers.filter(u => u.role === 'organizer');
    const campusStudents = campusUsers.filter(u => u.role === 'student');
    const approvedEventsInYear = events.filter(e => e.status === 'approved' && e.date && isSameYear(e.date.toDate(), new Date(selectedYear, 0, 1)));
    const pendingEvents = events.filter(e => ['pending', 'pending-update', 'pending-deletion'].includes(e.status));
    
    const roleData = [
      { name: 'Students', value: campusStudents.length },
      { name: 'Organizers', value: campusOrganizers.length },
    ];
    
    const organizerEventCounts: { [key: string]: number } = {};
    approvedEventsInYear.forEach(event => {
      if (event.organizerId) organizerEventCounts[event.organizerId] = (organizerEventCounts[event.organizerId] || 0) + 1;
    });
    const organizerEventData: OrganizerEventCount[] = Object.entries(organizerEventCounts).map(([id, count]) => {
      const organizerProfile = users.find(u => u.uid === id);
      return { organizerId: id, name: organizerProfile?.name || 'Unknown', count };
    }).sort((a,b) => b.count - a.count);

    const eventStatusCounts: { [key: string]: number } = {};
    events.forEach(event => { eventStatusCounts[event.status] = (eventStatusCounts[event.status] || 0) + 1; });
    const eventStatusData: StatusCount[] = Object.entries(eventStatusCounts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/-/g, ' '),
      value,
    }));
    
    const monthCounts = Array(12).fill(0);
    approvedEventsInYear.forEach(event => { if (event.date) monthCounts[getMonth(event.date.toDate())]++; });
    const monthlyEventData: MonthlyCount[] = monthCounts.map((count, index) => ({
      name: format(new Date(selectedYear, index), 'MMM'),
      events: count,
    }));

    return {
      totalUsers: campusUsers.length,
      totalOrganizers: campusOrganizers.length,
      approvedEventsCount: approvedEventsInYear.length,
      pendingRequestsCount: pendingEvents.length,
      roleData,
      organizerEventData,
      eventStatusData,
      monthlyEventData,
    };
  }, [events, users, selectedYear]);

  if (loading || authLoading) {
    return (
      <div className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32"/>)}
        </div>
        <div className="mt-8 grid md:grid-cols-2 gap-8">
          <Skeleton className="h-[350px] w-full" />
          <Skeleton className="h-[350px] w-full" />
        </div>
        <div className="mt-8"><Skeleton className="h-[350px] w-full" /></div>
      </div>
    );
  }

  const handleStatusPieClick = (data: any) => {
    const status = data.name.toLowerCase().replace(/ /g, '-');
    if (['pending', 'pending-update', 'pending-deletion'].includes(status)) {
      router.push(`/admin/approvals?status=${status}`);
    } else {
      router.push(`/admin/events?status=${status}`);
    }
  };
  
  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="mt-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Campus Users</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData.totalUsers}</div><p className="text-xs text-muted-foreground">Students & organizers in your campus.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Campus Organizers</CardTitle><ShieldCheck className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData.totalOrganizers}</div><p className="text-xs text-muted-foreground">Users with organizer roles in your campus.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Approved Events ({selectedYear})</CardTitle><Calendar className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData.approvedEventsCount}</div><p className="text-xs text-muted-foreground">Approved campus events for this year.</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Pending Requests</CardTitle><FileClock className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{dashboardData.pendingRequestsCount}</div><p className="text-xs text-muted-foreground">Events needing approval on your campus.</p></CardContent></Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mt-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChartIcon className="mr-2 h-5 w-5" />User Role Distribution
            </CardTitle>
            <p className="text-sm text-muted-foreground">Students vs. Organizers in your campus. Click to view users.</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie 
                  data={dashboardData.roleData} 
                  cx="50%" 
                  cy="50%" 
                  labelLine={false} 
                  label={renderCustomizedLabel} 
                  outerRadius={120} 
                  dataKey="value"
                  onClick={() => router.push('/admin/users')}
                  className="cursor-pointer"
                >
                  {dashboardData.roleData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip contentStyle={{background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5" />Event Status Distribution</CardTitle><p className="text-sm text-muted-foreground">Breakdown of all event statuses on your campus.</p></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><PieChart><Pie data={dashboardData.eventStatusData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={120} dataKey="value" nameKey="name" onClick={handleStatusPieClick} className="cursor-pointer">{dashboardData.eventStatusData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}</Pie><Legend /><Tooltip contentStyle={{background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} /></PieChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><div className="flex justify-between items-center"><div><CardTitle className="flex items-center"><UserCheck className="mr-2 h-5 w-5" />Approved Events per Organizer ({selectedYear})</CardTitle><p className="text-sm text-muted-foreground">Events created by organizers in your campus.</p></div>{availableYears.length > 0 && <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>}</div></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={dashboardData.organizerEventData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" stroke="#888888" fontSize={10} tickLine={false} axisLine={false} interval={0} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false}/><Tooltip contentStyle={{background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} /><Bar dataKey="count" name="Events" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
        <Card><CardHeader><div className="flex justify-between items-center"><div><CardTitle>Campus-Wide Approved Event Creation</CardTitle><p className="text-sm text-muted-foreground">Events created per month in your campus.</p></div>{availableYears.length > 0 && <Select value={String(selectedYear)} onValueChange={(val) => setSelectedYear(Number(val))}><SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{availableYears.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}</SelectContent></Select>}</div></CardHeader><CardContent><ResponsiveContainer width="100%" height={350}><BarChart data={dashboardData.monthlyEventData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} /><YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} /><Tooltip contentStyle={{background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}} /><Bar dataKey="events" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></CardContent></Card>
      </div>
    </div>
  );
}
