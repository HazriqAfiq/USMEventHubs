
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
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef } from 'react';
import { addDoc, collection, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { getDownloadURL, ref, uploadString } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Loader2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const formSchema = z.object({
  organizationDesc: z.string().min(20, { message: "Description must be at least 20 characters." }),
  socialLink: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal('')),
  proofUrl: z.string().min(1, { message: "Proof of legitimacy is required." }),
});

type RequestFormValues = z.infer<typeof formSchema>;

interface OrganizerRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

async function resizeImage(file: File, maxSize: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const img = document.createElement('img');
        
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

export default function OrganizerRequestDialog({ isOpen, onClose }: OrganizerRequestDialogProps) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organizationDesc: '',
      socialLink: '',
      proofUrl: '',
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const filePath = `organizer-applications/${user.uid}/proof-${uuidv4()}`;
    const storageRef = ref(storage, filePath);

    try {
        const resizedDataUrl = await resizeImage(file, 1024);
        await uploadString(storageRef, resizedDataUrl, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        form.setValue('proofUrl', downloadURL, { shouldValidate: true });
        toast({ title: "Proof uploaded successfully." });
    } catch (error: any) {
        console.error("Proof upload failed:", error);
        toast({ variant: "destructive", title: "Upload Failed", description: error.message });
    } finally {
        setIsUploading(false);
    }
  };

  const handleDialogClose = () => {
    if (isSubmitting) return;
    form.reset();
    onClose();
  };

  async function onSubmit(data: RequestFormValues) {
    if (!user || !userProfile || !userProfile.name) {
      toast({ variant: 'destructive', title: 'Error', description: 'You must be logged in and have a name set in your profile.' });
      return;
    }
    setIsSubmitting(true);
    try {
        // 1. Create the application document
        await addDoc(collection(db, 'organizer_applications'), {
            userId: user.uid,
            userName: userProfile.name,
            userEmail: userProfile.email,
            organizationName: userProfile.name, // Use user's name as the org name
            ...data,
            campus: userProfile.campus,
            status: 'pending',
            createdAt: serverTimestamp(),
        });
        
        // 2. Update user's role to 'pending-organizer'
        const userDocRef = doc(db, 'users', user.uid);
        await updateDoc(userDocRef, {
            role: 'pending-organizer'
        });
        
        toast({ title: 'Request Submitted!', description: 'Your application to become an organizer is now pending review.' });
        handleDialogClose();

    } catch (error: any) {
        console.error("Organizer application submission failed:", error);
        toast({ variant: "destructive", title: "Submission Failed", description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const proofPreview = form.watch('proofUrl');

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Organizer Application</DialogTitle>
          <DialogDescription>
            Fill out the details below to request to become an event organizer. Your full name will be used as the organization name.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
             <FormField
              control={form.control}
              name="organizationDesc"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Tell us about your organization or the events you plan to host..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="socialLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Social Media Link (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="https://instagram.com/yourclub" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="proofUrl"
              render={({ field }) => (
                <FormItem>
                    <FormLabel>Proof of Legitimacy</FormLabel>
                    <FormDescription>Upload a document, society registration, or past event photo.</FormDescription>
                    <FormControl>
                        <div onClick={() => proofInputRef.current?.click()} className={cn("aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center cursor-pointer", isUploading && "cursor-not-allowed opacity-50")}>
                           <input type="file" ref={proofInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp, application/pdf" disabled={isUploading}/>
                           {proofPreview ? (<Image src={proofPreview} alt="Proof preview" fill style={{objectFit: 'contain'}} />) : (<div className='text-center text-muted-foreground'><Upload className="h-8 w-8 mx-auto" /><p>Click to upload proof</p></div>)}
                           {isUploading && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>)}
                        </div>
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={handleDialogClose}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
