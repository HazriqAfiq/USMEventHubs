

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, deleteDoc, updateDoc, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Button } from './ui/button';
import { Trash2, UserX, Shield, UserPlus } from 'lucide-react';
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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import CreateUserForm from './CreateUserForm';


export default function AdminUserTable() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user: currentUser, userProfile: adminProfile, isAdmin, loading: authLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'organizer' | 'student' | 'pending-organizer'>('all');
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);

  useEffect(() => {
    if (authLoading || !isAdmin || !adminProfile?.campus) {
      if (!authLoading) setLoading(false);
      return;
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('campus', '==', adminProfile.campus));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const usersData: UserProfile[] = [];
      querySnapshot.forEach((doc) => {
        usersData.push(doc.data() as UserProfile);
      });
      setUsers(usersData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching campus users: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authLoading, isAdmin, adminProfile]);

  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Admins cannot see superadmins or other admins
      if (user.role === 'superadmin' || user.role === 'admin') return false;

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
    const userToUpdate = users.find(u => u.uid === userId);
    if (!userToUpdate) return;

    const batch = writeBatch(db);
    const userDocRef = doc(db, 'users', userId);

    try {
        batch.update(userDocRef, { role: newRole });

        if (userToUpdate.role === 'pending-organizer' && newRole === 'organizer') {
            const appsRef = collection(db, 'organizer_applications');
            const q = query(appsRef, where('userId', '==', userId), where('status', '==', 'pending'));
            const appSnapshot = await getDocs(q);

            if (!appSnapshot.empty) {
                const appDoc = appSnapshot.docs[0];
                batch.update(appDoc.ref, { status: 'approved', rejectionReason: '' });
                toast({ title: 'Application Auto-Approved', description: `${userToUpdate.name}'s pending request was approved.`});
            }
        }
        
        await batch.commit();
        toast({ title: 'Role Updated', description: `User role has been changed to ${newRole}.` });

    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    }
  };

  const handleToggleDisable = async (userToUpdate: UserProfile) => {
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

  if (loading || authLoading) {
    return (
      <div className="mt-6 space-y-4">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
         <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
            <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
            />
            <div className="flex gap-2 w-full sm:w-auto">
               <Dialog open={isCreateUserOpen} onOpenChange={setIsCreateUserOpen}>
                <DialogTrigger asChild>
                   <Button>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Create User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>
                      Create a new account for your campus. The campus will be set to {adminProfile?.campus}.
                    </DialogDescription>
                  </DialogHeader>
                  <CreateUserForm onSuccess={() => setIsCreateUserOpen(false)} />
                </DialogContent>
              </Dialog>
              <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="organizer">Organizer</SelectItem>
                      <SelectItem value="pending-organizer">Pending Organizer</SelectItem>
                  </SelectContent>
              </Select>
            </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
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
                    <Badge variant={user.role === 'organizer' ? 'default' : (user.role === 'pending-organizer' ? 'outline' : 'secondary')}
                      className={user.role === 'pending-organizer' ? 'text-yellow-400 border-yellow-400/50' : ''}
                    >
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.disabled ? 'destructive' : 'outline'} className={user.disabled ? '' : 'text-green-500 border-green-500'}>
                        {user.disabled ? 'Disabled' : 'Active'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {user.uid === currentUser?.uid ? (
                         <span className="text-sm text-muted-foreground">This is you</span>
                    ) : (
                      <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">Actions</Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                              <DropdownMenuLabel>Manage User</DropdownMenuLabel>
                              <DropdownMenuSeparator />
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
                          </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                        No users found for your campus.
                    </TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

