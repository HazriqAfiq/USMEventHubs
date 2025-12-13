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
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot be longer than 50 characters.' }),
  email: z.string().email(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export default function ProfileForm() {
    const { user, userProfile, loading } = useAuth();
    const { toast } = useToast();
    const [isSubmittingName, setIsSubmittingName] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(formSchema),
        values: {
            name: userProfile?.name || '',
            email: userProfile?.email || '',
        },
    });
    
    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    }
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 2 * 1024 * 1024) { // 2MB limit
            toast({
                variant: 'destructive',
                title: 'File Too Large',
                description: 'Please select an image smaller than 2MB.',
            });
            return;
        }

        setIsUploadingImage(true);
        const storageRef = ref(storage, `profile-images/${user.uid}`);
        
        try {
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);
            
            const userDocRef = doc(db, 'users', user.uid);
            await updateDoc(userDocRef, { photoURL: downloadURL });

            toast({
                title: 'Profile Picture Updated!',
                description: 'Your new picture has been saved.',
            });

        } catch (error: any) {
             const userDocRef = doc(db, 'users', user.uid);
             const permissionError = new FirestorePermissionError({
                path: userDocRef.path,
                operation: 'update',
                requestResourceData: { photoURL: '...url...' },
            }, error);
            errorEmitter.emit('permission-error', permissionError);
            
            if (error.code?.includes('storage/unauthorized')) {
                 toast({
                    variant: 'destructive',
                    title: 'Storage Permission Denied',
                    description: 'Please check your Firebase Storage rules to allow uploads.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Upload Failed',
                    description: error.message || 'Could not upload your image or save the URL.',
                });
            }
        } finally {
            setIsUploadingImage(false);
        }
    }

    async function onSubmit(data: ProfileFormValues) {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        // Only proceed if the name has actually changed
        if (data.name === userProfile.name) {
            toast({
                title: 'No Changes Detected',
                description: 'Your name is already up to date.',
            });
            return;
        }

        setIsSubmittingName(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        const updateData = { name: data.name };

        try {
            await updateDoc(userDocRef, updateData);
            toast({
                title: 'Profile Updated',
                description: 'Your name has been successfully updated.',
            });
        } catch (serverError: any) {
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
        } finally {
             setIsSubmittingName(false);
        }
    }

    if (loading) {
        return null; // Don't render the form until auth state is confirmed
    }

    const isSubmitting = isSubmittingName || isUploadingImage;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center space-y-4 mb-8">
                     <div className="relative group">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={userProfile?.photoURL || undefined} />
                            <AvatarFallback className="text-3xl">
                                {getInitials(userProfile?.name, userProfile?.email)}
                            </AvatarFallback>
                        </Avatar>
                        <button 
                            onClick={handleAvatarClick} 
                            disabled={isUploadingImage}
                            className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed">
                            {isUploadingImage ? (
                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                            ): (
                                <Camera className="h-8 w-8 text-white" />
                            )}
                        </button>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange}
                            className="hidden" 
                            accept="image/png, image/jpeg, image/gif"
                            disabled={isUploadingImage}
                        />
                     </div>
                     <p className="text-sm text-muted-foreground">Click the image to upload a new one (max 2MB).</p>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-white">Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your full name" {...field} disabled={isSubmitting} />
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
                                {isSubmittingName ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
