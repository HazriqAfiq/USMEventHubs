
'use client';

import { Calendar as CalendarIcon, X } from 'lucide-react';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import { useEventFilters } from '@/hooks/use-event-filters';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export function AdvancedEventFilters() {
  const { date, setDate, timeOfDay, setTimeOfDay } = useEventFilters();

  const handleClear = () => {
    setDate(undefined);
    setTimeOfDay('all');
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            size="sm"
            className={cn(
              'w-full sm:w-[240px] justify-start text-left font-normal',
              !date && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={(day) => setDate(day)}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        value={timeOfDay}
        onValueChange={(value) => setTimeOfDay(value as any || 'all')}
        aria-label="Filter by time of day"
      >
        <ToggleGroupItem value="all" aria-label="All day">All Day</ToggleGroupItem>
        <ToggleGroupItem value="morning" aria-label="Morning">Morning</ToggleGroupItem>
        <ToggleGroupItem value="afternoon" aria-label="Afternoon">Afternoon</ToggleGroupItem>
        <ToggleGroupItem value="evening" aria-label="Evening">Evening</ToggleGroupItem>
      </ToggleGroup>
      
      {(date || timeOfDay !== 'all') && (
        <Button variant="ghost" size="sm" onClick={handleClear} className="text-muted-foreground hover:text-foreground">
          <X className="mr-2 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
