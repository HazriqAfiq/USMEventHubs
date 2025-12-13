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
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot be longer than 50 characters.' }),
  email: z.string().email().optional(),
  photoURL: z.string().nullable().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

export default function ProfileForm() {
    const { user, userProfile, loading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            email: '',
            photoURL: null,
        }
    });

    useEffect(() => {
        if (userProfile) {
            form.reset({
                name: userProfile.name || '',
                email: userProfile.email || '',
                photoURL: userProfile.photoURL || null,
            });
        }
    }, [userProfile, form]);
    
    const handleAvatarClick = () => {
        if (!isUploadingImage) {
            fileInputRef.current?.click();
        }
    }
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 1 * 1024 * 1024) { // 1MB limit
            toast({
                variant: 'destructive',
                title: 'File Too Large',
                description: 'Please select an image smaller than 1MB.',
            });
            return;
        }

        setIsUploadingImage(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        try {
            const dataUri = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 200;
                    const MAX_HEIGHT = 200;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) return reject(new Error('Could not get canvas context'));
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL(file.type, 0.9)); // Get data URI
                };

                img.onerror = reject;

                reader.onload = (e) => {
                    img.src = e.target?.result as string;
                };
                reader.readAsDataURL(file);
            });
            
            const updateData = { photoURL: dataUri };
            
            await updateDoc(userDocRef, updateData)
            .catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: { photoURL: '...data URI...' },
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);
                throw serverError; // re-throw to be caught by outer catch
            });

            form.setValue('photoURL', dataUri);
            toast({
                title: 'Profile Picture Updated!',
                description: 'Your new picture has been saved.',
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Upload Failed',
                description: error.message || 'Could not save your image.',
            });
        } finally {
            setIsUploadingImage(false);
        }
    }

    async function onSubmit(data: ProfileFormValues) {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }

        // Only update if the name is different
        if (data.name === userProfile.name) {
            return;
        }

        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        const updateData = { name: data.name };

        try {
            await updateDoc(userDocRef, updateData)
            .catch((serverError) => {
                 const permissionError = new FirestorePermissionError({
                    path: userDocRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);
                throw serverError;
            });

            toast({
                title: 'Profile Updated',
                description: 'Your name has been successfully updated.',
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message || 'Could not update your profile.',
            });
        } finally {
             setIsSubmitting(false);
        }
    }

    if (loading || !userProfile) {
        return (
             <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex flex-col items-center space-y-4">
                        <Skeleton className="h-24 w-24 rounded-full" />
                        <Skeleton className="h-4 w-48" />
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const formIsDirty = form.formState.isDirty;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center space-y-4 mb-8">
                     <div className="relative group">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={form.watch('photoURL') || undefined} />
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
                            accept="image/png, image/jpeg"
                            disabled={isUploadingImage}
                        />
                     </div>
                     <p className="text-sm text-muted-foreground">Click the image to upload a new one (max 1MB).</p>
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
                            <Button type="submit" disabled={isSubmitting || !formIsDirty}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
