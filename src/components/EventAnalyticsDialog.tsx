

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Users } from 'lucide-react';
import type { Registration, UserProfile } from '@/types';
import { Button } from './ui/button';

interface EventAnalyticsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
}

type CampusDistribution = {
  name: string;
  value: number;
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, payload }: any) => {
  if (percent < 0.05) return null; // Don't render label if slice is too small
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-semibold">
      {`${payload.value} (${(percent * 100).toFixed(0)}%)`}
    </text>
  );
};


export default function EventAnalyticsDialog({ isOpen, onClose, eventId, eventName }: EventAnalyticsDialogProps) {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userProfiles, setUserProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !eventId) {
      return;
    }
    setLoading(true);

    const fetchAnalyticsData = async () => {
      try {
        // 1. Fetch all registrations for the event
        const regsRef = collection(db, 'events', eventId, 'registrations');
        const regsSnapshot = await getDocs(regsRef);
        const fetchedRegistrations = regsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Registration));
        setRegistrations(fetchedRegistrations);

        // 2. Fetch user profiles for all registered users
        const userIds = fetchedRegistrations.map(reg => reg.id);
        if (userIds.length > 0) {
            const usersRef = collection(db, 'users');
            const userQuery = query(usersRef, where('__name__', 'in', userIds));
            const usersSnapshot = await getDocs(userQuery);
            const fetchedProfiles = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
            setUserProfiles(fetchedProfiles);
        } else {
            setUserProfiles([]);
        }

      } catch (error) {
        console.error("Error fetching event analytics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, [isOpen, eventId]);

  const campusDistribution: CampusDistribution[] = useMemo(() => {
    if (userProfiles.length === 0) return [];
    
    const counts: { [key: string]: number } = {};
    userProfiles.forEach(profile => {
      const campus = profile.campus || 'N/A';
      counts[campus] = (counts[campus] || 0) + 1;
    });

    return Object.entries(counts).map(([name, value]) => ({ name, value }));

  }, [userProfiles]);

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Analytics for: {eventName}</DialogTitle>
          <DialogDescription>
            An overview of the participants for this event.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
            <div className="space-y-6 py-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
        ) : (
        <div className="space-y-6 py-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Participants</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{registrations.length}</div>
                <p className="text-xs text-muted-foreground">
                    Total number of registered users for this event.
                </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
                <CardTitle>Participant Campus Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {campusDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                    <Pie
                        data={campusDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={110}
                        dataKey="value"
                        nameKey="name"
                    >
                        {campusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Legend />
                    <Tooltip contentStyle={{background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)"}}/>
                    </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-10">No participant data to display.</p>
              )}
            </CardContent>
          </Card>
        </div>
        )}
        <DialogFooter>
            <Button onClick={onClose} variant="outline">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
