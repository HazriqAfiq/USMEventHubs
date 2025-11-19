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
import { CalendarIcon, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc, collectionGroup } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { PlaceHolderImages, type ImagePlaceholder } from '@/lib/placeholder-images';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { Event } from '@/types';
import { useRouter } from 'next/navigation';

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  startTime: z.string({ required_error: 'A start time is required.' }),
  endTime: z.string({ required_error: 'An end time is required.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string({ required_error: 'Please select an image for the event.' }),
  location: z.string().min(3, { message: 'Location must be at least 3 characters.' }),
  price: z.coerce.number().min(0).optional(),
  isFree: z.enum(['free', 'paid']).default('free'),
  eventType: z.enum(['online', 'physical'], { required_error: 'Please select an event type.' }),
  registrationLink: z.string().url({ message: 'Please enter a valid URL.' }).optional().or(z.literal('')),
}).refine(data => {
    if (data.isFree === 'paid') {
        return data.price !== undefined && data.price > 0;
    }
    return true;
}, {
    message: 'Price must be greater than 0 for paid events.',
    path: ['price'],
});

type EventFormValues = z.infer<typeof formSchema>;

interface EventFormProps {
  event?: Event;
}

export default function EventForm({ event }: EventFormProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(event?.imageUrl || null);
  
  const isEditMode = !!event;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: event?.title || '',
      description: event?.description || '',
      location: event?.location || '',
      isFree: event?.isFree ? 'free' : 'paid',
      registrationLink: event?.registrationLink || '',
      price: event?.price || 1,
      eventType: event?.eventType,
      imageUrl: event?.imageUrl,
      date: event?.date?.toDate(),
      startTime: event?.startTime || '',
      endTime: event?.endTime || '',
    },
  });
  
  useEffect(() => {
    if (event) {
      form.reset({
        title: event.title,
        description: event.description,
        location: event.location,
        isFree: event.isFree ? 'free' : 'paid',
        price: event.price || 0,
        eventType: event.eventType,
        imageUrl: event.imageUrl,
        date: event.date?.toDate(),
        startTime: event.startTime,
        endTime: event.endTime,
        registrationLink: event.registrationLink || '',
      });
      setPreviewImage(event.imageUrl);
    }
  }, [event, form]);

  const isPaid = form.watch('isFree') === 'paid';

  const handleReset = () => {
    if (isEditMode) {
        // If in edit mode, reset to original event data
         if (event) {
            form.reset({
                title: event.title,
                description: event.description,
                location: event.location,
                isFree: event.isFree ? 'free' : 'paid',
                price: event.price || 0,
                eventType: event.eventType,
                imageUrl: event.imageUrl,
                date: event.date?.toDate(),
                startTime: event.startTime,
                endTime: event.endTime,
                registrationLink: event.registrationLink || '',
            });
            setPreviewImage(event.imageUrl);
        }
    } else {
        // If in create mode, reset to empty form
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
            registrationLink: '',
        });
        setPreviewImage(null);
    }
  }

  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    
    const eventData: any = {
        title: data.title,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        description: data.description,
        imageUrl: data.imageUrl,
        location: data.location,
        isFree: data.isFree === 'free',
        eventType: data.eventType,
        registrationLink: data.registrationLink,
      };
      if (data.isFree === 'paid') {
        eventData.price = data.price;
      } else {
        eventData.price = 0;
      }

    try {
      if (isEditMode && event) {
        const eventRef = doc(db, 'events', event.id);
        // Preserve existing registrations when updating
        eventData.registrations = event.registrations || [];
        await updateDoc(eventRef, eventData);

        toast({
          title: 'Event Updated!',
          description: `"${data.title}" has been updated successfully.`,
        });
        router.push('/admin');

      } else {
        eventData.createdAt = serverTimestamp();
        eventData.registrations = []; // Initialize with empty array
        const collectionRef = collection(db, 'events');
        const docRef = await addDoc(collectionRef, eventData);
        
        toast({
          title: 'Event Created!',
          description: `"${data.title}" has been added successfully.`,
        });
        handleReset();
      }
    } catch (error: any) {
        toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: error.message || `Could not ${isEditMode ? 'update' : 'save'} the event.`,
        });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 mt-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4 flex flex-col">
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
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
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
                        <Input type="time" {...field} />
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
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="free" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Free
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="paid" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Paid
                          </FormLabel>
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
                       <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex items-center space-x-4"
                      >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="online" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Online
                          </FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value="physical" />
                          </FormControl>
                          <FormLabel className="font-normal text-white">
                            Physical
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {isPaid && (
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
              name="description"
              render={({ field }) => (
                <FormItem className="flex flex-col flex-grow">
                  <FormLabel className="text-white">Event Description</FormLabel>
                  <FormControl className="flex-grow">
                    <Textarea
                      placeholder="Describe the event, what it's about, and who should attend."
                      className="resize-none h-full"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="registrationLink"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Registration Link</FormLabel>
                  <FormControl>
                    <Input placeholder="https://forms.gle/your-form-link" {...field} />
                  </FormControl>
                   <p className="text-xs text-muted-foreground mt-1">
                      Paste a link to your Google Form or other registration page. Leave blank to use built-in registration.
                    </p>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="space-y-4">
             <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Event Image</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      const selectedImage = PlaceHolderImages.find(img => img.imageUrl === value);
                      setPreviewImage(selectedImage?.imageUrl || null);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image for the event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PlaceHolderImages.map((image: ImagePlaceholder) => (
                        <SelectItem key={image.id} value={image.imageUrl}>
                          <div className="flex items-center gap-2">
                             <Image src={image.imageUrl} alt={image.description} width={32} height={32} className="h-8 w-8 object-cover rounded-sm" />
                            <span>{image.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="aspect-video w-full relative rounded-md overflow-hidden border bg-muted">
                {previewImage ? (
                  <Image src={previewImage} alt="Event image preview" fill style={{objectFit: 'cover'}} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">Select an image to see a preview</div>
                )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
            {!isEditMode && (
              <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
                <Trash2 className="mr-2 h-4 w-4"/>
                Clear Form
              </Button>
            )}
            {isEditMode && (
                 <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                    Cancel
                </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditMode ? 'Updating Event...' : 'Creating Event...') : (isEditMode ? 'Update Event' : 'Create Event')}
            </Button>
        </div>
      </form>
    </Form>
  );
}
