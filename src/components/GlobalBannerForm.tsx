
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Switch } from './ui/switch';
import { Skeleton } from './ui/skeleton';
import { Textarea } from './ui/textarea';

const formSchema = z.object({
  message: z.string().min(10, "Message must be at least 10 characters.").max(200, "Message cannot exceed 200 characters."),
  link: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  enabled: z.boolean().default(false),
});

type BannerFormValues = z.infer<typeof formSchema>;

export default function GlobalBannerForm() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: '',
      link: '',
      enabled: false,
    },
  });
  
  useEffect(() => {
    const bannerRef = doc(db, 'site_settings', 'global_banner');
    const unsubscribe = onSnapshot(bannerRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            form.reset({
                message: data.message || '',
                link: data.link || '',
                enabled: data.enabled || false,
            });
        }
        setIsLoading(false);
    }, () => setIsLoading(false));
    
    return () => unsubscribe();
  }, [form]);


  async function onSubmit(data: BannerFormValues) {
    setIsSubmitting(true);
    try {
        const bannerRef = doc(db, 'site_settings', 'global_banner');
        await setDoc(bannerRef, {
            ...data,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        toast({ title: 'Banner Updated', description: 'The global banner settings have been saved.' });
        form.reset(data); // Resets the dirty state
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
        <Card className="mt-6">
            <CardHeader>
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-3/4" />
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-10 w-full" />
                </div>
                <div className="flex items-center space-x-2">
                    <Skeleton className="h-6 w-12 rounded-full" />
                    <Skeleton className="h-4 w-24" />
                </div>
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-24" />
                </div>
            </CardContent>
        </Card>
    );
  }


  return (
    <Card className="mt-6">
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <CardHeader>
                    <CardTitle>Banner Settings</CardTitle>
                    <CardDescription>
                        Control the message, link, and visibility of the banner.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Banner Message</FormLabel>
                                <FormControl>
                                    <Textarea placeholder="e.g., System maintenance scheduled for this Sunday." {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="link"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Optional Link</FormLabel>
                                <FormControl>
                                    <Input placeholder="https://example.com/more-info" {...field} />
                                </FormControl>
                                <FormDescription>If provided, the entire banner will be a clickable link.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="enabled"
                        render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                <div className="space-y-0.5">
                                    <FormLabel className="text-base">
                                        Enable Banner
                                    </FormLabel>
                                    <FormDescription>
                                        Turn the global banner on or off.
                                    </FormDescription>
                                </div>
                                <FormControl>
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                            </FormItem>
                        )}
                    />
                </CardContent>
                <div className="flex justify-end p-6 pt-0">
                    <Button type="submit" disabled={isSubmitting || !form.formState.isDirty}>
                        {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </Form>
    </Card>
  );
}
