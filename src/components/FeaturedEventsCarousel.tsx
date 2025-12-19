
'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import type { Event } from '@/types';
import { Button } from './ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';

interface FeaturedEventsCarouselProps {
  events: Event[];
}

const toMalaysiaTime = (date: Date) => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
};

const formatTime = (timeString: string) => {
  if (!timeString) return '';
  const [hours, minutes] = timeString.split(':');
  
  const date = new Date();
  date.setHours(parseInt(hours,10));
  date.setMinutes(parseInt(minutes,10));
  date.setSeconds(0);

  return format(date, 'p');
};


export function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (events.length <= 1) return;

    const interval = setInterval(() => {
      handleNext();
    }, 5000);

    return () => clearInterval(interval);
  }, [events.length, currentIndex]);

  if (!events || events.length === 0) return null;

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % events.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + events.length) % events.length);
  };

  const getSlideIndex = (offset: number) => {
    return (currentIndex + offset + events.length) % events.length;
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.8,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0,
      scale: 0.8,
    }),
  };

  const renderSlide = (index: number) => {
    const event = events[index];
    if (!event) return null;

    return (
       <motion.div
        key={index}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{
          x: { type: 'spring', stiffness: 300, damping: 30 },
          opacity: { duration: 0.2 },
          scale: { duration: 0.3 }
        }}
        className="absolute w-full h-full flex flex-col items-center justify-center gap-4"
      >
        <div 
          className="relative rounded-2xl overflow-hidden shadow-2xl"
          style={{ width: 432.67, height: 243.38 }}
        >
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-full h-full object-cover rounded-2xl"
          />
        </div>
        <div className="flex flex-col items-center gap-3 text-white text-center w-[432.67px]">
            <h3 className="text-xl font-bold line-clamp-2" style={{textShadow: '0 1px 3px rgba(0,0,0,0.5)'}}>
            {event.title}
            </h3>
            <div className="text-sm text-white/90 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{event.date ? format(toMalaysiaTime(event.date.toDate()), 'MMM d, yyyy') : 'No date'}</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(event.startTime)} - {formatTime(event.endTime)}</span>
              </div>
            </div>
            <Link href={`/event/${event.id}`} className="w-full mt-2">
            <Button className="w-full max-w-xs bg-white/15 hover:bg-white/25 border border-white/30 text-white font-semibold transition-all hover:scale-[1.02]">
                View Event Details
            </Button>
            </Link>
        </div>
      </motion.div>
    );
  }

  const renderSideSlide = (offset: number) => {
    if (events.length <= 1) return null;
    const index = getSlideIndex(offset);
    const event = events[index];
    if (!event) return null;

    const isLeft = offset === -1;

    return (
      <motion.div
        key={index + (isLeft ? 'left' : 'right')}
        className="absolute top-1/2 -translate-y-1/2 rounded-2xl overflow-hidden"
        style={{
          width: 300,
          height: 168.75,
          filter: 'blur(3px)',
          opacity: 0.4
        }}
        initial={{ x: isLeft ? '-50%' : '50%', scale: 0.8 }}
        animate={{ x: isLeft ? '-110%' : '110%', scale: 0.8 }}
        exit={{ x: isLeft ? '-50%' : '50%', scale: 0.8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover" />
      </motion.div>
    );
  }

  return (
    <div className="relative w-full h-[450px] md:h-[500px] rounded-3xl overflow-hidden mb-10 p-4 md:p-6 flex items-center justify-center">
      {/* Main slides container */}
      <div className="relative w-full max-w-lg h-full flex items-center justify-center">
        <AnimatePresence initial={false} custom={direction}>
          {renderSlide(currentIndex)}
        </AnimatePresence>
      </div>

       {/* Side slides for visual effect */}
      {renderSideSlide(-1)}
      {renderSideSlide(1)}

      {/* Navigation */}
      {events.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-4 md:left-10 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20 z-20"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-4 md:right-10 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm border border-white/20 z-20"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}
    </div>
  );
}
