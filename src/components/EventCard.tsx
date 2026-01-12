
'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Calendar,
  Laptop,
  MapPin,
  Users,
  Clock,
  UserCheck,
  Eye,
} from 'lucide-react';
import type { Event } from '@/types';
import { Badge } from './ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useEffect, useState, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { GlowEffect } from './GlowEffect';

interface EventCardProps {
  event: Event;
}

const toMalaysiaTime = (date: Date) => {
  return new Date(
    date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })
  );
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');

  const malaysianDate = toMalaysiaTime(new Date());
  malaysianDate.setHours(parseInt(hours, 10));
  malaysianDate.setMinutes(parseInt(minutes, 10));

  return format(malaysianDate, 'p');
};

const formatDateRange = (start: Date, end: Date | undefined) => {
  const startDate = toMalaysiaTime(start);
  
  if (end) {
    const endDate = toMalaysiaTime(end);
    if (format(startDate, 'yyyy-MM-dd') === format(endDate, 'yyyy-MM-dd')) {
      // Single-day event
      return format(startDate, 'EEEE, MMM d, yyyy');
    }
    // Multi-day event
    return `${format(startDate, 'EEE, MMM d')} - ${format(endDate, 'EEE, MMM d, yyyy')}`;
  }
  // No end date, treat as single day
  return format(startDate, 'EEEE, MMM d, yyyy');
};

const truncateWords = (text: string, limit: number) => {
  if (!text) return '';
  const words = text.split(' ');
  if (words.length > limit) {
    return words.slice(0, limit).join(' ') + '...';
  }
  return text;
};

export default function EventCard({ event }: EventCardProps) {
  const { user } = useAuth();
  const [isRegistered, setIsRegistered] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const router = useRouter();

  const [isHovering, setIsHovering] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    if ((isHovering || isInView) && event.videoUrl) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  }, [isHovering, isInView, event.videoUrl]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.5 }
    );

    if (cardRef.current) observer.observe(cardRef.current);

    return () => {
      if (cardRef.current) observer.unobserve(cardRef.current);
    };
  }, []);

  useEffect(() => {
    if (user && event.id) {
      const registrationRef = doc(
        db,
        'events',
        event.id,
        'registrations',
        user.uid
      );
      const unsubscribe = onSnapshot(registrationRef, (doc) => {
        setIsRegistered(doc.exists());
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
    }, 300);
  };

  return (
    <div
      ref={cardRef}
      className="perspective cursor-pointer"
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <GlowEffect hover intensity="medium" className="h-full">
        <div
          className={cn(
            'relative w-full h-[540px] transition-transform duration-500',
            isFlipped && '[transform:rotateY(180deg)]'
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ================= FRONT ================= */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <Card
              className={cn(
                'flex flex-col h-full overflow-hidden',
                isRegistered && 'border-accent ring-2 ring-accent'
              )}
            >
              {/* Image / Video */}
              <div className="relative aspect-[16/9] w-full">
                {event.videoUrl && (
                  <video
                    ref={videoRef}
                    src={event.videoUrl}
                    muted
                    loop
                    playsInline
                    className={cn(
                      'absolute inset-0 w-full h-full object-cover transition-opacity duration-500',
                      (isHovering || isInView)
                        ? 'opacity-100 z-10'
                        : 'opacity-0'
                    )}
                  />
                )}

                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  className={cn(
                    'object-cover transition-opacity duration-500',
                    (isHovering || isInView) && event.videoUrl
                      ? 'opacity-0'
                      : 'opacity-100'
                  )}
                />

                <div className="absolute top-2 right-2 z-20 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-background/80 backdrop-blur-sm text-sm"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    {event.viewCount || 0}
                  </Badge>

                  {isRegistered && (
                    <Badge className="bg-accent text-accent-foreground text-sm">
                      <UserCheck className="h-3 w-3 mr-1.5" />
                      Registered
                    </Badge>
                  )}

                  <Badge variant="secondary" className="text-sm">
                    {event.isFree
                      ? 'Free'
                      : event.price
                      ? `RM${event.price.toFixed(2)}`
                      : 'Paid'}
                  </Badge>

                  <Badge
                    variant="outline"
                    className="bg-background/80 backdrop-blur-sm text-sm capitalize"
                  >
                    {event.eventType === 'online' ? (
                      <Laptop className="h-3 w-3 mr-1.5" />
                    ) : (
                      <Users className="h-3 w-3 mr-1.5" />
                    )}
                    {event.eventType}
                  </Badge>
                </div>
              </div>

              {/* 🔥 HEADER (BIGGER) */}
              <CardHeader className="h-[200px]">
                <CardTitle className="text-xl leading-snug line-clamp-2">
                  {event.title}
                </CardTitle>

                <CardDescription className="flex items-center text-sm pt-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  {event.date ? formatDateRange(event.date.toDate(), event.endDate?.toDate()) : 'Date not set'}
                </CardDescription>

                <CardDescription className="flex items-center text-sm pt-1">
                  <Clock className="h-4 w-4 mr-2" />
                  {formatTime(event.startTime)} –{' '}
                  {formatTime(event.endTime)}
                </CardDescription>

                <CardDescription className="flex items-center text-sm pt-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  <span className="line-clamp-1">{event.location}</span>
                </CardDescription>
              </CardHeader>

              {/* 🔽 CONTENT (SMALLER) */}
              <CardContent className="h-[80px] overflow-hidden">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {truncateWords(event.description, 15)}
                </p>
              </CardContent>

              <CardFooter className="h-[50px]">
                <span className="text-sm font-semibold text-primary">
                  Read More
                </span>
              </CardFooter>
            </Card>
          </div>

          {/* ================= BACK ================= */}
          <div className="absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden] rounded-lg overflow-hidden">
            <Image
              src="/images/usmcircle.jpg"
              alt="USM Background"
              fill
              className="object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-black/50" />
          </div>
        </div>
      </GlowEffect>
    </div>
  );
}
