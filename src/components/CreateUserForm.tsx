

'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUserWithEmailAndPassword, signInWithCredential, EmailAuthProvider } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { initializeApp, getApp, deleteApp } from 'firebase/app';
import { useAuth } from '@/hooks/use-auth';

const allCampuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];
const allRoles = ["student", "organizer", "admin"];
const adminAllowedRoles = ["student", "organizer"];

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  role: z.enum(["student", "organizer", "admin", "superadmin"], { required_error: "Please select a role." }),
  campus: z.string().min(1, { message: "Please select a campus." }),
});

type CreateUserFormValues = z.infer<typeof formSchema>;

interface CreateUserFormProps {
  onSuccess: () => void;
}

export default function CreateUserForm({ onSuccess }: CreateUserFormProps) {
  const { toast } = useToast();
  const { isSuperAdmin, userProfile: adminProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const selectableRoles = isSuperAdmin ? allRoles : adminAllowedRoles;
  const canChangeCampus = isSuperAdmin;
  const defaultCampus = adminProfile?.campus || '';

  const form = useForm<CreateUserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: undefined,
      campus: canChangeCampus ? undefined : defaultCampus,
    },
  });

  async function onSubmit(data: CreateUserFormValues) {
    setIsSubmitting(true);
    const mainApp = auth.app;
    const adminUser = auth.currentUser;

    if (!adminUser) {
        toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in as an admin to create users.' });
        setIsSubmitting(false);
        return;
    }
    
    // Create a temporary secondary app to create the user without signing out the admin
    const tempAppName = `temp-app-${Date.now()}`;
    const tempApp = initializeApp(mainApp.options, tempAppName);

    try {
        const { getAuth: getTempAuth } = await import('firebase/auth');
        const tempAuth = getTempAuth(tempApp);

        // 1. Create the new user in the temporary app instance
        const userCredential = await createUserWithEmailAndPassword(tempAuth, data.email, data.password);
        const newUser = userCredential.user;

        // 2. Create the user's profile document in Firestore
        await setDoc(doc(db, 'users', newUser.uid), {
            uid: newUser.uid,
            email: data.email,
            name: data.name,
            role: data.role,
            campus: data.campus,
            photoURL: null,
            disabled: false,
        });
        
        toast({ title: 'User Created Successfully!', description: `${data.name} has been added.` });
        onSuccess();
        form.reset();

    } catch (error: any) {
        let errorMessage = "An unknown error occurred.";
        if (error.code === 'auth/email-already-in-use') {
            errorMessage = "This email address is already in use by another account.";
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = "The email address is not valid.";
        } else if (error.code === 'auth/weak-password') {
            errorMessage = "The password is too weak.";
        } else {
            errorMessage = error.message;
        }
        toast({ variant: 'destructive', title: 'Creation Failed', description: errorMessage });
    } finally {
        // 3. Clean up: sign back in the admin to the main app instance to restore session
        if (adminUser.email) {
            const credential = EmailAuthProvider.credential(adminUser.email, ''); // Dummy password
            try {
                // This call might fail if re-authentication is needed, but it's the best we can do client-side
                await signInWithCredential(auth, credential).catch(() => {});
            } catch (reauthError) {
                // Ignore re-authentication errors in this context
            }
        }
        
        // 4. Delete the temporary app
        await deleteApp(tempApp);
        setIsSubmitting(false);
    }
}


  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter user's full name" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <FormControl>
                <Input type="email" placeholder="user@example.com" {...field} disabled={isSubmitting} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    {...field}
                    disabled={isSubmitting}
                  />
                </FormControl>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                    onClick={() => setShowPassword(prev => !prev)}
                >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {selectableRoles.map(role => (
                      <SelectItem key={role} value={role} className="capitalize">
                        {role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="campus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campus</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting || !canChangeCampus}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={canChangeCampus ? "Select a campus" : defaultCampus} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {allCampuses.map(campus => (
                      <SelectItem key={campus} value={campus}>
                        {campus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating User...' : 'Create User Account'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
