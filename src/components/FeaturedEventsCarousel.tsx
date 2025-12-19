
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FeaturedEventsCarouselProps {
  events: Event[];
}

export function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showInfo, setShowInfo] = useState(true);

  const imageWidth = 432.67;
  const imageHeight = 243.38;

  // Automatic loop
  useEffect(() => {
    if (events.length <= 1) return;

    const interval = setInterval(() => {
      setShowInfo(false); // hide info
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % events.length);
        setShowInfo(true); // show info on new center
      }, 400); // small delay for smooth transition
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length]);

  if (!events || events.length === 0) return null;

  // Get indices for left and right
  const getLeftIndex = () => {
    if (events.length === 0) return 0;
    if (events.length === 1) return 0;
    return (currentIndex - 1 + events.length) % events.length;
  };

  const getRightIndex = () => {
    if (events.length === 0) return 0;
    if (events.length === 1) return 0;
    return (currentIndex + 1) % events.length;
  };

  const leftIndex = getLeftIndex();
  const rightIndex = getRightIndex();

  const renderSlide = (index: number, position: 'left' | 'center' | 'right') => {
    const event = events[index];
    if (!event) return null;

    if (position !== 'center') {
      return (
        <motion.div
          key={`${event.id}-${position}`}
          className="rounded-2xl overflow-hidden"
          style={{ 
            width: imageWidth, 
            height: imageHeight, 
            filter: 'blur(3px)', 
            opacity: 0.5 
          }}
          initial={{ x: position === 'left' ? -200 : 200, scale: 0.85 }}
          animate={{ x: position === 'left' ? -100 : 100, scale: 0.85 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        </motion.div>
      );
    }

    return (
       <motion.div
        key={`${event.id}-center`}
        className="relative flex flex-col items-center gap-4"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        <div 
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: imageWidth, height: imageHeight }}
        >
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>

        <AnimatePresence mode="wait">
          {showInfo && (
            <motion.div
              key={`${event.id}-info`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="flex flex-col items-center gap-3 text-white text-center w-[432.67px]"
            >
              <h3 className="text-xl font-bold line-clamp-2" style={{textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>
                {event.title}
              </h3>
              <Link href={`/event/${event.id}`} className="w-full">
                <Button className="w-full max-w-xs bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold transition-all hover:scale-[1.02]">
                  View Event Details
                </Button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="relative w-full h-[450px] md:h-[500px] rounded-3xl overflow-hidden mb-10 p-4 md:p-6 flex justify-center items-center">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20"
      >
        <source src="/videos/welcome-bg.MP4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-black/25 -z-10" />

      {/* Left Image */}
      {events.length > 1 && renderSlide(leftIndex, 'left')}

      {/* Center Slide (Image + Info) */}
      {events.length > 0 && renderSlide(currentIndex, 'center')}

      {/* Right Image */}
      {events.length > 1 && renderSlide(rightIndex, 'right')}


      {/* Navigation */}
      {events.length > 1 && (
        <>
          <button
            onClick={() => {
                setShowInfo(false);
                setTimeout(() => {
                    setCurrentIndex((i) => (i - 1 + events.length) % events.length);
                    setShowInfo(true);
                }, 400);
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
                setShowInfo(false);
                setTimeout(() => {
                    setCurrentIndex((i) => (i + 1) % events.length);
                    setShowInfo(true);
                }, 400);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
