

'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import EventForm from './EventForm';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { Check, Trash2, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  onApprove: (event: Event) => void;
  onReject: (event: Event) => void;
  onApproveDeletion: (event: Event) => void;
}

export default function ApprovalDialog({ isOpen, onClose, event, onApprove, onReject, onApproveDeletion }: ApprovalDialogProps) {

  const renderFooter = () => {
    if (event.status === 'pending-deletion') {
      return (
        <DialogFooter className="pr-6">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <div className='flex gap-2'>
              <Button variant="outline" onClick={() => onReject(event)}>
                  <X className="mr-2 h-4 w-4" /> Reject Deletion
              </Button>
              <Button variant="destructive" onClick={() => onApproveDeletion(event)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Approve Deletion
              </Button>
          </div>
        </DialogFooter>
      );
    }

    return (
      <DialogFooter className="pr-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <div className='flex gap-2'>
            <Button variant="destructive" onClick={() => onReject(event)}>
                <X className="mr-2 h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => onApprove(event)}>
                <Check className="mr-2 h-4 w-4" /> Approve
            </Button>
        </div>
      </DialogFooter>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <DialogHeader>
          <DialogTitle>Review Event: {event.title}</DialogTitle>
          <DialogDescription>
            Review the details below. You can edit fields before approving or rejecting.
          </DialogDescription>
             {(event.status === 'pending-update' && event.updateReason) && (
              <div className="mt-2 text-sm text-blue-400 bg-blue-500/10 p-2 rounded-md">
                  <strong>Organizer's reason for update:</strong> {event.updateReason}
              </div>
            )}
            {(event.status === 'pending-deletion' && event.deletionReason) && (
              <div className="mt-2 text-sm text-orange-400 bg-orange-500/10 p-2 rounded-md">
                  <strong>Organizer's reason for deletion:</strong> {event.deletionReason}
              </div>
            )}
        </DialogHeader>
        <ScrollArea className="h-full">
            <div className="pr-6">
                <EventForm event={event} isEditable={false} />
            </div>
        </ScrollArea>
        {renderFooter()}
      </DialogContent>
    </Dialog>
  );
}
