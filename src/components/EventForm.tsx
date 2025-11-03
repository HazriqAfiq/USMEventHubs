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
import { db, storage } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import Image from 'next/image';
import { Badge } from './ui/badge';
import { generateEventDescription } from '@/ai/flows/generate-event-description';
import { suggestEventKeywords } from '@/ai/flows/suggest-event-keywords';
import { Sparkles } from 'lucide-react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];


const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  image: z
    .any()
    .refine((files) => files?.length == 1, "Image is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      ".jpg, .jpeg, .png and .webp files are accepted."
    ),
  keywords: z.array(z.string()).default([]),
});

type EventFormValues = z.infer<typeof formSchema>;

export default function EventForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      keywords: [],
    },
  });

  const handleReset = () => {
    form.reset({
      title: '',
      description: '',
      date: undefined,
      image: undefined,
      keywords: []
    });
    setPreviewImage(null);
  }

  const handleGenerateDescription = async () => {
    const title = form.getValues('title');
    const date = form.getValues('date');
    if (!title || !date) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a title and date to generate a description.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateEventDescription({ title, date: date.toISOString() });
      form.setValue('description', result.description, { shouldValidate: true });
      toast({
        title: 'Description Generated!',
        description: 'The AI has written a description for your event.',
      });
    } catch (error) {
      console.error('AI description generation error:', error);
      toast({
        variant: 'destructive',
        title: 'AI Generation Failed',
        description: 'Could not generate a description at this time.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSuggestKeywords = async () => {
    const title = form.getValues('title');
    const description = form.getValues('description');
    if (!title || !description) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please provide a title and description to suggest keywords.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await suggestEventKeywords({ title, description });
      form.setValue('keywords', result.keywords, { shouldValidate: true });
      toast({
        title: 'Keywords Suggested!',
        description: 'The AI has suggested some relevant keywords.',
      });
    } catch (error) {
      console.error('AI keyword suggestion error:', error);
      toast({
        variant: 'destructive',
        title: 'AI Suggestion Failed',
        description: 'Could not suggest keywords at this time.',
      });
    } finally {
      setIsGenerating(false);
    }
  };


  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    try {
      const imageFile = data.image[0] as File;
      const storageRef = ref(storage, `event_images/${Date.now()}_${imageFile.name}`);
      const uploadResult = await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(uploadResult.ref);

      await addDoc(collection(db, 'events'), {
        title: data.title,
        date: data.date,
        description: data.description,
        imageUrl: imageUrl,
        keywords: data.keywords,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Event Created!',
        description: `"${data.title}" has been added successfully.`,
      });
      handleReset();
    } catch (error) {
      console.error('Submission error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not save the event. Please check the console for more details.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const imageRef = form.register("image");

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
                  <FormLabel>Event Title</FormLabel>
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
                  <FormLabel>Event Date</FormLabel>
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem className="flex flex-col flex-grow">
                  <FormLabel className="flex items-center justify-between">
                    <span>Event Description</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerateDescription}
                      disabled={isGenerating || !form.watch('title') || !form.watch('date')}
                      className="text-primary bg-primary/10 hover:bg-primary/20"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGenerating ? 'Generating...' : 'Generate with AI'}
                    </Button>
                  </FormLabel>
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
          </div>
          <div className="space-y-4">
             <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Image</FormLabel>
                   <FormControl>
                    <Input 
                      type="file" 
                      accept="image/png, image/jpeg"
                      {...imageRef}
                      onChange={(e) => {
                        field.onChange(e.target.files);
                        if (e.target.files && e.target.files[0]) {
                          setPreviewImage(URL.createObjectURL(e.target.files[0]));
                        } else {
                          setPreviewImage(null);
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="aspect-video w-full relative rounded-md overflow-hidden border bg-muted">
                {previewImage && (
                  <Image src={previewImage} alt="Event image preview" fill style={{objectFit: 'cover'}} />
                )}
            </div>

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between w-full">
                    <span>Keywords</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSuggestKeywords}
                      disabled={isGenerating || !form.watch('title') || !form.watch('description')}
                      className="text-primary bg-primary/10 hover:bg-primary/20"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {isGenerating ? 'Suggesting...' : 'Suggest with AI'}
                    </Button>
                  </FormLabel>
                  <FormControl>
                    <div className="rounded-md border min-h-[60px] p-2 flex flex-wrap gap-2 bg-background">
                      {field.value && field.value.length > 0 ? (
                        field.value.map((keyword, index) => (
                          <Badge key={`${keyword}-${index}`} variant="secondary">{keyword}</Badge>
                        ))
                      ) : (
                        <span className="text-sm text-muted-foreground p-2">No keywords suggested yet.</span>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={handleReset} disabled={isSubmitting}>
              <Trash2 className="mr-2 h-4 w-4"/>
              Clear Form
            </Button>
            <Button type="submit" disabled={isSubmitting || isGenerating}>
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
