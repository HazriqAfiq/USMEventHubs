

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EventCard from '@/components/EventCard';
import { Skeleton } from '@/components/ui/skeleton';
import type { Event } from '@/types';
import { useEventFilters } from '@/hooks/use-event-filters';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { DollarSign, Laptop, Users } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { SplashScreen } from '@/components/SplashScreen';
import { WelcomePage } from '@/components/WelcomePage';
import { FeaturedEventsCarousel } from '@/components/FeaturedEventsCarousel';
import { ScrollAnimation } from '@/components/ScrollAnimation';
import { addMinutes, isSameDay } from 'date-fns';
import { CampusFilter } from '@/components/CampusFilter';
import { GlobalBanner } from '@/components/GlobalBanner';
import { AdvancedEventFilters } from '@/components/AdvancedEventFilters';

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [now, setNow] = useState(new Date());
  const { priceFilter, setPriceFilter, typeFilter, setTypeFilter, date: dateFilter, timeOfDay: timeOfDayFilter } = useEventFilters();
  const { user, userProfile, isOrganizer, isAdmin, isSuperAdmin, loading: authLoading } = useAuth();
  const [selectedCampus, setSelectedCampus] = useState<string | null>(null);
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Redirect admins to their dashboards
    if (!authLoading && isSuperAdmin) {
      router.replace('/superadmin');
      return;
    }
    if (!authLoading && isAdmin) {
      router.replace('/admin');
      return;
    }
    
    // Check session storage to see if welcome screen should be skipped
    const welcomeDismissed = sessionStorage.getItem('welcomeDismissed');
    if (welcomeDismissed === 'true') {
      setShowWelcome(false);
    }
  }, [authLoading, isSuperAdmin, isAdmin, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Set up an interval to update the current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 60000); // every minute

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (authLoading || !user || isSuperAdmin || isAdmin) return;

    // Only fetch events that are 'approved'.
    const q = query(
      collection(db, 'events'), 
      where('status', '==', 'approved')
    );
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const eventsData: Event[] = [];

      querySnapshot.forEach((doc) => {
        const event = { id: doc.id, ...doc.data() } as Event;
        eventsData.push(event);
      });
      // Sort events by date client-side
      eventsData.sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());
      setEvents(eventsData);
      setLoadingEvents(false);
    }, (error) => {
      console.error("Error fetching events: ", error);
      setLoadingEvents(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, isSuperAdmin, isAdmin]);

  // Hide splash screen after a delay
  useEffect(() => {
    if (!authLoading && user) {
      const timer = setTimeout(() => {
        setShowSplash(false);
      }, 1700); // Same duration as splash screen animation
      return () => clearTimeout(timer);
    }
  }, [authLoading, user]);

  // A base list of events that the current user is eligible to see and are not over.
  const eligibleEvents = useMemo(() => {
    // First, filter out past events
    const activeEvents = events.filter(event => {
      if (event.date && event.startTime && event.endTime) {
        const eventDate = event.date.toDate();
        
        const [endHours, endMinutes] = event.endTime.split(':').map(Number);
        const endDateTime = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate(), endHours, endMinutes);

        return now < endDateTime;
      }
      return false;
    });
    
    // Admins and Organizers can see all active events.
    if (isOrganizer || isSuperAdmin || isAdmin) {
      return activeEvents;
    }
    
    // Students only see events they are eligible for.
    return activeEvents.filter(event => {
      // If eligibleCampuses is not set or is empty, assume it's open to all.
      if (!event.eligibleCampuses || event.eligibleCampuses.length === 0) {
        return true;
      }
      // Otherwise, check if the user's campus is in the list.
      return event.eligibleCampuses.includes(userProfile?.campus || '');
    });
  }, [events, now, isOrganizer, isAdmin, isSuperAdmin, userProfile]);
  

  // Featured events are derived from the eligible list.
  const featuredEvents = useMemo(() => {
    return eligibleEvents.slice(0, 5);
  }, [eligibleEvents]);

  // The final grid of events is filtered from the pre-vetted eligible list.
  const filteredEvents = useMemo(() => {
    return eligibleEvents.filter(event => {
      const priceMatch =
        priceFilter === 'all' ||
        (priceFilter === 'free' && event.isFree) ||
        (priceFilter === 'paid' && !event.isFree);

      const typeMatch =
        typeFilter === 'all' ||
        typeFilter === event.eventType;
      
      const campusMatch = !selectedCampus || event.conductingCampus === selectedCampus;

      const dateMatch = !dateFilter || (event.date && isSameDay(event.date.toDate(), dateFilter));

      const timeOfDayMatch = (() => {
        if (timeOfDayFilter === 'all') return true;
        if (!event.startTime) return false;

        const [startHour] = event.startTime.split(':').map(Number);
        if (timeOfDayFilter === 'morning' && startHour >= 5 && startHour < 12) return true;
        if (timeOfDayFilter === 'afternoon' && startHour >= 12 && startHour < 17) return true;
        if (timeOfDayFilter === 'evening' && startHour >= 17 && startHour < 24) return true;
        
        return false;
      })();
      
      return priceMatch && typeMatch && campusMatch && dateMatch && timeOfDayMatch;
    });
  }, [eligibleEvents, priceFilter, typeFilter, selectedCampus, dateFilter, timeOfDayFilter]);


  const handleGetStarted = () => {
    setShowWelcome(false);
    sessionStorage.setItem('welcomeDismissed', 'true');
  };


  if (authLoading || !user || isSuperAdmin || isAdmin) {
    // Show a skeleton loader while checking for auth, redirecting, etc.
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-6 w-3/4 mx-auto mt-4" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-6 w-3/e" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showSplash) {
    return <SplashScreen />;
  }

  if (showWelcome) {
    return <WelcomePage onGetStarted={handleGetStarted} />;
  }

  return (
    <>
      <GlobalBanner />
      <div className="container mx-auto px-4 pt-8 pb-8">
        {/* Featured Events Carousel */}
        {featuredEvents.length > 0 && (
          <ScrollAnimation delay={200}>
            <h1 className="text-4xl font-bold font-headline text-center text-white mb-2 [text-shadow:0_2px_4px_rgba(0,0,0,0.7)]">
              Featured Events
            </h1>
            <p className="text-lg text-center text-white/80 mb-8 max-w-2xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Here are some of the most popular and up-and-coming events. Don&apos;t miss out!
            </p>
            <FeaturedEventsCarousel events={featuredEvents} />
          </ScrollAnimation>
        )}

        {/* Campus Filter */}
        <ScrollAnimation delay={300}>
          <div className="mb-12">
             <h2 className="text-3xl font-bold font-headline text-center text-white mb-2 [text-shadow:0_2px_4px_rgba(0,0,0,0.7)]">
              Filter by Campus
            </h2>
            <p className="text-lg text-center text-white/80 mb-8 max-w-2xl mx-auto [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              Select a campus to see events happening there.
            </p>
            <CampusFilter selectedCampus={selectedCampus} onSelectCampus={setSelectedCampus} />
          </div>
        </ScrollAnimation>


        <ScrollAnimation delay={400}>
          <div className="flex justify-center mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border rounded-lg bg-card/80 backdrop-blur-sm">
               <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={priceFilter}
                  onValueChange={(value) => setPriceFilter(value as any || 'all')}
                  aria-label="Filter by price"
                >
                  <ToggleGroupItem value="all" aria-label="All prices">All</ToggleGroupItem>
                  <ToggleGroupItem value="free" aria-label="Free events">Free</ToggleGroupItem>
                  <ToggleGroupItem value="paid" aria-label="Paid events"><DollarSign className="h-4 w-4 mr-1" />Paid</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as any || 'all')}
                  aria-label="Filter by type"
                >
                  <ToggleGroupItem value="all" aria-label="All event types">All</ToggleGroupItem>
                  <ToggleGroupItem value="online" aria-label="Online events"><Laptop className="h-4 w-4 mr-1" />Online</ToggleGroupItem>
                  <ToggleGroupItem value="physical" aria-label="Physical events"><Users className="h-4 w-4 mr-1" />Physical</ToggleGroupItem>
                </ToggleGroup>
              </div>
               <AdvancedEventFilters />
            </div>
          </div>
        </ScrollAnimation>

        {loadingEvents ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-56 w-full" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredEvents.map((event, index) => (
              <ScrollAnimation key={event.id} delay={index * 100}>
                <EventCard event={event} />
              </ScrollAnimation>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 animate-fade-in-up">
            <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 animate-float">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-xl text-white/80 font-medium">No events found matching your criteria.</p>
            <p className="text-white/50 mt-2">Try adjusting your filters or search terms.</p>
          </div>
        )}
      </div>
    </>
  );
}
