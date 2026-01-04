
'use client';

import { cn } from '@/lib/utils';
import { Building, HeartPulse, Microscope, School, XCircle } from 'lucide-react';
import { Button } from './ui/button';

const campuses = [
  { name: 'Main Campus', icon: School, videoSrc: '/videos/maincampus.mp4' },
  { name: 'Engineering Campus', icon: Building, videoSrc: '/videos/engineeringcampus.mp4' },
  { name: 'Health Campus', icon: HeartPulse, videoSrc: '/videos/healthcampus.mp4' },
  { name: 'AMDI / IPPT', icon: Microscope, videoSrc: '/videos/ippt.mp4' },
];

interface CampusFilterProps {
  selectedCampus: string | null;
  onSelectCampus: (campus: string | null) => void;
  onClearFilter: () => void;
}

export function CampusFilter({ selectedCampus, onSelectCampus, onClearFilter }: CampusFilterProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex justify-center flex-wrap gap-4 md:gap-6">
        {campuses.map(({ name, icon: Icon, videoSrc }) => (
          <div
            key={name}
            onClick={() => onSelectCampus(selectedCampus === name ? null : name)}
            className={cn(
              'relative w-[270px] h-[270px] flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer group overflow-hidden',
              selectedCampus === name
                ? 'bg-primary/20 border-primary shadow-[0_0_30px_rgba(168,85,247,0.5)] scale-105'
                : 'bg-card/60 border-border hover:border-primary/50 hover:bg-card/90'
            )}
          >
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 w-full h-full object-cover z-0 transition-transform duration-500 group-hover:scale-110"
              src={videoSrc}
            />
            <div className="absolute inset-0 bg-black/50 z-0" />
            
            <div className="relative z-10 flex flex-col items-center justify-center text-center h-full">
              <div className={cn(
                "mb-4 rounded-full p-4 transition-colors duration-300 backdrop-blur-sm",
                selectedCampus === name ? 'bg-primary/80' : 'bg-primary/20 group-hover:bg-primary/30'
              )}>
                <Icon className="h-10 w-10 text-white" />
              </div>
              <h3 className="font-bold text-white text-lg md:text-xl" style={{textShadow: '0 2px 4px rgba(0,0,0,0.7)'}}>{name}</h3>
            </div>
            {/* Background Glow Effect */}
            <div className={cn(
              "absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl blur transition-all duration-500 z-0",
              selectedCampus === name ? 'opacity-50' : 'opacity-0 group-hover:opacity-20'
            )} />
          </div>
        ))}
      </div>
      {selectedCampus && (
        <Button variant="ghost" onClick={onClearFilter}>
          <XCircle className="mr-2 h-4 w-4" />
          Clear Campus Filter
        </Button>
      )}
    </div>
  );
}
