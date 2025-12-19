'use client';

import { ReactNode } from 'react';

interface GlowEffectProps {
  children: ReactNode;
  intensity?: 'low' | 'medium' | 'high';
  color?: 'purple' | 'pink' | 'blue' | 'gradient';
  hover?: boolean;
  active?: boolean;
  className?: string;
}

export function GlowEffect({
  children,
  intensity = 'medium',
  color = 'gradient',
  hover = false,
  active = false,
  className = '',
}: GlowEffectProps) {
  // Color variants
  const colorClasses = {
    purple: 'from-purple-600 via-purple-600 to-purple-600',
    pink: 'from-pink-600 via-pink-600 to-pink-600',
    blue: 'from-blue-600 via-cyan-600 to-blue-600',
    gradient: 'from-purple-600 via-pink-600 to-purple-600',
  };

  // Intensity variants
  const intensityClasses = {
    low: 'opacity-30 blur-sm',
    medium: 'opacity-60 blur-md',
    high: 'opacity-80 blur-lg',
  };

  const glowClass = colorClasses[color];
  const intensityClass = intensityClasses[intensity];

  return (
    <div className={`relative group ${className}`}>
      {/* Animated glowing border effect */}
      <div
        className={`
          absolute -inset-0.5 
          bg-gradient-to-r ${glowClass}
          rounded-xl 
          ${intensityClass}
          transition-all duration-500 
          ${hover ? 'opacity-0 group-hover:opacity-100 group-hover:blur-lg' : ''}
          ${active ? 'opacity-100 blur-lg' : ''}
          ${!hover && !active ? 'animate-pulse' : ''}
        `}
        style={{
          animation: !hover && !active ? 'glow 3s ease-in-out infinite' : undefined,
        }}
      />

      {/* Content */}
      <div className="relative z-10">{children}</div>

      {/* CSS animation */}
      <style jsx>{`
        @keyframes glow {
          0%,
          100% {
            opacity: 0.4;
            filter: blur(8px);
          }
          50% {
            opacity: 0.8;
            filter: blur(12px);
          }
        }
      `}</style>
    </div>
  );
}
