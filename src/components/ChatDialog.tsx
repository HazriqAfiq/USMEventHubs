
'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ChatRoom from './ChatRoom';
import type { Event } from '@/types';

interface ChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event | null;
}

export default function ChatDialog({ isOpen, onClose, event }: ChatDialogProps) {
  if (!event) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="truncate">Chat for: {event.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-grow overflow-hidden px-6 pb-6">
           <ChatRoom eventId={event.id} organizerId={event.organizerId} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
