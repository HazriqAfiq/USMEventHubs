'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays, LogIn, LogOut, UserCircle, Filter } from 'lucide-react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"


export function Header() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { priceFilter, setPriceFilter, typeFilter, setTypeFilter } = useEventFilters();

  const isHomepage = pathname === '/';

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/');
  };

  const getInitials = (email: string | null | undefined) => {
    if (!email) return 'A';
    return email.substring(0, 2).toUpperCase();
  };

  const filterControls = (
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-2 sm:items-center">
        <div className="space-y-1">
          <label className="text-sm font-medium sm:hidden">Price</label>
          <Select value={priceFilter} onValueChange={(value) => setPriceFilter(value as any)}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-9">
              <SelectValue placeholder="By Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium sm:hidden">Type</label>
           <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
            <SelectTrigger className="w-full sm:w-[150px] text-xs h-9">
              <SelectValue placeholder="By Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
  );

  return (
    <header className="bg-card border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-16">
        <Link href="/" className="flex items-center gap-2 font-headline text-xl font-bold text-primary">
          <CalendarDays className="h-6 w-6" />
          <span>USM Event Hub</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
           {isHomepage && (
             <>
              <div className="hidden sm:flex items-center gap-2">
                {filterControls}
              </div>
              <div className="sm:hidden">
                 <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="mr-2 h-4 w-4" />
                      Filter
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>Filter Events</SheetTitle>
                      <SheetDescription>
                        Refine the list of events based on your preferences.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-8">
                      {filterControls}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </>
           )}
          {!loading && (
            <>
              {user ? (
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
                        <p className="text-sm font-medium leading-none">Admin</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/admin')}>
                      <UserCircle className="mr-2 h-4 w-4" />
                      <span>Admin Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push('/login')}>
                  <LogIn className="mr-2 h-4 w-4" /> Admin Login
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
