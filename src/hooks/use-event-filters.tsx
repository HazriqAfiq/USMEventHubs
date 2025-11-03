'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

type PriceFilter = 'all' | 'free' | 'paid';
type TypeFilter = 'all' | 'online' | 'physical';

interface EventFilterContextType {
  priceFilter: PriceFilter;
  setPriceFilter: (value: PriceFilter) => void;
  typeFilter: TypeFilter;
  setTypeFilter: (value: TypeFilter) => void;
}

const EventFilterContext = createContext<EventFilterContextType | undefined>(undefined);

export const EventFilterProvider = ({ children }: { children: ReactNode }) => {
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');

  const value = { priceFilter, setPriceFilter, typeFilter, setTypeFilter };

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
