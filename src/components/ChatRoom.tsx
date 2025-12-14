"use client";

import React, { useEffect, useRef, useState } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDocs, writeBatch, updateDoc } from 'firebase/firestore';
import { Send } from 'lucide-react';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import ChatMessage from './ChatMessage';
import { FirestorePermissionError } from '@/firebase/errors';
import { errorEmitter } from '@/firebase/error-emitter';

interface Props {
  eventId: string;
  organizerId?: string | null;
}

export default function ChatRoom({ eventId, organizerId }: Props) {
  const { user, userProfile } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const [profiles, setProfiles] = useState<Record<string, any>>({});
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
        // If user doesn't have permission yet, mark access as false and don't spam console
        if (err && err.code === 'permission-denied') {
          const permissionError = new FirestorePermissionError({
            path: q.toString(),
            operation: 'list',
          }, err);
          errorEmitter.emit('permission-error', permissionError);
          setHasAccess(false);
        } else {
          console.error('Chat snapshot error', err);
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
            setProfiles((p) => ({ ...p, [id]: snap.data() }));
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
        try { profileUnsubs.current[id]?.(); } catch {};
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
        try { profileUnsubs.current[id]?.(); } catch {};
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
    if (user.uid !== organizerId) {
      toast({ title: 'Unauthorized', description: 'Only the event organizer can clear the chat.', variant: 'destructive' });
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

  const togglePin = async (messageId: string, currentPinned: boolean | undefined) => {
    if (!user || !eventId) return;
    if (user.uid !== organizerId) {
      toast({ title: 'Unauthorized', description: 'Only the event organizer can pin messages.', variant: 'destructive' });
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

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="bg-neutral-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Event Chat</h3>
          {user?.uid === organizerId && (
            <>
              <button
                onClick={() => setShowClearDialog(true)}
                disabled={isClearing}
                className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
              >
                {isClearing ? 'Clearing...' : 'Clear Chat'}
              </button>

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
            </>
          )}
        </div>

        {hasAccess === false ? (
          <div className="mb-4 px-2 text-sm text-neutral-400">You don't have access to this chat yet. Registration may still be processing — refresh or wait a moment.</div>
        ) : (
          <>
            <div className="h-[32rem] overflow-y-auto mb-4 px-2" style={{ scrollbarGutter: 'stable' }}>
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-neutral-400">No messages yet — be the first to say something.</div>
              ) : (
                <>
                  {(() => {
                    const pinned = messages.filter((mm) => mm.pinned);
                    const others = messages.filter((mm) => !mm.pinned);
                    return (
                      <>
                        {pinned.length > 0 && (
                          <div className="sticky top-0 bg-neutral-900 z-10 space-y-3 mb-4 pb-3 border-b border-neutral-700">
                            {pinned.map((m) => (
                              <ChatMessage
                                key={`pinned-${m.id}`}
                                message={m}
                                isOwn={user?.uid === m.senderId}
                                isOrganizer={m.senderId === organizerId || m.isOrganizer}
                                profile={profiles[m.senderId]}
                                onTogglePin={togglePin}
                              />
                            ))}
                          </div>
                        )}

                        {others.length > 0 && (
                          <div className="space-y-3">
                            {others.map((m) => (
                              <ChatMessage
                                key={m.id}
                                message={m}
                                isOwn={user?.uid === m.senderId}
                                isOrganizer={m.senderId === organizerId || m.isOrganizer}
                                profile={profiles[m.senderId]}
                                onTogglePin={togglePin}
                              />
                            ))}
                          </div>
                        )}

                        <div ref={bottomRef} />
                      </>
                    );
                  })()}
                </>
              )}
            </div>

            <div className="mt-2">
              <div className="flex items-center gap-3">
                <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Type your message..." className="flex-1 h-11 min-h-[44px] resize-none rounded-md bg-neutral-800 text-white placeholder:text-neutral-400" />
                <button onClick={handleSend} aria-label="Send" className="bg-violet-500 hover:bg-violet-600 p-3 rounded-lg h-11 w-11 flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
