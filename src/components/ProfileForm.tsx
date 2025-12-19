

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
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { getInitials } from '@/lib/utils';
import { Camera, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }).max(50, { message: 'Name cannot be longer than 50 characters.' }),
  email: z.string().email().optional(),
  photoURL: z.string().nullable().optional(),
  campus: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof formSchema>;

async function resizeImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const img = new Image();
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;

            if (width > height) {
                if (width > maxSize) {
                    height *= maxSize / width;
                    width = maxSize;
                }
            } else {
                if (height > maxSize) {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject('Could not get canvas context');
            
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL(file.type, 0.9));
        };
        img.onerror = reject;

        reader.onload = (e) => {
            if (e.target?.result) {
                img.src = e.target.result as string;
            } else {
                reject(new Error("FileReader failed to read file."));
            }
        };
        reader.readAsDataURL(file);
    });
}

export default function ProfileForm() {
    const { user, userProfile, loading } = useAuth();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: '', email: '', photoURL: null, campus: '' },
    });

    useEffect(() => {
        if (userProfile) {
            form.reset({
                name: userProfile.name || '',
                email: userProfile.email || '',
                photoURL: userProfile.photoURL || null,
                campus: userProfile.campus || '',
            });
        }
    }, [userProfile, form]);
    
    const handleAvatarClick = () => {
        if (!isUploading) fileInputRef.current?.click();
    }

    const handleImageUpload = async (file: File): Promise<string> => {
        if (!user) throw new Error("User not authenticated.");

        const filePath = `profile-pictures/${user.uid}/profile.jpg`;
        const storageRef = ref(storage, filePath);
        
        const resizedDataUrl = await resizeImage(file, 200);
        
        await uploadString(storageRef, resizedDataUrl, 'data_url');
        return getDownloadURL(storageRef);
    }
    
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        
        setIsUploading(true);
        try {
            const downloadURL = await handleImageUpload(file);
            form.setValue('photoURL', downloadURL, { shouldValidate: true, shouldDirty: true });
            toast({ title: 'Avatar updated', description: 'Click "Save Changes" to apply.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Upload Failed', description: error.message || 'Could not process your image.' });
        } finally {
            setIsUploading(false);
        }
    }

    async function onSubmit(data: ProfileFormValues) {
        if (!user || !userProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in.' });
            return;
        }
        
        setIsSubmitting(true);
        const userDocRef = doc(db, 'users', user.uid);
        
        try {
            const updateData: { name: string, campus?: string, photoURL?: string | null } = { 
                name: data.name,
                campus: data.campus
            };
            
            // Only include photoURL in the update if it has actually changed.
            if (data.photoURL !== userProfile.photoURL) {
                updateData.photoURL = data.photoURL;
            }

            if (data.name !== userProfile.name || data.photoURL !== userProfile.photoURL || data.campus !== userProfile.campus) {
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

                toast({ title: 'Profile Updated', description: 'Your information has been successfully updated.' });
                form.reset(form.getValues());
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update your profile.' });
        } finally {
             setIsSubmitting(false);
        }
    }

    if (loading || !userProfile) {
        return (
             <Card>
                <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
                <CardContent className="space-y-8">
                    <div className="flex flex-col items-center space-y-4"><Skeleton className="h-24 w-24 rounded-full" /><Skeleton className="h-4 w-48" /></div>
                    <div className="space-y-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                </CardContent>
            </Card>
        )
    }

    const formIsDirty = form.formState.isDirty;

    return (
        <Card>
            <CardHeader><CardTitle>Personal Information</CardTitle></CardHeader>
            <CardContent>
                <div className="flex flex-col items-center space-y-4 mb-8">
                     <div className="relative group">
                        <Avatar className="h-24 w-24 border-2 border-primary">
                            <AvatarImage src={form.watch('photoURL') || undefined} />
                            <AvatarFallback className="text-3xl">{getInitials(userProfile?.name, userProfile?.email)}</AvatarFallback>
                        </Avatar>
                        <button onClick={handleAvatarClick} disabled={isUploading} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-70 disabled:cursor-not-allowed">
                            {isUploading ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<Camera className="h-8 w-8 text-white" />)}
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" disabled={isUploading} />
                     </div>
                     <p className="text-sm text-muted-foreground">Click the image to upload a new one.</p>
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
                          name="campus"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-white">Campus</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select your campus" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {campuses.map(campus => (
                                    <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>This helps us recommend relevant events.</FormDescription>
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
                                        <Input disabled {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormDescription>Your email address cannot be changed.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" disabled={isSubmitting || !formIsDirty || isUploading}>
                                {isSubmitting ? 'Saving...' : 'Save Changes'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
