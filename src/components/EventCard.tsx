import Image from 'next/image';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';
import type { Event } from '@/types';
import { Badge } from './ui/badge';

interface EventCardProps {
  event: Event;
}

export default function EventCard({ event }: EventCardProps) {
  return (
    <Card className="flex flex-col overflow-hidden h-full transition-all hover:shadow-xl hover:-translate-y-1">
      <div className="relative aspect-video w-full">
        <Image src={event.imageUrl} alt={event.title} fill style={{objectFit: 'cover'}} data-ai-hint={event.imageHint} />
      </div>
      <CardHeader>
        <CardTitle className="font-headline text-xl">{event.title}</CardTitle>
        <CardDescription className="flex items-center pt-1">
          <Calendar className="h-4 w-4 mr-2" />
          <span>{event.date ? format(event.date.toDate(), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <p className="text-sm text-muted-foreground line-clamp-3 flex-grow">{event.description}</p>
        {event.keywords && event.keywords.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {event.keywords.map((keyword) => (
              <Badge key={keyword} variant="secondary">{keyword}</Badge>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter>
        <span className="text-sm font-semibold text-primary">Read More</span>
      </CardFooter>
    </Card>
  );
}
