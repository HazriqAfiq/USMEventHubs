'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface FeaturedEventsCarouselProps {
  events: Event[];
}

const toMalaysiaTime = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  const malaysianDate = toMalaysiaTime(new Date());
  malaysianDate.setHours(parseInt(hours, 10));
  malaysianDate.setMinutes(parseInt(minutes, 10));
  return format(malaysianDate, 'p');
};

export function FeaturedEventsCarousel({ events: featuredEvents }: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (featuredEvents.length <= 1) return;

    const timer = setInterval(() => {
      setShowDetails(false); // hide details first
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
        setShowDetails(true); // show details after image switches
      }, 500);
    }, 6000); // total time per slide

    return () => clearInterval(timer);
  }, [featuredEvents.length]);

  if (featuredEvents.length === 0) return null;

  const currentEvent = featuredEvents[currentIndex];

  if (!currentEvent) return null;

  return (
    <div className="relative w-full md:h-[560px] rounded-3xl overflow-hidden mb-10 p-4 md:p-6">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover -z-20"
      >
        <source src="/videos/welcome-bg.MP4" type="video/mp4" />
      </video>

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-black/30 -z-10" />
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-700 via-purple-500 to-purple-700 rounded-3xl opacity-30 blur-lg -z-20" />

      {/* Event Image */}
      <div className="relative h-[300px] md:h-[450px] lg:h-[520px] rounded-3xl overflow-hidden shadow-2xl">
        <img
          src={currentEvent.imageUrl}
          alt={currentEvent.title}
          className="absolute inset-0 w-full h-full object-cover rounded-3xl"
        />

        {/* Frosted glass info overlay */}
        <AnimatePresence mode="wait">
          {showDetails && (
            <motion.div
              key={currentEvent.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] md:w-3/4 bg-white/10 backdrop-blur-sm rounded-2xl p-6 flex flex-col gap-3 text-white"
            >
              {/* Title */}
              <motion.h3
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl md:text-2xl font-bold line-clamp-2"
              >
                {currentEvent.title}
              </motion.h3>

              {/* Meta */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col md:flex-row gap-2 md:gap-6 text-sm text-white/90"
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-80" />
                  <span>{currentEvent.date ? format(toMalaysiaTime(currentEvent.date.toDate()), 'MMMM d, yyyy') : 'Date TBA'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 opacity-80" />
                  <span>{formatTime(currentEvent.startTime)} – {formatTime(currentEvent.endTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 opacity-80" />
                  <span className="line-clamp-1">{currentEvent.location}</span>
                </div>
              </motion.div>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="text-white/70 text-sm leading-relaxed line-clamp-3"
              >
                {currentEvent.description}
              </motion.p>

              {/* Button */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mt-2"
              >
                <Link href={`/event/${currentEvent.id}`}>
                  <Button className="w-full bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold transition-all hover:scale-[1.02]">
                    View Event Details
                  </Button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        {featuredEvents.length > 1 && (
          <>
            <button
              onClick={() => setCurrentIndex((i) => (i - 1 + featuredEvents.length) % featuredEvents.length)}
              className="absolute top-1/2 left-4 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentIndex((i) => (i + 1) % featuredEvents.length)}
              className="absolute top-1/2 right-4 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Dot Indicators */}
        {featuredEvents.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {featuredEvents.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-6' : 'bg-white/40 w-2'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
