
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type PriceFilter = 'all' | 'free' | 'paid';
type TypeFilter = 'all' | 'online' | 'physical';
type TimeOfDayFilter = 'all' | 'morning' | 'afternoon' | 'night';

interface EventFilterContextType {
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  dates: Date[] | undefined;
  setDates: (date: Date[] | undefined) => void;
  timeOfDay: TimeOfDayFilter;
  setTimeOfDay: (value: TimeOfDayFilter) => void;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export const EventFilterProvider = ({ children }: { children: ReactNode }) => {
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dates, setDates] = useState<Date[] | undefined>();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayFilter>('all');


  const value = { priceFilter, setPriceFilter, typeFilter, setTypeFilter, dates, setDates, timeOfDay, setTimeOfDay };

  return (
    <EventFilterContext.Provider value={value}>
      {children}
    </EventFilterContext.Provider>
  );
};

export const useEventFilters = () => {
  const context = useContext(EventFilterContext);
  if (context === undefined) {
    throw new Error('useEventFilters must be used within an EventFilterProvider');
  }
  return context;
};
