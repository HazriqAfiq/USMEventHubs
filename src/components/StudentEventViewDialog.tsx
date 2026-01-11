
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import Image from 'next/image';
import { format } from 'date-fns';
import { Calendar, Clock, MapPin, Laptop, Users, Eye } from 'lucide-react';
import type { Event } from '@/types';
import { ScrollArea } from './ui/scroll-area';

interface StudentEventViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

const toMalaysiaTime = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10));
  date.setMinutes(parseInt(minutes, 10));
  return format(date, 'p');
};

export default function StudentEventViewDialog({ isOpen, onClose, event }: StudentEventViewDialogProps) {
  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col p-0">
        <ScrollArea className="h-full">
          <div className="relative h-64 w-full">
            <Image
              src={event.imageUrl}
              alt={event.title}
              fill
              style={{ objectFit: 'cover' }}
              className="rounded-t-lg"
            />
             <div className="absolute top-2 right-2 z-10 flex flex-wrap gap-2">
                  <Badge
                    variant="outline"
                    className="bg-background/80 backdrop-blur-sm text-sm"
                  >
                    <Eye className="h-3 w-3 mr-1.5" />
                    {event.viewCount || 0}
                  </Badge>

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
          <div className="p-6 space-y-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl md:text-3xl font-bold font-headline">{event.title}</DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{event.date ? format(toMalaysiaTime(event.date.toDate()), 'EEEE, MMMM d, yyyy') : 'Date not set'}</span>
                </div>
                 <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
                </div>
                <div className="flex items-center gap-2 md:col-span-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{event.location}</span>
                </div>
            </div>
            
            <div className="prose prose-stone dark:prose-invert max-w-none text-foreground whitespace-pre-wrap">
              <p>{event.description}</p>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter className="p-6 pt-0">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
