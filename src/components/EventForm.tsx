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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Trash2, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Event } from '@/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string({ required_error: 'A start time is required.' }),
  endTime: z.string({ required_error: 'An end time is required.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string({ required_error: 'Please select an event image.' }),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  price: z.coerce.number().min(0).optional(),
  isFree: z.enum(['free', 'paid']).default('free'),
  eventType: z.enum(['online', 'physical'], { required_error: 'Please select an event type.' }),
  groupLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
  qrCodeUrl: z.string().optional(),
}).refine(data => {
    if (data.isFree === 'paid') {
        return data.price !== undefined && data.price > 0;
    }
    return true;
}, {
    message: 'Price must be greater than 0 for paid events.',
    path: ['price'],
}).refine(data => {
    if (data.isFree === 'paid') {
        return data.qrCodeUrl && data.qrCodeUrl.length > 0;
    }
    return true;
}, {
    message: 'Please upload a QR code for paid events.',
    path: ['qrCodeUrl'],
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
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isUploadingQr, setIsUploadingQr] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);
  
  const isEditMode = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: isEditMode && event ? {
      ...event,
      isFree: event.isFree ? 'free' : 'paid',
      date: event.date?.toDate(),
    } : {
      title: '',
      description: '',
      location: '',
      isFree: 'free',
      price: 1,
      groupLink: '',
    },
  });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'event' | 'qr') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 2MB.' });
      return;
    }
    
    const setLoading = type === 'event' ? setIsUploadingImage : setIsUploadingQr;
    setLoading(true);

    try {
        const resizedDataUrl = await resizeImage(file, type === 'event' ? 800 : 400);
        const fieldToUpdate = type === 'event' ? 'imageUrl' : 'qrCodeUrl';
        form.setValue(fieldToUpdate, resizedDataUrl, { shouldValidate: true });
    } catch (error) {
        console.error("Image processing failed:", error);
        toast({
            variant: "destructive",
            title: "Image processing failed",
            description: "There was an error processing your image.",
        });
    } finally {
        setLoading(false);
    }
  }

  async function onSubmit(data: EventFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }
    setIsSubmitting(true);

    try {
        let imageUrl = data.imageUrl;
        let qrCodeUrl = data.qrCodeUrl;
        const docId = isEditMode && event ? event.id : doc(collection(db, 'events')).id;

        // Upload event image if it's a data URI
        if (imageUrl && imageUrl.startsWith('data:')) {
            const storageRef = ref(storage, `event-images/${docId}/event-image.jpg`);
            await uploadString(storageRef, imageUrl, 'data_url');
            imageUrl = await getDownloadURL(storageRef);
        }

        // Upload QR code if it's a paid event and the URL is a data URI
        if (data.isFree === 'paid' && qrCodeUrl && qrCodeUrl.startsWith('data:')) {
            const storageRef = ref(storage, `qr-codes/${docId}/qr-code.jpg`);
            await uploadString(storageRef, qrCodeUrl, 'data_url');
            qrCodeUrl = await getDownloadURL(storageRef);
        }

        const eventData = {
            ...data,
            imageUrl,
            qrCodeUrl: data.isFree === 'paid' ? qrCodeUrl : '',
            isFree: data.isFree === 'free',
            price: data.isFree === 'paid' ? data.price : 0,
        };

        if (isEditMode && event) {
            await updateDoc(doc(db, 'events', event.id), eventData);
            toast({ title: 'Event Updated!', description: `"${data.title}" has been updated.` });
            router.push('/admin');
        } else {
            await addDoc(collection(db, 'events'), { ...eventData, createdAt: serverTimestamp(), organizerId: user.uid });
            toast({ title: 'Event Created!', description: `"${data.title}" has been added.` });
            handleReset();
        }
    } catch (error: any) {
        console.error("Submission failed:", error);
        toast({ variant: 'destructive', title: 'Submission Failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const handleReset = () => {
    form.reset({
        title: '',
        description: '',
        date: undefined,
        startTime: '',
        endTime: '',
        imageUrl: undefined,
        location: '',
        isFree: 'free',
        price: 1,
        eventType: undefined,
        groupLink: '',
        qrCodeUrl: '',
    });
  }

  const isPaid = form.watch('isFree') === 'paid';
  const selectedDate = form.watch('date');
  const previewImage = form.watch('imageUrl');
  const previewQr = form.watch('qrCodeUrl');
  const getCurrentTime = () => format(getMalaysiaTimeNow(), 'HH:mm');
  const isUploading = isUploadingImage || isUploadingQr;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
        <fieldset disabled={!isEditable || isSubmitting} className="group">
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
                          <Input type="number" placeholder="e.g., 50.00" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || 0)} />
                          </FormControl>
                          <FormMessage />
                      </FormItem>
                      )}
                  />
                  <FormItem>
                    <FormLabel className="text-white">Payment QR Code ( Square Format )</FormLabel>
                    <FormControl>
                       <div onClick={() => qrInputRef.current?.click()} className={cn("aspect-square w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center", isEditable && "cursor-pointer group-disabled:cursor-not-allowed group-disabled:opacity-50")}>
                        <input type="file" ref={qrInputRef} onChange={(e) => handleFileChange(e, 'qr')} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={!isEditable || isUploadingQr}/>
                        {previewQr ? (<Image src={previewQr} alt="QR code preview" fill style={{objectFit: 'contain'}} />) : (<span>Click to upload QR</span>)}
                        {isEditable && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            {isUploadingQr ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<div className='text-center text-white'><Upload className="h-8 w-8 mx-auto" /><p>Upload QR</p></div>)}
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
                  <div onClick={() => imageInputRef.current?.click()} className={cn("aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center", isEditable && "cursor-pointer group-disabled:cursor-not-allowed group-disabled:opacity-50")}>
                    <input type="file" ref={imageInputRef} onChange={(e) => handleFileChange(e, 'event')} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={!isEditable || isUploadingImage}/>
                    {previewImage ? (<Image src={previewImage} alt="Event image preview" fill style={{objectFit: 'cover'}} />) : (<span>Click to upload image</span>)}
                    {isEditable && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        {isUploadingImage ? (<Loader2 className="h-8 w-8 text-white animate-spin" />) : (<div className='text-center text-white'><Upload className="h-8 w-8 mx-auto" /><p>Upload Image</p></div>)}
                    </div>)}
                  </div>
                </FormControl>
                <FormMessage>{form.formState.errors.imageUrl?.message}</FormMessage>
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
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-8">
              {!isEditMode && (<Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}><Trash2 className="mr-2 h-4 w-4"/>Clear Form</Button>)}
              {isEditMode && (<Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>Cancel</Button>)}
              <Button type="submit" disabled={isSubmitting || !isEditable || isUploading}>
                {isSubmitting ? (isEditMode ? 'Updating Event...' : 'Creating Event...') : (isEditMode ? 'Update Event' : 'Create Event')}
              </Button>
          </div>
        </fieldset>
      </form>
    </Form>
  );
}
