
'use client';

import { useState, useEffect } from 'react';
import { Bell, Mail } from 'lucide-react';
import { collection, query, onSnapshot, orderBy, limit, updateDoc, doc, getDocs, writeBatch, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import type { AppNotification } from '@/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Separator } from './ui/separator';

export function NotificationBell() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, orderBy('createdAt', 'desc'), limit(20));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notifsData: AppNotification[] = [];
            let unread = 0;
            snapshot.forEach((doc) => {
                const data = doc.data() as AppNotification;
                notifsData.push({ ...data, id: doc.id });
                if (!data.read) {
                    unread++;
                }
            });
            setNotifications(notifsData);
            setUnreadCount(unread);
        });

        return () => unsubscribe();
    }, [user]);

    const handleNotificationClick = async (notification: AppNotification) => {
        if (!user) return;
        if (!notification.read) {
            const notifRef = doc(db, 'users', user.uid, 'notifications', notification.id);
            await updateDoc(notifRef, { read: true });
        }
        router.push(notification.href);
    };

    const handleMarkAllAsRead = async () => {
        if (!user || unreadCount === 0) return;

        const notifsRef = collection(db, 'users', user.uid, 'notifications');
        const q = query(notifsRef, where('read', '==', false));
        const snapshot = await getDocs(q);

        const batch = writeBatch(db);
        snapshot.docs.forEach((doc) => {
            batch.update(doc.ref, { read: true });
        });

        await batch.commit();
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs font-bold text-white">
                            {unreadCount}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 flex justify-between items-center">
                    <h4 className="font-medium text-sm">Notifications</h4>
                    {unreadCount > 0 && (
                        <Button variant="link" size="sm" className="h-auto p-0" onClick={handleMarkAllAsRead}>Mark all as read</Button>
                    )}
                </div>
                <Separator />
                <ScrollArea className="h-96">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-sm text-muted-foreground">
                            <Mail className="h-10 w-10 mx-auto mb-2" />
                            You have no new notifications.
                        </div>
                    ) : (
                        <div className="divide-y">
                            {notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 hover:bg-muted cursor-pointer ${!notif.read ? 'bg-muted/50' : ''}`}
                                    onClick={() => handleNotificationClick(notif)}
                                >
                                    <p className={`text-sm mb-1 ${!notif.read ? 'font-semibold' : ''}`}>{notif.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(notif.createdAt.toDate(), { addSuffix: true })}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </PopoverContent>
        </Popover>
    );
}
