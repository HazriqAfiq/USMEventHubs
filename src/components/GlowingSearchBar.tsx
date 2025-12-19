'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

interface GlowingSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
}

export function GlowingSearchBar({
    value,
    onChange,
    placeholder = "Search events..."
}: GlowingSearchBarProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <div className="relative w-full max-w-2xl mx-auto mb-8">
            {/* Animated glowing border effect */}
            <div
                className={`absolute -inset-0.5 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition-all duration-500 animate-pulse ${isFocused ? 'opacity-100 blur-md' : ''
                    }`}
                style={{
                    animation: 'glow 3s ease-in-out infinite',
                }}
            />

            {/* Search bar container */}
            <div className="relative flex items-center">
                {/* Search input */}
                <div className="relative flex items-center w-full">
                    {/* Search icon */}
                    <Search
                        className={`absolute left-4 w-5 h-5 transition-colors duration-300 ${isFocused ? 'text-purple-400' : 'text-gray-400'
                            }`}
                    />

                    {/* Input field */}
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder={placeholder}
                        className={`
              w-full pl-12 pr-4 py-4 
              bg-[hsl(240,15%,12%)] 
              border border-purple-500/30
              rounded-xl
              text-white placeholder-gray-400
              outline-none
              transition-all duration-300
              focus:border-purple-400/60
              focus:bg-[hsl(240,20%,14%)]
              focus:shadow-[0_0_20px_rgba(168,85,247,0.3)]
              backdrop-blur-xl
            `}
                        style={{
                            textShadow: '0 0 8px rgba(168, 85, 247, 0.5)',
                        }}
                    />
                </div>
            </div>

            {/* Additional glow effects on focus */}
            {isFocused && (
                <>
                    <div className="absolute -inset-1 bg-purple-500/20 rounded-xl blur-xl animate-pulse" />
                    <div className="absolute -inset-2 bg-pink-500/10 rounded-xl blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
                </>
            )}

            {/* CSS animation for the glow effect */}
            <style jsx>{`
        @keyframes glow {
          0%, 100% {
            opacity: 0.6;
            filter: blur(8px);
          }
          50% {
            opacity: 1;
            filter: blur(12px);
          }
        }
      `}</style>
        </div>
    );
}
