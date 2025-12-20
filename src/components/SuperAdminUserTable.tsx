
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from './ui/button';
import { Trash2, UserX } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent } from './ui/card';
import type { UserProfile } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function UserManagementTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser, isSuperAdmin, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'organizer' | 'student'>('all');

  useEffect(() => {
    if (authLoading || !isSuperAdmin) {
      if (!authLoading) setLoading(false);
      return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef);

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, isSuperAdmin]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const searchMatch =
        searchQuery === '' ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const roleMatch =
        roleFilter === 'all' ||
        user.role === roleFilter;

      return searchMatch && roleMatch;
    });
  }, [users, searchQuery, roleFilter]);

  const handleRoleChange = async (userId: string, newRole: 'organizer' | 'student') => {
    if (!isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied' });
      return;
    }
    const userDocRef = doc(db, 'users', userId);
    try {
      await updateDoc(userDocRef, { role: newRole });
      toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const handleCampusChange = async (userId: string, newCampus: string) => {
    if (!isSuperAdmin) {
        toast({ variant: 'destructive', title: 'Permission Denied' });
        return;
    }
    const userDocRef = doc(db, 'users', userId);
    try {
        await updateDoc(userDocRef, { campus: newCampus });
        toast({ title: 'Campus Updated', description: `User's campus has been changed to ${newCampus}.` });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const handleToggleDisable = async (userToUpdate: UserProfile) => {
    if (!isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied' });
      return;
    }
    if (userToUpdate.uid === currentUser?.uid) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'You cannot disable your own account.' });
        return;
    }
    const userDocRef = doc(db, 'users', userToUpdate.uid);
    const newDisabledStatus = !userToUpdate.disabled;
    try {
      await updateDoc(userDocRef, { disabled: newDisabledStatus });
      toast({ title: `User ${newDisabledStatus ? 'Disabled' : 'Enabled'}`, description: `${userToUpdate.name || userToUpdate.email} has been ${newDisabledStatus ? 'disabled' : 'enabled'}.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  }
  
  const handleDelete = async (userToDelete: UserProfile) => {
    if (!isSuperAdmin) {
      toast({ variant: 'destructive', title: 'Permission Denied' });
      return;
    }
    if (userToDelete.uid === currentUser?.uid) {
        toast({ variant: 'destructive', title: 'Action Not Allowed', description: 'You cannot delete your own account.' });
        return;
    }
    // Deleting the user from Firestore. Deleting from Firebase Auth is a server-side operation.
    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      toast({
        title: 'User Deleted',
        description: `User ${userToDelete.name || userToDelete.email} has been removed from Firestore.`,
      });
    } catch (error: any) {
      console.error("Error removing user: ", error);
      toast({
        variant: 'destructive',
        title: 'Deletion Failed',
        description: error.message,
      });
    }
  };

  if (loading || authLoading) {
    return (
      <div className="mt-6 space-y-4">
         <div className="flex justify-between items-center">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-10 w-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <Card className="mt-6">
      <CardContent className="pt-6">
         <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
            <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="organizer">Organizer</SelectItem>
                </SelectContent>
            </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Campus</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <TableRow key={user.uid} className={user.disabled ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{getInitials(user.name, user.email)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.name || 'No Name'}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                     {user.uid !== currentUser?.uid ? (
                      <Select
                        value={user.campus}
                        onValueChange={(newCampus) => handleCampusChange(user.uid, newCampus)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Select campus" />
                        </SelectTrigger>
                        <SelectContent>
                          {campuses.map(campus => (
                            <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{user.campus || 'N/A'}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'organizer' || user.role === 'superadmin' ? 'default' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.disabled ? 'destructive' : 'outline'} className={user.disabled ? '' : 'text-green-500 border-green-500'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.uid !== currentUser?.uid ? (
                      <>
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {user.role !== 'superadmin' && (
                                <>
                                    <DropdownMenuItem onClick={() => handleToggleDisable(user)}>
                                        <UserX className="mr-2 h-4 w-4" />
                                        <span>{user.disabled ? 'Enable' : 'Disable'} Account</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Change Role</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => handleRoleChange(user.uid, 'student')}>
                                        Set as Student
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleRoleChange(user.uid, 'organizer')}>
                                        Set as Organizer
                                    </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                               <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Delete User</span>
                                  </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>Delete User?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the user "{user.name || user.email}". This action cannot be undone.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDelete(user)} className="bg-destructive hover:bg-destructive/90">
                                        Delete User
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                          </DropdownMenuContent>
                      </DropdownMenu>
                      </>
                    ) : (
                         <span className="text-sm text-muted-foreground">
                           This is you
                         </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                        No users found.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
