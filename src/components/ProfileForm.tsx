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
import { useAuth } from '@/hooks/use-auth';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot be longer than 50 characters.' }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export default function ProfileForm() {
    const { user, userProfile, loading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
        },
    });

    useEffect(() => {
        if (userProfile) {
            form.reset({
                name: userProfile.name || '',
                email: userProfile.email || '',
            });
        }
    }, [userProfile, form]);

    async function onSubmit(data: ProfileFormValues) {
        if (!user) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        // Only update if the name has changed
        if (data.name === userProfile?.name) {
            toast({
                title: 'No Changes Detected',
                description: 'Your name is already up to date.',
            });
            return;
        }

        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        // Ensure we are only trying to update the 'name' field
        const updateData = { name: data.name };

        updateDoc(userDocRef, updateData)
            .then(() => {
                 toast({
                    title: 'Profile Updated',
                    description: 'Your name has been successfully updated.',
                });
            })
            .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);

                toast({
                    variant: 'destructive',
                    title: 'Update Failed',
                    description: serverError.message || 'Could not update your profile.',
                });
            })
            .finally(() => {
                 setIsSubmitting(false);
            });
    }

    if (loading) {
        return null;
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your full name" {...field} />
                                    </FormControl>
                                    <FormDescription>This is your public display name.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Email Address</FormLabel>
                                    <FormControl>
                                        <Input disabled {...field} />
                                    </FormControl>
                                    <FormDescription>Your email address cannot be changed.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
