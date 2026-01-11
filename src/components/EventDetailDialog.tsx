

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import EventForm from './EventForm';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { Check, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useRouter } from 'next/navigation';

interface EventDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  isEditable?: boolean;
  onApprove?: (event: Event) => void;
  onReject?: (event: Event) => void;
}

export default function EventDetailDialog({ isOpen, onClose, event, isEditable = false, onApprove, onReject }: EventDetailDialogProps) {
  const router = useRouter();
  
  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Event Details: {event.title}</DialogTitle>
          <DialogDescription>
            {isEditable ? "You can edit the event details below." : "Review the event details below."}
          </DialogDescription>
            {event.status === 'pending-update' && event.updateReason && (
              <div className="mt-2 text-sm text-blue-400 bg-blue-500/10 p-2 rounded-md">
                  <strong>Organizer's reason for update:</strong> {event.updateReason}
              </div>
            )}
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="pr-6">
                <EventForm event={event} isEditable={isEditable} isInDialog={true} />
            </div>
        </ScrollArea>
        
        {/* Show approval buttons only if functions are provided */}
        {onApprove && onReject ? (
            <DialogFooter className="pr-6">
                <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                <div className='flex gap-2'>
                    <Button variant="destructive" onClick={() => onReject(event)}>
                        <X className="mr-2 h-4 w-4" /> Reject
                    </Button>
                    <Button onClick={() => onApprove(event)}>
                        <Check className="mr-2 h-4 w-4" /> Approve
                    </Button>
                </div>
            </DialogFooter>
        ) : (
           <DialogFooter className="pr-6">
             <Button variant="outline" onClick={handleCancel}>Close</Button>
           </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
