'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Clock } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import type { Event } from '@/types';
import { Button } from './ui/button';

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

export function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
    const [currentIndex, setCurrentIndex] = useState(0);

    // Get top 3 nearest events
    const featuredEvents = events.slice(0, 3);

    // Auto-slide every 5 seconds
    useEffect(() => {
        if (featuredEvents.length <= 1) return;

        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [featuredEvents.length]);

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % featuredEvents.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + featuredEvents.length) % featuredEvents.length);
    };

    const goToSlide = (index: number) => {
        setCurrentIndex(index);
    };

    if (featuredEvents.length === 0) {
        return null;
    }

    const currentEvent = featuredEvents[currentIndex];

    return (
        <div className="relative w-full rounded-2xl overflow-hidden mb-8 p-8 md:p-12">
            {/* Video Background for entire section */}
            <video
                key="welcome-bg-video-final"
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover -z-20"
            >
                <source src="/videos/welcome-bg.MP4" type="video/mp4" />
            </video>

            {/* Dark overlay for text readability */}
            <div className="absolute inset-0 bg-black/40 -z-10" />

            {/* Glow effect border - Purple Only */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-800 via-purple-500 to-purple-800 rounded-2xl opacity-50 blur-lg -z-20 animate-pulse" />

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center min-h-[400px]">

                {/* Left Side - Event Details */}
                <div className="space-y-6">

                    {/* Branding Image */}
                    <div className="flex justify-start">
                        <Image
                            src="/images/splash screen/TULISAN (1).png"
                            alt="USM Event Hub"
                            width={300}
                            height={100}
                            className="object-contain"
                        />
                    </div>

                    {/* Current Event Info */}
                    <div className="space-y-4 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
                        <h3 className="text-2xl font-bold text-white">{currentEvent.title}</h3>

                        <div className="space-y-2 text-white/90">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span className="text-sm">
                                    {currentEvent.date ? format(toMalaysiaTime(currentEvent.date.toDate()), 'MMMM d, yyyy') : 'Date TBA'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="text-sm">
                                    {formatTime(currentEvent.startTime)} - {formatTime(currentEvent.endTime)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm">{currentEvent.location}</span>
                            </div>
                        </div>

                        {/* Description snippet */}
                        <p className="text-white/70 text-sm line-clamp-2">
                            {currentEvent.description}
                        </p>

                        {/* CTA Button */}
                        <Link href={`/event/${currentEvent.id}`}>
                            <Button
                                className="w-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-white/50"
                            >
                                View Event Details
                            </Button>
                        </Link>
                    </div>

                    {/* Navigation Arrows */}
                    {featuredEvents.length > 1 && (
                        <div className="flex gap-3">
                            <button
                                onClick={prevSlide}
                                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all border border-white/20"
                                aria-label="Previous event"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="bg-white/20 hover:bg-white/30 text-white p-3 rounded-full backdrop-blur-sm transition-all border border-white/20"
                                aria-label="Next event"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Side - Clean Video/Poster Display */}
                <div className="relative h-[400px] lg:h-[450px] rounded-2xl overflow-hidden shadow-2xl">
                    {/* Video Background */}
                    <video
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="absolute inset-0 w-full h-full object-cover"
                        poster={currentEvent.imageUrl}
                    >
                        <source src={`/videos/event-bg.mp4`} type="video/mp4" />
                    </video>

                    {/* Fallback: Image background */}
                    <div
                        className="absolute inset-0 w-full h-full bg-cover bg-center"
                        style={{ backgroundImage: `url(${currentEvent.imageUrl})` }}
                    />

                    {/* Subtle overlay for depth (optional) */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
                </div>
            </div>

            {/* Dot Indicators */}
            {featuredEvents.length > 1 && (
                <div className="flex justify-center gap-2 mt-6">
                    {featuredEvents.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => goToSlide(index)}
                            className={`h-2 rounded-full transition-all ${index === currentIndex
                                ? 'bg-white w-8'
                                : 'bg-white/40 w-2 hover:bg-white/60'
                                }`}
                            aria-label={`Go to event ${index + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
