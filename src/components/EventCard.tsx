import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, MapPin } from 'lucide-react';
import type { Event } from '@/types';
import { Badge } from './ui/badge';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
     <Link href={`/event/${event.id}`} className="flex">
      <Card className="flex flex-col overflow-hidden h-full transition-all hover:shadow-xl hover:-translate-y-1 w-full">
        <div className="relative aspect-video w-full">
          <Image src={event.imageUrl} alt={event.title} fill style={{objectFit: 'cover'}} />
          <div className="absolute top-2 right-2">
             {event.isFree ? (
                <Badge variant="secondary" className="text-sm">Free</Badge>
              ) : event.price ? (
                <Badge variant="secondary" className="text-sm">RM{event.price.toFixed(2)}</Badge>
              ): (
                <Badge variant="secondary" className="text-sm">Paid</Badge>
              )}
          </div>
        </div>
        <CardHeader>
          <CardTitle className="font-headline text-xl">{event.title}</CardTitle>
          <CardDescription className="flex items-center pt-1 text-sm">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{event.date ? format(event.date.toDate(), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
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
