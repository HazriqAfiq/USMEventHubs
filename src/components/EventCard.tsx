
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
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
import { GlowEffect } from './GlowEffect';

interface EventCardProps {
  event: Event;
}

const toMalaysiaTime = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');

  const malaysianDate = toMalaysiaTime(new Date());
  malaysianDate.setHours(parseInt(hours, 10));
  malaysianDate.setMinutes(parseInt(minutes, 10));

  return format(malaysianDate, 'p');
};


export default function EventCard({ event }: EventCardProps) {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (user && event.id) {
      const registrationRef = doc(db, 'events', event.id, 'registrations', user.uid);
      const unsubscribe = onSnapshot(registrationRef, (doc) => {
        setIsRegistered(doc.exists());
      }, (error) => {
        setIsRegistered(false);
      });
      return () => unsubscribe();
    } else {
      setIsRegistered(false);
    }
  }, [user, event.id]);

  const handleCardClick = () => {
    setIsFlipped(true);
    setTimeout(() => {
      router.push(`/event/${event.id}`);
    }, 300); // Wait for flip animation to partially complete
  };

  return (
    <div className="perspective cursor-pointer" onClick={handleCardClick}>
        <GlowEffect hover intensity="medium" className="h-full">
            <div className={cn("relative w-full min-h-[520px] transition-transform duration-500", isFlipped ? '[transform:rotateY(180deg)]' : '')} style={{ transformStyle: 'preserve-3d' }}>
                {/* Front Face */}
                <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
                    <Card className={cn("flex flex-col overflow-hidden h-full w-full", isRegistered && "border-accent ring-2 ring-accent")}>
                        <div className="relative aspect-[16/9] w-full">
                            <Image src={event.imageUrl} alt={event.title} fill style={{ objectFit: 'cover' }} />
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
                            ) : (
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
                            <span>{event.date ? format(toMalaysiaTime(event.date.toDate()), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
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
                        <CardContent className="flex-grow">
                            <p className="text-sm text-muted-foreground line-clamp-3">{event.description}</p>
                        </CardContent>
                        <CardFooter>
                            <span className="text-sm font-semibold text-primary">Read More</span>
                        </CardFooter>
                    </Card>
                </div>

                {/* Back Face */}
                <div className="absolute inset-0 w-full h-full [transform:rotateY(180deg)] [backface-visibility:hidden] bg-card rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                        src="/images/usmcircle.jpg"
                        alt="USM Background"
                        fill
                        style={{ objectFit: 'cover' }}
                        className="opacity-40"
                    />
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            </div>
        </GlowEffect>
    </div>
  );
}
