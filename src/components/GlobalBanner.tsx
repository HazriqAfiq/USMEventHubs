
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Megaphone, X, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface BannerData {
  message: string;
  enabled: boolean;
  link?: string;
}

export function GlobalBanner() {
  const [banner, setBanner] = useState<BannerData | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const bannerRef = doc(db, 'site_settings', 'global_banner');
    const unsubscribe = onSnapshot(bannerRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as BannerData;
        setBanner(data);
        // Check session storage to see if this specific banner was dismissed
        const dismissedMessage = sessionStorage.getItem('dismissedBanner');
        if (dismissedMessage === data.message) {
            setIsVisible(false);
        } else {
            setIsVisible(true);
        }
      } else {
        setBanner(null);
      }
    }, (error) => {
        console.error("Failed to listen to banner changes:", error);
        setBanner(null);
    });

    return () => unsubscribe();
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (banner?.message) {
        sessionStorage.setItem('dismissedBanner', banner.message);
    }
  };

  if (!banner || !banner.enabled || !banner.message || !isVisible) {
    return null;
  }

  const BannerContent = () => (
     <div className="flex items-center gap-x-3">
        <Megaphone className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium leading-6">{banner.message}</p>
        {banner.link && (
            <ArrowRight className="ml-1 h-4 w-4 flex-shrink-0" />
        )}
    </div>
  );

  return (
    <div className="relative isolate flex items-center gap-x-6 overflow-hidden bg-gradient-to-r from-purple-600/50 to-pink-500/50 px-6 py-2.5 sm:px-3.5 sm:before:flex-1">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
         {banner.link ? (
          <Link href={banner.link} target="_blank" rel="noopener noreferrer" className="flex-auto hover:underline">
            <BannerContent />
          </Link>
        ) : (
          <div className="flex-auto"><BannerContent /></div>
        )}
      </div>
      <div className="flex flex-1 justify-end">
        <button type="button" className="-m-3 p-3 focus-visible:outline-offset-[-4px]" onClick={handleDismiss}>
          <span className="sr-only">Dismiss</span>
          <X className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
