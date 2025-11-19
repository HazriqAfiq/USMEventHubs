'use client';

import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, Laptop, MapPin, Users, Clock, UserCheck } from 'lucide-react';
import type { Event } from '@/types';
import { Badge } from './ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EventCardProps {
  event: Event;
}

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  return format(date, 'p');
};


export default function EventCard({ event }: EventCardProps) {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    if (user && event.id) {
      const registrationRef = doc(db, 'events', event.id, 'registrations', user.uid);
      const unsubscribe = onSnapshot(registrationRef, (doc) => {
        setIsRegistered(doc.exists());
      }, (error) => {
        // This will likely be a permission error if rules are not set correctly
        // for non-admins. We can safely ignore it and assume not registered.
        setIsRegistered(false);
      });
      return () => unsubscribe();
    }
  }, [user, event.id]);

  return (
     <Link href={`/event/${event.id}`} className="flex">
      <Card className={cn(
        "flex flex-col overflow-hidden h-full transition-all hover:shadow-xl hover:-translate-y-1 w-full",
        isRegistered && "border-accent ring-2 ring-accent"
      )}>
        <div className="relative aspect-video w-full">
          <Image src={event.imageUrl} alt={event.title} fill style={{objectFit: 'cover'}} />
          <div className="absolute top-2 right-2 flex gap-2">
             {isRegistered && (
              <Badge variant="secondary" className="text-sm bg-accent/90 text-accent-foreground">
                <UserCheck className="h-3 w-3 mr-1.5" />
                Registered
              </Badge>
            )}
             {event.isFree ? (
                <Badge variant="secondary" className="text-sm">Free</Badge>
              ) : event.price ? (
                <Badge variant="secondary" className="text-sm">RM{event.price.toFixed(2)}</Badge>
              ): (
                <Badge variant="secondary" className="text-sm">Paid</Badge>
              )}
             <Badge variant="outline" className="text-sm bg-background/80 backdrop-blur-sm capitalize">
              {event.eventType === 'online' ? (
                <Laptop className="h-3 w-3 mr-1.5" />
              ) : (
                <Users className="h-3 w-3 mr-1.5" />
              )}
              {event.eventType}
            </Badge>
          </div>
        </div>
        <CardHeader>
          <CardTitle className="font-headline text-xl">{event.title}</CardTitle>
          <CardDescription className="flex items-center pt-1 text-sm">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{event.date ? format(event.date.toDate(), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
          </CardDescription>
           <CardDescription className="flex items-center pt-1 text-sm">
            <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
          </CardDescription>
           <CardDescription className="flex items-center pt-1 text-sm">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{event.location}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow flex flex-col">
          <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">{event.description}</p>
        </CardContent>
        <CardFooter>
            <span className="text-sm font-semibold text-primary">Read More</span>
        </CardFooter>
      </Card>
    </Link>
  );
}
