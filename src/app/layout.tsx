import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'USM Event Hub',
  description: 'Manage your events with ease.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen flex flex-col')}>
        <Providers>
          <Header />
          <main className="flex-grow bg-[url('/images/usmbg.jpg')] bg-cover bg-center bg-fixed relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50 pointer-events-none" />
            <div className="relative z-10">
              {children}
            </div>
          </main>
          <footer className="py-6 bg-black/90 backdrop-blur-sm text-white border-t border-primary/30">
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm font-medium">Powered and developed by <span className="font-bold text-primary">Chillframe</span></p>
            </div>
          </footer>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
