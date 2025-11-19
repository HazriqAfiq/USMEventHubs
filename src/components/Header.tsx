'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, LogOut, UserCircle, DollarSign, Laptop, Users, LayoutDashboard } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useEventFilters } from '@/hooks/use-event-filters';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';


export function Header() {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { priceFilter, setPriceFilter, typeFilter, setTypeFilter } = useEventFilters();

  const isHomepage = pathname === '/';

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'U';
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-20">
        <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
          <Image src="/images/usm.png" alt="USM Event Hub Logo" width={120} height={120} />
          <span>USM Event Hub</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
           {isHomepage && (
             <div className="hidden sm:flex items-center gap-2">
                <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={priceFilter}
                  onValueChange={(value) => setPriceFilter(value as any || 'all')}
                  aria-label="Filter by price"
                >
                  <ToggleGroupItem value="all" aria-label="All prices">All</ToggleGroupItem>
                  <ToggleGroupItem value="free" aria-label="Free events">Free</ToggleGroupItem>
                  <ToggleGroupItem value="paid" aria-label="Paid events"><DollarSign className="h-4 w-4 mr-1"/>Paid</ToggleGroupItem>
                </ToggleGroup>

                 <ToggleGroup
                  type="single"
                  size="sm"
                  variant="outline"
                  value={typeFilter}
                  onValueChange={(value) => setTypeFilter(value as any || 'all')}
                  aria-label="Filter by type"
                >
                  <ToggleGroupItem value="all" aria-label="All event types">All</ToggleGroupItem>
                  <ToggleGroupItem value="online" aria-label="Online events"><Laptop className="h-4 w-4 mr-1"/>Online</ToggleGroupItem>
                  <ToggleGroupItem value="physical" aria-label="Physical events"><Users className="h-4 w-4 mr-1"/>Physical</ToggleGroupItem>
                </ToggleGroup>
              </div>
           )}
          {!loading && (
            <>
              {user && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.email || ''} />
                        <AvatarFallback>{getInitials(user.email)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none capitalize">{userProfile.role}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isAdmin && (
                      <DropdownMenuItem onClick={() => router.push('/admin')}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    {!isAdmin && (
                        <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>My Dashboard</span>
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push('/login')}>
                  <LogIn className="mr-2 h-4 w-4" /> Login
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
