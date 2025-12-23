

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Trash2, Upload, Loader2, Check, ChevronsUpDown, Video, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject, uploadString } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useState, useRef, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Event } from '@/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { v4 as uuidv4 } from 'uuid';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from './ui/command';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Info } from 'lucide-react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from './ui/dialog';

const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"] as const;

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string({ required_error: 'A start time is required.' }).min(1, { message: 'Start time is required.' }),
  endTime: z.string({ required_error: 'An end time is required.' }).min(1, { message: 'End time is required.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string({ required_error: 'Please select an event image.' }).min(1, { message: 'Image is required.' }),
  videoUrl: z.string().optional(),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  price: z.coerce.number().min(0).optional(),
  isFree: z.enum(['free', 'paid']).default('free'),
  eventType: z.enum(['online', 'physical'], { required_error: 'Please select an event type.' }),
  groupLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  qrCodeUrl: z.string().optional(),
  eligibleCampuses: z.array(z.string()).min(1, { message: 'Please select at least one eligible campus.' }),
  conductingCampus: z.string(),
  status: z.enum(['pending', 'approved', 'rejected', 'pending-update']).optional(),
  rejectionReason: z.string().optional(),
  updateReason: z.string().optional(),
}).refine(data => {
    if (data.isFree === 'paid') {
        return data.price !== undefined && data.price >= 1;
    }
    return true;
}, {
    message: 'Price must be at least RM1.00 for paid events.',
    path: ['price'],
}).refine(data => {
    if (data.isFree === 'paid') {
        return data.qrCodeUrl && data.qrCodeUrl.length > 0;
    }
    return true;
}, {
    message: 'Please upload a QR code for paid events.',
    path: ['qrCodeUrl'],
}).refine((data) => {
    if (!data.startTime || !data.endTime) return true; // Don't validate if either is missing
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;

    return endTimeInMinutes > startTimeInMinutes;
}, {
    message: 'End time must be after start time.',
    path: ['endTime'],
}).refine((data) => {
    if (!data.startTime || !data.endTime) return true; // Don't validate if either is missing
    const [startHours, startMinutes] = data.startTime.split(':').map(Number);
    const [endHours, endMinutes] = data.endTime.split(':').map(Number);
    
    const startTimeInMinutes = startHours * 60 + startMinutes;
    const endTimeInMinutes = endHours * 60 + endMinutes;
    
    // Check if end time is at least 15 minutes after start time
    return (endTimeInMinutes - startTimeInMinutes) >= 15;
}, {
    message: 'Event must be at least 15 minutes long.',
    path: ['endTime'],
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  event?: Event;
  isEditable?: boolean;
}

const getMalaysiaTimeNow = () => {
    const now = new Date();
    const myTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kuala_Lumpur' }));
    return myTime;
}

const isTodayInMalaysia = (date: Date) => {
    const today = getMalaysiaTimeNow();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
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

export default function EventForm({ event, isEditable = true }: EventFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { user, userProfile, isOrganizer, isSuperAdmin } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [updateReason, setUpdateReason] = useState('');
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  
  const isEditMode = !!event;
  
  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && event ? {
      ...event,
      isFree: event.isFree ? 'free' : 'paid',
      date: event.date?.toDate(),
      groupLink: event.groupLink || '',
      qrCodeUrl: event.qrCodeUrl || '',
      videoUrl: event.videoUrl || '',
      price: event.price ?? 1,
      eligibleCampuses: event.eligibleCampuses || [],
      conductingCampus: event.conductingCampus,
      status: event.status,
      rejectionReason: event.rejectionReason,
      updateReason: event.updateReason || '',
    } : {
      title: '',
      description: '',
      date: undefined,
      startTime: '',
      endTime: '',
      imageUrl: '',
      videoUrl: '',
      location: '',
      isFree: 'free',
      price: 1,
      eventType: undefined,
      groupLink: '',
      qrCodeUrl: '',
      eligibleCampuses: [],
      conductingCampus: userProfile?.campus || '',
      status: 'pending',
    },
  });

  const canEdit = useMemo(() => {
    if (!isEditable) return false;
    if (isSuperAdmin) return true;
    if (isOrganizer && event) {
      // Organizers can edit their own events, regardless of status (except past events)
      return true;
    }
    if (isOrganizer && !isEditMode) return true;
    return false;
  }, [isEditable, isSuperAdmin, isOrganizer, event, isEditMode]);
  
  // Set conducting campus when user profile loads for a new form
  useEffect(() => {
    if (!isEditMode && userProfile?.campus) {
      form.setValue('conductingCampus', userProfile.campus, { shouldValidate: true });
    }
  }, [userProfile, isEditMode, form]);

  const handleImageUpload = async (file: File, type: 'event' | 'qr'): Promise<string> => {
    if (!user) throw new Error("User not authenticated for upload.");

    let path: string;
    const eventIdForPath = isEditMode ? event.id : form.getValues('title').replace(/\s+/g, '-').toLowerCase() + '-' + uuidv4();

    if (type === 'event') {
        path = `event-images/${eventIdForPath}/event-image.jpg`;
    } else {
        path = `qr-codes/${eventIdForPath}/qr-code.jpg`;
    }

    const storageRef = ref(storage, path);
    const resizedDataUrl = await resizeImage(file, type === 'event' ? 800 : 400);
    
    // Using uploadString for data URLs
    const uploadTask = await uploadString(storageRef, resizedDataUrl, 'data_url');
    return getDownloadURL(uploadTask.ref);
  };
  
  const handleVideoUpload = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        if (!user) return reject("User not authenticated for upload.");
        
        const eventIdForPath = isEditMode ? event.id : form.getValues('title').replace(/\s+/g, '-').toLowerCase() + '-' + uuidv4();
        const path = `event-videos/${eventIdForPath}/event-video.mp4`;
        const storageRef = ref(storage, path);

        const uploadTask = uploadBytesResumable(storageRef, file);

        uploadTask.on('state_changed', 
            (snapshot) => {
                // Optional: handle progress
            }, 
            (error) => {
                console.error("Video upload failed:", error);
                reject(error);
            }, 
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then(downloadURL => {
                    resolve(downloadURL);
                });
            }
        );
    });
  };

  const processSubmit = async (data: EventFormValues, reason?: string) => {
    if (!user || !userProfile) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
        const eventData: any = {
            ...data,
            isFree: data.isFree === 'free',
            price: data.isFree === 'paid' ? data.price : 0,
            qrCodeUrl: data.isFree === 'paid' ? data.qrCodeUrl : '',
        };

        if (isEditMode && event) {
             const docRef = doc(db, 'events', event.id);
             
             if (isOrganizer) {
                // Determine the correct next status based on the current status
                if (event.status === 'approved') {
                    eventData.status = 'pending-update';
                    eventData.updateReason = reason;
                } else if (event.status === 'rejected') {
                    // When resubmitting a rejected event, it goes back to a pending state.
                    // Check if it was ever approved before to decide if it's a new pending or an updated pending.
                    // A simple way is to check if it was previously in 'pending-update' or has an updateReason.
                    const wasAnUpdate = event.updateReason;
                    eventData.status = wasAnUpdate ? 'pending-update' : 'pending';
                    eventData.updateReason = wasAnUpdate ? reason : '';
                } else if (event.status === 'pending-update') {
                    // If it's already a pending-update, keep it that way but update the reason
                    eventData.status = 'pending-update';
                    eventData.updateReason = reason;
                } else {
                    // For 'pending' status, it just stays 'pending'.
                    eventData.status = 'pending';
                }
                eventData.rejectionReason = ''; // Always clear rejection reason on resubmit.
             }
            
            await updateDoc(docRef, eventData)
              .catch((serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: docRef.path,
                    operation: 'update',
                    requestResourceData: eventData,
                }, serverError);
                errorEmitter.emit('permission-error', permissionError);
                throw serverError;
              });

            toast({ title: 'Event Updated!', description: `"${data.title}" has been submitted for re-approval.` });
            router.push(isSuperAdmin ? '/superadmin' : '/organizer');
        } else {
            if (!userProfile.campus) {
              throw new Error("Organizer's campus is not set. Cannot create event.");
            }
            const collectionRef = collection(db, 'events');
            await addDoc(collectionRef, { 
              ...eventData, 
              viewCount: 0,
              conductingCampus: userProfile.campus,
              createdAt: serverTimestamp(), 
              organizerId: user.uid,
              status: isSuperAdmin ? 'approved' : 'pending', // Auto-approve for superadmins
            }).catch((serverError) => {
               const permissionError = new FirestorePermissionError({
                  path: collectionRef.path,
                  operation: 'create',
                  requestResourceData: eventData,
              }, serverError);
              errorEmitter.emit('permission-error', permissionError);
              throw serverError;
            });

            toast({ title: isSuperAdmin ? 'Event Created!' : 'Event Submitted!', description: isSuperAdmin ? `"${data.title}" is now live.` : `"${data.title}" has been submitted for approval.` });
            handleReset();
        }
    } catch (error: any) {
        console.error("Submission failed:", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
        setIsReasonDialogOpen(false);
        setUpdateReason('');
    }
  }

  function onSubmit(data: EventFormValues) {
    // Open reason dialog for organizers editing approved or rejected events.
    if (isEditMode && isOrganizer && (event?.status === 'approved' || event?.status === 'rejected' || event?.status === 'pending-update')) {
        setIsReasonDialogOpen(true);
    } else {
        processSubmit(data);
    }
  }
  
  const handleConfirmUpdate = () => {
    if (updateReason.trim().length < 10) {
        toast({
            variant: 'destructive',
            title: 'Reason is required',
            description: 'Please briefly explain what you changed (min. 10 characters).',
        });
        return;
    }
    const data = form.getValues();
    processSubmit(data, updateReason);
  }

  const [uploadProgress, setUploadProgress] = useState<{ type: 'event' | 'qr' | 'video' | null, loading: boolean }>({ type: null, loading: false });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'event' | 'qr' | 'video') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadProgress({ type, loading: true });

    let uploadPromise: Promise<string>;

    if (type === 'video') {
        uploadPromise = handleVideoUpload(file);
    } else {
        uploadPromise = handleImageUpload(file, type);
    }

    uploadPromise
      .then(downloadURL => {
        let fieldToUpdate: 'imageUrl' | 'qrCodeUrl' | 'videoUrl';
        if (type === 'event') fieldToUpdate = 'imageUrl';
        else if (type === 'qr') fieldToUpdate = 'qrCodeUrl';
        else fieldToUpdate = 'videoUrl';
        
        form.setValue(fieldToUpdate, downloadURL, { shouldValidate: true, shouldDirty: true });
        toast({ title: `${type.charAt(0).toUpperCase() + type.slice(1)} uploaded!` });
      })
      .catch(error => {
        console.error("Upload failed:", error);
        toast({ variant: 'destructive', title: 'Upload Failed', description: error.message });
      })
      .finally(() => {
        setUploadProgress({ type: null, loading: false });
      });
  };
  
  const handleReset = () => {
    form.reset({
        title: '',
        description: '',
        date: undefined,
        startTime: '',
        endTime: '',
        imageUrl: '',
        videoUrl: '',
        location: '',
        isFree: 'free',
        price: 1,
        eventType: undefined,
        groupLink: '',
        qrCodeUrl: '',
        eligibleCampuses: [],
        conductingCampus: userProfile?.campus || '',
        status: 'pending',
    });
  }

  const isPaid = form.watch('isFree') === 'paid';
  const selectedDate = form.watch('date');
  const previewImage = form.watch('imageUrl');
  const previewQr = form.watch('qrCodeUrl');
  const previewVideo = form.watch('videoUrl');
  const getCurrentTime = () => format(getMalaysiaTimeNow(), 'HH:mm');
  const isUploading = uploadProgress.loading;

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
          {event?.status === 'rejected' && isOrganizer && (
              <Alert variant="destructive">
                  <Info className="h-4 w-4" />
                  <AlertTitle>Event Rejected</AlertTitle>
                  <AlertDescription>
                  Reason: {event.rejectionReason || 'No reason provided.'}
                  <p className="mt-2 text-xs">You can edit the details below and re-submit the event for approval.</p>
                  </AlertDescription>
              </Alert>
          )}
          {event?.status === 'approved' && isOrganizer && (
              <Alert variant="default" className="bg-blue-500/10 border-blue-500/30 text-blue-300">
                  <Info className="h-4 w-4 text-blue-400" />
                  <AlertTitle>Approved Event</AlertTitle>
                  <AlertDescription>
                      This event is live. Any edits will send it back for re-approval by a superadmin.
                  </AlertDescription>
              </Alert>
          )}
          <fieldset disabled={!canEdit || isSubmitting} className="group">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Event Title</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Annual Tech Summit" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="conductingCampus"
                  render={({ field }) => (
                    <FormItem>
                        <FormLabel className="text-white">Conducting Campus</FormLabel>
                        <FormControl>
                            <div className="relative">
                              <Input value={field.value} disabled />
                              <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            </div>
                        </FormControl>
                        <FormDescription>
                            This is automatically set to your profile's campus and cannot be changed.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-white">Event Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={'outline'}
                              className={cn('w-full pl-3 text-left font-normal group-disabled:cursor-not-allowed group-disabled:opacity-50',!field.value && 'text-muted-foreground')}
                            >
                              {field.value ? format(field.value, 'PPP') : (<span>Pick a date</span>)}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            today={getMalaysiaTimeNow()}
                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                      control={form.control}
                      name="startTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} min={selectedDate && isTodayInMalaysia(selectedDate) ? getCurrentTime() : undefined}/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-white">End Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="isFree"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-white">Price</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="free" /></FormControl>
                              <FormLabel className="font-normal text-white">Free</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="paid" /></FormControl>
                              <FormLabel className="font-normal text-white">Paid</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="eventType"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel className="text-white">Event Type</FormLabel>
                        <FormControl>
                          <RadioGroup onValueChange={field.onChange} value={field.value} className="flex items-center space-x-4">
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="online" /></FormControl>
                              <FormLabel className="font-normal text-white">Online</FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-2 space-y-0">
                              <FormControl><RadioGroupItem value="physical" /></FormControl>
                              <FormLabel className="font-normal text-white">Physical</FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                {isPaid && (
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-white">Amount (RM)</FormLabel>
                            <FormControl>
                            <Input type="number" placeholder="e.g., 1.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormItem>
                      <FormLabel className="text-white">Payment QR Code ( Square Format )</FormLabel>
                      <FormControl>
                        <div onClick={() => qrInputRef.current?.click()} className={cn("aspect-square w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center", canEdit && "cursor-pointer group-disabled:cursor-not-allowed group-disabled:opacity-50")}>
                          <input type="file" ref={qrInputRef} onChange={(e) => handleFileChange(e, 'qr')} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={!canEdit || (isUploading && uploadProgress.type === 'qr')}/>
                          {previewQr ? (<Image src={previewQr} alt="QR code preview" fill style={{objectFit: 'contain'}} />) : (<span>Click to upload QR</span>)}
                          {canEdit && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              {(isUploading && uploadProgress.type === 'qr') ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<div className='text-center text-white'><Upload className="h-8 w-8 mx-auto" /><p>Upload QR</p></div>)}
                          </div>)}
                        </div>
                      </FormControl>
                      <FormMessage>{form.formState.errors.qrCodeUrl?.message}</FormMessage>
                    </FormItem>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Location</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Virtual or Specific Venue" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="groupLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-white">Community Group Link (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., https://chat.whatsapp.com/..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="space-y-4 flex flex-col">
                <FormItem>
                  <FormLabel className="text-white">Event Image</FormLabel>
                  <FormControl>
                    <div onClick={() => imageInputRef.current?.click()} className={cn("aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center", canEdit && "cursor-pointer group-disabled:cursor-not-allowed group-disabled:opacity-50")}>
                      <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, 'event')} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={!canEdit || (isUploading && uploadProgress.type === 'event')}/>
                      {previewImage ? (<Image src={previewImage} alt="Event image preview" fill style={{objectFit: 'cover'}} />) : (<span>Click to upload image</span>)}
                      {canEdit && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          {(isUploading && uploadProgress.type === 'event') ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<div className='text-center text-white'><Upload className="h-8 w-8 mx-auto" /><p>Upload Image</p></div>)}
                      </div>)}
                    </div>
                  </FormControl>
                  <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel className="text-white">Event Video (Optional)</FormLabel>
                  <FormControl>
                      <div onClick={() => videoInputRef.current?.click()} className={cn("aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center", canEdit && "cursor-pointer group-disabled:cursor-not-allowed group-disabled:opacity-50")}>
                          <input type="file" ref={videoInputRef} onChange={(e) => handleFileChange(e, 'video')} className="hidden" accept="video/mp4" disabled={!canEdit || (isUploading && uploadProgress.type === 'video')}/>
                          {previewVideo ? (<video src={previewVideo} className="w-full h-full object-cover" controls />) : (<div className='text-center'><Video className="h-8 w-8 mx-auto" /><p>Click to upload video</p></div>)}
                          {canEdit && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              {(isUploading && uploadProgress.type === 'video') ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<div className='text-center text-white'><Upload className="h-8 w-8 mx-auto" /><p>Upload Video</p></div>)}
                          </div>)}
                      </div>
                  </FormControl>
                  <FormMessage>{form.formState.errors.videoUrl?.message}</FormMessage>
                </FormItem>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex flex-col flex-grow">
                      <FormLabel className="text-white">Event Description</FormLabel>
                      <FormControl className="flex-grow">
                        <Textarea placeholder="Describe the event, what it's about, and who should attend." className="resize-none min-h-[150px] flex-grow" {...field}/>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="eligibleCampuses"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-white">Eligible Campuses</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "w-full justify-between",
                                !field.value?.length && "text-muted-foreground"
                              )}
                            >
                              <div className="truncate flex items-center gap-1">
                                  {field.value?.length ? `${field.value.length} selected` : "Select eligible campuses"}
                              </div>
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Search campus..." />
                            <CommandEmpty>No campus found.</CommandEmpty>
                            <CommandGroup>
                              {campuses.map((campus) => (
                                <CommandItem
                                  key={campus}
                                  onSelect={() => {
                                    const selected = field.value || [];
                                    const isSelected = selected.includes(campus);
                                    const newSelection = isSelected
                                      ? selected.filter((item) => item !== campus)
                                      : [...selected, campus];
                                    field.onChange(newSelection);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      (field.value || []).includes(campus)
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {campus}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Select which campuses are eligible to join this event.
                        {field.value?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {field.value.map(campus => (
                              <Badge key={campus} variant="secondary">{campus}</Badge>
                            ))}
                          </div>
                        )}
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-8">
                {!isEditMode && (<Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4"/>Clear Form</Button>)}
                {isEditMode && (<Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>)}
                {canEdit && (
                  <Button type="submit" disabled={isSubmitting || isUploading}>
                    {isSubmitting ? 'Submitting...' : (isEditMode ? 'Submit for Approval' : 'Submit for Approval')}
                  </Button>
                )}
            </div>
          </fieldset>
        </form>
      </Form>
      
      <Dialog open={isReasonDialogOpen} onOpenChange={setIsReasonDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reason for Update</DialogTitle>
                <DialogDescription>
                    Please briefly explain the changes you made. This will be shown to the superadmin during re-approval.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Textarea
                    placeholder="e.g., Updated event time and description to add more details."
                    value={updateReason}
                    onChange={(e) => setUpdateReason(e.target.value)}
                    disabled={isSubmitting}
                    className="min-h-[100px]"
                />
            </div>
            <DialogFooter>
                <Button variant="ghost" onClick={() => setIsReasonDialogOpen(false)} disabled={isSubmitting}>Cancel</Button>
                <Button onClick={handleConfirmUpdate} disabled={isSubmitting || updateReason.trim().length < 10}>
                    {isSubmitting ? 'Submitting...' : 'Confirm & Submit'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

