
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface WelcomePageProps {
    onGetStarted: () => void;
    videoSrc?: string; // Optional video source path
}

export function WelcomePage({ onGetStarted, videoSrc = '/videos/welcome-bg.mp4' }: WelcomePageProps) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger fade-in animation after component mounts
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    return (
        <div
            className={`relative h-screen min-h-[600px] w-full flex items-center justify-center overflow-hidden transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'
                }`}
        >
            {/* Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ objectFit: 'cover' }}
            >
                <source src={videoSrc} type="video/mp4" />
                {/* Fallback gradient background if video fails to load */}
            </video>

            {/* Dark overlay for better text readability */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

            {/* Gradient overlay for premium look */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/60 pointer-events-none" />

            {/* Content Container */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto">
                {/* Main Heading */}
                <h1
                    className={`text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 font-headline transition-all duration-1000 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                        }`}
                    style={{
                        textShadow: '0 4px 20px rgba(0,0,0,0.8), 0 0 40px rgba(147, 51, 234, 0.3)', // Purple glow
                    }}
                >
                    Welcome to
                    <br />
                    <span className="bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                        USM Event Hub
                    </span>
                </h1>

                {/* Subtitle */}
                <p
                    className={`text-xl md:text-2xl lg:text-3xl text-white/90 mb-12 max-w-2xl transition-all duration-1000 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                        }`}
                    style={{
                        textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    }}
                >
                    Discover amazing events, connect with the community, and earn your MyCSD points
                </p>

                {/* Get Started Button */}
                <div
                    className={`transition-all duration-1000 delay-700 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
                        }`}
                >
                    <Button
                        onClick={onGetStarted}
                        size="lg"
                        className="group relative overflow-hidden bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white font-semibold text-lg px-10 py-6 rounded-full shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-purple-600/30 hover:border-white/50"
                    >
                        {/* Subtle shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 blur-sm" />

                        <span className="relative flex items-center gap-3">
                            Get Started
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
                        </span>
                    </Button>
                </div>

                {/* Decorative elements - Purple Only */}
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-600/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-800/20 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            {/* Bottom gradient fade and Scroll Down button */}
            <div className={`absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/80 to-transparent flex flex-col items-center justify-end pb-8 transition-opacity duration-1000 delay-[1200ms] ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                <Button
                    onClick={onGetStarted}
                    variant="ghost"
                    className="group text-white/70 hover:text-white hover:bg-transparent animate-[bounce_2s_ease-in-out_infinite]"
                >
                    <span className="relative flex items-center gap-2">
                        Scroll Down
                        <ArrowDown className="w-5 h-5" />
                    </span>
                </Button>
            </div>
        </div>
    );
}
