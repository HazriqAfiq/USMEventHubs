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
import { CalendarIcon, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { generateEventDescription } from '@/ai/flows/generate-event-description';
import { suggestEventKeywords } from '@/ai/flows/suggest-event-keywords';
import Image from 'next/image';
import { Badge } from './ui/badge';

const formSchema = z.object({
  title: z.string().min(3, { message: 'Title must be at least 3 characters.' }),
  date: z.date({ required_error: 'A date is required.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters.' }),
  imageUrl: z.string({ required_error: 'Please select an image.'}).url({ message: 'Please select a valid image.' }),
  imageHint: z.string(),
  keywords: z.array(z.string()).default([]),
});

type EventFormValues = z.infer<typeof formSchema>;

export default function EventForm() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      keywords: [],
    },
  });

  const handleGenerateDescription = async () => {
    const title = form.getValues('title');
    const date = form.getValues('date');
    if (!title || !date) {
      toast({
        variant: 'destructive',
        title: 'Title and Date required',
        description: 'Please enter a title and select a date before generating a description.',
      });
      return;
    }
    setIsGenerating(true);
    try {
      const result = await generateEventDescription({ title, date: format(date, 'PPP') });
      form.setValue('description', result.description, { shouldValidate: true });
      toast({
        title: 'Description Generated!',
        description: 'The AI has crafted a description for your event.',
      });
    } catch (error) {
      console.error('AI error:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: 'Could not generate a description at this time.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateKeywords = async () => {
    const title = form.getValues('title');
    const description = form.getValues('description');
    if (!title || !description) {
      toast({
        variant: 'destructive',
        title: 'Title and Description required',
        description: 'Please provide a title and description before generating keywords.',
      });
      return;
    }
    setIsGeneratingKeywords(true);
    try {
      const result = await suggestEventKeywords({ title, description });
      form.setValue('keywords', result.keywords, { shouldValidate: true });
      toast({
        title: 'Keywords Suggested!',
        description: 'The AI has suggested some keywords for your event.',
      });
    } catch (error) {
      console.error('AI keyword error:', error);
      toast({
        variant: 'destructive',
        title: 'Keyword Generation Failed',
        description: 'Could not suggest keywords at this time.',
      });
    } finally {
      setIsGeneratingKeywords(false);
    }
  };


  const handleReset = () => {
    form.reset({
      title: '',
      description: '',
      date: undefined,
      imageUrl: undefined,
      imageHint: undefined,
      keywords: []
    });
  }

  async function onSubmit(data: EventFormValues) {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...data,
        createdAt: serverTimestamp(),
      });
      toast({
        title: 'Event Created!',
        description: `"${data.title}" has been added successfully.`,
      });
      handleReset();
    } catch (error) {
      console.error('Firestore error:', error);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: 'Could not save the event to the database.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const selectedImage = PlaceHolderImages.find(p => p.imageUrl === form.watch('imageUrl'));

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
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Event Image</FormLabel>
                  <Select onValueChange={(value) => {
                    const img = PlaceHolderImages.find(p => p.imageUrl === value);
                    if (img) {
                      field.onChange(value);
                      form.setValue('imageHint', img.imageHint);
                    }
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an image for the event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PlaceHolderImages.map((image) => (
                        <SelectItem key={image.id} value={image.imageUrl}>
                          {image.description}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="aspect-video w-full relative rounded-md overflow-hidden border bg-muted">
                {selectedImage && (
                  <Image src={selectedImage.imageUrl} alt={selectedImage.description} fill style={{objectFit: 'cover'}} data-ai-hint={selectedImage.imageHint}/>
                )}
            </div>

            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center justify-between w-full">
                    <span>Keywords</span>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
