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
      videoRef.current.play().catch(error => {
        console.log("Video autoplay prevented:", error);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isHovering, isInView, event.videoUrl]);
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      {
        threshold: 0.5, // Trigger when 50% of the element is visible
      }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
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
      const unsubscribe = onSnapshot(
        registrationRef,
        (doc) => {
          setIsRegistered(doc.exists());
        },
        () => {
          setIsRegistered(false);
        }
      );
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
            isFlipped ? '[transform:rotateY(180deg)]' : ''
          )}
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* ================= FRONT ================= */}
          <div className="absolute inset-0 w-full h-full [backface-visibility:hidden]">
            <Card
              className={cn(
                'flex flex-col h-full w-full overflow-hidden',
                isRegistered && 'border-accent ring-2 ring-accent'
              )}
            >
              {/* Image & Video Container */}
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
                      (isHovering || isInView) ? 'opacity-100 z-10' : 'opacity-0'
                    )}
                  />
                )}
                <Image
                  src={event.imageUrl}
                  alt={event.title}
                  fill
                  style={{ objectFit: 'cover' }}
                  className={cn(
                    'transition-opacity duration-500',
                    (isHovering || isInView) && event.videoUrl ? 'opacity-0' : 'opacity-100'
                  )}
                />
                <div className="absolute top-2 right-2 flex flex-wrap justify-end gap-2">
                   <Badge
                    variant="outline"
                    className="text-sm bg-background/80 backdrop-blur-sm"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    {event.viewCount || 0}
                  </Badge>
                  {isRegistered && (
                    <Badge
                      variant="secondary"
                      className="text-sm bg-accent/90 text-accent-foreground"
                    >
                      <UserCheck className="h-3 w-3 mr-1.5" />
                      Registered
                    </Badge>
                  )}

                  {event.isFree ? (
                    <Badge variant="secondary" className="text-sm">
                      Free
                    </Badge>
                  ) : event.price ? (
                    <Badge variant="secondary" className="text-sm">
                      RM{event.price.toFixed(2)}
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-sm">
                      Paid
                    </Badge>
                  )}

                  <Badge
                    variant="outline"
                    className="text-sm bg-background/80 backdrop-blur-sm capitalize"
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

              {/* Header (fixed height) */}
              <CardHeader className="h-[150px]">
                <CardTitle className="font-headline text-xl line-clamp-2">
                  {event.title}
                </CardTitle>

                <CardDescription className="flex items-center pt-1 text-sm">
                  <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    {event.date
                      ? format(
                          toMalaysiaTime(event.date.toDate()),
                          'EEEE, MMMM d, yyyy'
                        )
                      : 'Date not set'}
                  </span>
                </CardDescription>

                <CardDescription className="flex items-center pt-1 text-sm">
                  <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span>
                    {formatTime(event.startTime)} -{' '}
                    {formatTime(event.endTime)}
                  </span>
                </CardDescription>

                <CardDescription className="flex items-center pt-1 text-sm">
                  <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="line-clamp-1">{event.location}</span>
                </CardDescription>

              </CardHeader>

              {/* Content (fixed height) */}
              <CardContent className="h-[110px] overflow-hidden flex-grow">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {truncateWords(event.description, 15)}
                </p>
              </CardContent>

              {/* Footer (fixed height) */}
              <CardFooter className="h-[50px] flex items-center">
                <span className="text-sm font-semibold text-primary">
                  Read More
                </span>
              </CardFooter>
            </Card>
          </div>

          {/* ================= BACK ================= */}
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
