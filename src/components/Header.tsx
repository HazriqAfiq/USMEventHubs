'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, LogOut, UserCircle, LayoutDashboard, User } from 'lucide-react';
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


export function Header() {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/login');
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="bg-card/95 backdrop-blur-sm text-card-foreground border-b sticky top-0 z-50">
      <div className="container mx-auto px-4 flex justify-between items-center h-14">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/images/usm.png" alt="USM Event Hub Logo" width={100} height={35} className="object-contain h-8" />
          <span className="font-headline font-bold text-base sm:text-lg tracking-tight">USM Event Hub</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-4">
          {!loading && (
            <>
              {user && userProfile ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full border-2 border-primary/50 p-0 overflow-hidden hover:border-primary transition-all">
                      <Avatar className="h-full w-full">
                        <AvatarImage src={userProfile.photoURL || `https://avatar.vercel.sh/${user.email}.png`} alt={user.email || ''} className="object-cover w-full h-full" />
                        <AvatarFallback>{getInitials(userProfile.name, user.email)}</AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none capitalize">{userProfile.name || userProfile.role}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push('/profile')}>
                      <User className="mr-2 h-4 w-4" />
                      <span>My Profile</span>
                    </DropdownMenuItem>
                    {isAdmin ? (
                      <DropdownMenuItem onClick={() => router.push('/admin')}>
                        <UserCircle className="mr-2 h-4 w-4" />
                        <span>Admin Dashboard</span>
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => router.push('/dashboard')}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>My Dashboard</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button onClick={() => router.push('/login')} variant="secondary">
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
