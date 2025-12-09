'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

export function SplashScreen() {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Hide splash screen after 2.5 seconds
        const timer = setTimeout(() => {
            setIsVisible(false);
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-[hsl(240,15%,12%)] via-[hsl(260,20%,10%)] to-[hsl(240,15%,12%)] transition-opacity duration-500"
            style={{
                opacity: isVisible ? 1 : 0,
                pointerEvents: isVisible ? 'auto' : 'none',
            }}
        >
            {/* Gradient mesh background */}
            <div className="absolute inset-0 gradient-mesh opacity-60" />

            {/* Logo and caption container */}
            <div className="flex flex-col items-center gap-6">
                {/* Logo with glow effect */}
                <div className="relative animate-pulse">
                    <div className="absolute inset-0 blur-3xl bg-primary/30 scale-110" />
                    <Image
                        src="/images/usm-logo.png"
                        alt="USM Event Hub Logo"
                        width={600}
                        height={400}
                        priority
                        className="object-contain relative z-10 drop-shadow-[0_0_50px_rgba(199,125,255,0.5)]"
                    />
                </div>

                {/* Caption */}
                <p className="text-white text-xl md:text-2xl font-medium text-center px-4 animate-pulse [text-shadow:0_2px_10px_rgba(0,0,0,0.8)]">
                    We lead the platform that brings USM events to you
                </p>
            </div>
        </div>
    );
}
