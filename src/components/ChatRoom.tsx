
"use client";

import React, { useEffect, useRef, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDocs, writeBatch, updateDoc, deleteDoc } from 'firebase/firestore';
import { Send, Loader2, Trash2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatMessage from './ChatMessage';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';
import type { UserProfile } from '@/types';

interface Props {
  eventId: string;
  organizerId?: string | null;
}

export default function ChatRoom({ eventId, organizerId }: Props) {
  const { user, userProfile, isSuperAdmin, isAdmin, isOrganizer } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const { toast } = useToast();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const profileUnsubs = useRef<Record<string, () => void>>({});

  useEffect(() => {
    if (!eventId || !user) {
      setHasAccess(null);
      return;
    }

    setHasAccess(null);
    const q = query(collection(db, 'events', eventId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: any[] = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setMessages(arr);
        setHasAccess(true);
      },
      (err) => {
        if (err && err.code === 'permission-denied') {
          setHasAccess(false);
          // Don't emit an error here, just update the UI state.
          // This is an expected state for newly registered users.
        } else {
          console.error('Chat snapshot error', err);
          const permissionError = new FirestorePermissionError({
            path: `events/${eventId}/messages`,
            operation: 'list',
          }, err);
          errorEmitter.emit('permission-error', permissionError);
          setHasAccess(false);
        }
      }
    );

    return () => unsub();
  }, [eventId, user?.uid]);

  // Subscribe to sender profiles for any senderIds present in messages
  useEffect(() => {
    const senderIds = Array.from(new Set(messages.map((m) => m.senderId).filter(Boolean)));

    // add listeners for new senderIds
    senderIds.forEach((id) => {
      if (!profileUnsubs.current[id]) {
        const userDoc = doc(db, 'users', id);
        const unsub = onSnapshot(userDoc, (snap) => {
          if (snap.exists()) {
            setProfiles((p) => ({ ...p, [id]: snap.data() as UserProfile }));
          }
        }, () => {
          // ignore profile read errors
        });
        profileUnsubs.current[id] = unsub;
      }
    });

    // cleanup unsubscribed profiles that are no longer needed
    Object.keys(profileUnsubs.current).forEach((id) => {
      if (!senderIds.includes(id)) {
        try { profileUnsubs.current[id]?.(); } catch { };
        delete profileUnsubs.current[id];
        setProfiles((p) => {
          const copy = { ...p };
          delete copy[id];
          return copy;
        });
      }
    });

    // on unmount remove all listeners
    return () => {
      Object.keys(profileUnsubs.current).forEach((id) => {
        try { profileUnsubs.current[id]?.(); } catch { };
      });
      profileUnsubs.current = {};
    };
  }, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [isClearing, setIsClearing] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    try {
      const messageData = {
        text: text.trim(),
        senderId: user.uid,
        senderName: userProfile?.name || user.displayName || user.email || 'Anonymous',
        senderPhotoURL: userProfile?.photoURL || (user as any).photoURL || null,
        createdAt: serverTimestamp(),
        isOrganizer: organizerId ? (organizerId == user.uid) : false,
      };

      await addDoc(collection(db, 'events', eventId, 'messages'), messageData)
        .catch((serverError) => {
          const permissionError = new FirestorePermissionError({
            path: `events/${eventId}/messages`,
            operation: 'create',
            requestResourceData: messageData,
          }, serverError);
          errorEmitter.emit('permission-error', permissionError);
          throw serverError; // re-throw to be caught by outer catch
        });

      setText('');
    } catch (err) {
      console.error('Failed to send message', err);
      toast({ title: 'Error', description: 'Failed to send message. Check console for details.', variant: 'destructive' });
    }
  };

  const handleClearChat = async () => {
    if (!user || !eventId) return;
    const canClear = isSuperAdmin || isAdmin || (isOrganizer && user.uid === organizerId);

    if (!canClear) {
      toast({ title: 'Unauthorized', description: 'Only the event organizer or an admin can clear the chat.', variant: 'destructive' });
      return;
    }

    // called after confirmation dialog; perform multi-batch deletion
    setIsClearing(true);
    try {
      const msgsSnap = await getDocs(collection(db, 'events', eventId, 'messages'));
      const docs = msgsSnap.docs;
      if (docs.length === 0) {
        toast({ title: 'No messages', description: 'There are no messages to delete.' });
        setIsClearing(false);
        setShowClearDialog(false);
        return;
      }

      // Firestore batch limit is 500 operations per batch - handle large deletes by chunking
      const BATCH_SIZE = 500;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const chunk = docs.slice(i, i + BATCH_SIZE);
        const batch = writeBatch(db);
        chunk.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }

      setMessages([]);
      toast({ title: 'Chat cleared', description: 'All messages have been deleted.' });
      setShowClearDialog(false);
    } catch (err) {
      console.error('Failed to clear chat', err);
      toast({ title: 'Error', description: 'Failed to clear chat. Check console for details.', variant: 'destructive' });
    } finally {
      setIsClearing(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
     const messageRef = doc(db, 'events', eventId, 'messages', messageId);
     try {
        await deleteDoc(messageRef);
        toast({ title: 'Message Deleted' });
     } catch (error: any) {
        const permissionError = new FirestorePermissionError({
          path: messageRef.path,
          operation: 'delete',
        }, error);
        errorEmitter.emit('permission-error', permissionError);
        toast({ title: 'Error', description: 'Failed to delete message. Check console for details.', variant: 'destructive' });
     }
  }

const togglePin = async (messageId: string, currentPinned: boolean | undefined) => {
    if (!user || !eventId) return;

    if (user.uid !== organizerId && !isSuperAdmin && !isAdmin) {
        toast({ title: 'Unauthorized', description: 'Only the event organizer or an admin can pin messages.', variant: 'destructive' });
        return;
    }

    const pinnedCount = messages.filter(m => m.pinned).length;

    if (!currentPinned && pinnedCount >= 3) {
        toast({ title: 'Pin Limit Reached', description: 'You can only pin up to 3 messages.', variant: 'destructive' });
        return;
    }

    try {
        const messageRef = doc(db, 'events', eventId, 'messages', messageId);
        await updateDoc(messageRef, { pinned: !currentPinned })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: messageRef.path,
                    operation: 'update',
                    requestResourceData: { pinned: !currentPinned },
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);
                throw serverError; // re-throw to be caught by outer catch
            });

        setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pinned: !currentPinned } : m)));
        toast({ title: currentPinned ? 'Unpinned' : 'Pinned', description: currentPinned ? 'Message unpinned.' : 'Message pinned.' });
    } catch (err) {
        console.error('Failed to toggle pin', err);
        toast({ title: 'Error', description: 'Could not update pin. Check console.', variant: 'destructive' });
    }
};

  const canClearChat = isSuperAdmin || isAdmin || (isOrganizer && user?.uid === organizerId);

  const renderContent = () => {
    if (hasAccess === null) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-sm text-neutral-400">
          <Loader2 className="h-6 w-6 animate-spin mb-4" />
          <p>Checking chat access...</p>
        </div>
      );
    }

    if (hasAccess === false) {
      return (
        <div className="h-full flex flex-col items-center justify-center text-center text-sm text-neutral-400">
          <p className='font-semibold'>Access Denied</p>
          <p className='mt-1 max-w-xs'>Your registration might still be processing. Please wait a moment or try refreshing the page if this persists.</p>
        </div>
      );
    }
    
    const pinnedMessages = messages.filter(m => m.pinned);
    const regularMessages = messages.filter(m => !m.pinned);

    return (
      <div className="flex flex-col h-full">
         {canClearChat && (
             <div className="flex-shrink-0 px-1 py-2 flex justify-end">
                <button
                  onClick={() => setShowClearDialog(true)}
                  disabled={isClearing}
                  className="bg-red-600/10 hover:bg-red-600/20 text-red-400 px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5"
                >
                  <Trash2 className='h-3.5 w-3.5' />
                  {isClearing ? 'Clearing...' : 'Clear Chat'}
                </button>
             </div>
          )}
          
        {pinnedMessages.length > 0 && (
          <div className="flex-shrink-0 p-1">
             <div className="p-4 space-y-3 rounded-lg backdrop-blur-sm bg-black/20 border border-white/10">
              {pinnedMessages.map(m => (
                <ChatMessage
                  key={`pinned-${m.id}`}
                  message={m}
                  profile={profiles[m.senderId]}
                  eventOrganizerId={organizerId}
                  onTogglePin={togglePin}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </div>
          </div>
        )}
        
        <div className="flex-grow overflow-y-auto px-1 mt-2" style={{ scrollbarGutter: 'stable' }}>
          {regularMessages.length === 0 && pinnedMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-neutral-400">No messages yet — be the first to say something.</div>
          ) : (
            <div className="space-y-3">
              {regularMessages.map(m => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  profile={profiles[m.senderId]}
                  eventOrganizerId={organizerId}
                  onTogglePin={togglePin}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex-shrink-0 mt-2">
          <div className="flex items-center gap-3">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message..." className="flex-1 h-11 min-h-[44px] resize-none rounded-md bg-neutral-800 text-white placeholder:text-neutral-400" />
            <button onClick={handleSend} aria-label="Send" className="bg-violet-500 hover:bg-violet-600 p-3 rounded-lg h-11 w-11 flex items-center justify-center">
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>
        
         <Dialog open={showClearDialog} onOpenChange={setShowClearDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Clear Chat</DialogTitle>
                </DialogHeader>
                <div className="text-sm text-muted-foreground">Are you sure you want to delete all messages for this event? This action cannot be undone.</div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={() => handleClearChat()} disabled={isClearing} className="ml-2">{isClearing ? 'Clearing...' : 'Yes, delete all'}</Button>
                </DialogFooter>
              </DialogContent>
          </Dialog>
      </div>
    );
  }

  return (
      <div className="bg-neutral-900/90 rounded-2xl p-0 text-white shadow-lg relative overflow-hidden border border-white/10 h-full flex flex-col">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/images/WALL.png')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 1,
          }}
        />

        <div className="relative z-10 p-4 flex-grow flex flex-col h-full overflow-hidden">
          {renderContent()}
        </div>
      </div>
  );
}
