
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type PriceFilter = 'all' | 'free' | 'paid';
type TypeFilter = 'all' | 'online' | 'physical';
type TimeOfDayFilter = 'all' | 'morning' | 'afternoon' | 'evening';

interface EventFilterContextType {
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
  date: Date | undefined;
  setDate: (date: Date | undefined) => void;
  timeOfDay: TimeOfDayFilter;
  setTimeOfDay: (value: TimeOfDayFilter) => void;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export const EventFilterProvider = ({ children }: { children: ReactNode }) => {
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [date, setDate] = useState<Date | undefined>();
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDayFilter>('all');


  const value = { priceFilter, setPriceFilter, typeFilter, setTypeFilter, date, setDate, timeOfDay, setTimeOfDay };

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
