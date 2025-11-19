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
        <link href="https://fonts.googleapis.com/css2?family=PT+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className={cn('font-body antialiased min-h-screen flex flex-col')}>
        <Providers>
          <Header />
          <main className="flex-grow bg-[url('/images/usmbg.jpg')] bg-cover bg-center bg-no-repeat">
            <div className="bg-background/70 backdrop-blur-sm min-h-full">
              {children}
            </div>
          </main>
          <footer className="py-4 bg-card border-t">
            <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
              <p>Powered and developed by Chillframe.</p>
            </div>
          </footer>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
