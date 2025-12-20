'use client';

import { cn } from '@/lib/utils';
import { Building, HeartPulse, Microscope, School } from 'lucide-react';

const campuses = [
  { name: 'Main Campus', icon: School },
  { name: 'Engineering Campus', icon: Building },
  { name: 'Health Campus', icon: HeartPulse },
  { name: 'AMDI / IPPT', icon: Microscope },
];

interface CampusFilterProps {
  selectedCampus: string | null;
  onSelectCampus: (campus: string | null) => void;
}

export function CampusFilter({ selectedCampus, onSelectCampus }: CampusFilterProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
      {campuses.map(({ name, icon: Icon }) => (
        <div
          key={name}
          onClick={() => onSelectCampus(selectedCampus === name ? null : name)}
          className={cn(
            'relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer group overflow-hidden',
            selectedCampus === name
              ? 'bg-primary/20 border-primary shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-105'
              : 'bg-card/60 border-border hover:border-primary/50 hover:bg-card/90'
          )}
        >
          <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
            <div className={cn(
              "mb-4 rounded-full p-4 transition-colors duration-300",
              selectedCampus === name ? 'bg-primary/80' : 'bg-primary/20 group-hover:bg-primary/30'
            )}>
              <Icon className="h-8 w-8 text-white" />
            </div>
            <h3 className="font-bold text-white text-base md:text-lg">{name}</h3>
          </div>
          {/* Background Glow Effect */}
          <div className={cn(
            "absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur transition-all duration-500",
            selectedCampus === name ? 'opacity-50' : 'opacity-0 group-hover:opacity-20'
          )} />
        </div>
      ))}
    </div>
  );
}
