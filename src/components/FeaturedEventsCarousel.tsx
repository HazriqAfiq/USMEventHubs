
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

  return (
    <div className="relative w-full md:h-[560px] rounded-3xl overflow-hidden mb-10 p-4 md:p-6 flex justify-center items-center">
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
      {events.length > 1 && (
        <motion.div
          key={`${events[leftIndex].id}-left`}
          className="rounded-2xl overflow-hidden"
          style={{ width: imageWidth, height: imageHeight, filter: 'blur(3px)', opacity: 0.5 }}
          initial={{ x: -200, scale: 0.85 }}
          animate={{ x: -100, scale: 0.85 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={events[leftIndex].imageUrl}
            alt={events[leftIndex].title}
            className="w-full h-full object-cover rounded-2xl"
          />
        </motion.div>
      )}

      {/* Center Image */}
      {events.length > 0 && (
          <motion.div
            key={`${events[currentIndex].id}-center`}
            className="relative rounded-2xl overflow-hidden shadow-2xl"
            style={{ width: imageWidth, height: imageHeight }}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <img
              src={events[currentIndex].imageUrl}
              alt={events[currentIndex].title}
              className="w-full h-full object-cover rounded-2xl"
            />

            {/* Info Overlay */}
            <AnimatePresence mode="wait">
              {showInfo && (
                <motion.div
                  key={`${events[currentIndex].id}-info`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.6 }}
                  className="absolute bottom-0 left-0 w-full h-full bg-white/10 backdrop-blur-[1px] rounded-2xl flex flex-col justify-end p-4 gap-2 text-white"
                >
                  <h3 className="text-lg md:text-xl font-bold line-clamp-2 text-center">
                    {events[currentIndex].title}
                  </h3>
                  <Link href={`/event/${events[currentIndex].id}`} className="w-full">
                    <Button className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold transition-all hover:scale-[1.02]">
                      View Event Details
                    </Button>
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
      )}


      {/* Right Image */}
      {events.length > 1 && (
        <motion.div
          key={`${events[rightIndex].id}-right`}
          className="rounded-2xl overflow-hidden"
          style={{ width: imageWidth, height: imageHeight, filter: 'blur(3px)', opacity: 0.5 }}
          initial={{ x: 200, scale: 0.85 }}
          animate={{ x: 100, scale: 0.85 }}
          transition={{ duration: 0.5 }}
        >
          <img
            src={events[rightIndex].imageUrl}
            alt={events[rightIndex].title}
            className="w-full h-full object-cover rounded-2xl"
          />
        </motion.div>
      )}

      {/* Navigation */}
      {events.length > 1 && (
        <>
          <button
            onClick={() =>
              setCurrentIndex((i) => (i - 1 + events.length) % events.length)
            }
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() =>
              setCurrentIndex((i) => (i + 1) % events.length)
            }
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
