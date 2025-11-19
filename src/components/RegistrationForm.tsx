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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useState } from 'react';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  matricNo: z.string().min(5, { message: 'Matriculation number is required.' }),
  faculty: z.string().min(1, { message: 'Please select a faculty.' }),
  otherFaculty: z.string().optional(),
}).refine(data => {
    if (data.faculty === 'Other') {
        return !!data.otherFaculty && data.otherFaculty.length > 2;
    }
    return true;
}, {
    message: 'Please specify your faculty (must be at least 3 characters).',
    path: ['otherFaculty'],
});


type RegistrationFormValues = z.infer<typeof formSchema>;

interface RegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string, matricNo: string, faculty: string }) => void;
  isSubmitting: boolean;
}

const faculties = [
  "School of Biological Sciences",
  "School of Chemical Sciences",
  "School of Communication",
  "School of Computer Sciences",
  "School of Educational Studies",
  "School of Housing, Building and Planning",
  "School of Humanities",
  "School of Industrial Technology",
  "School of Language, Literacies and Translation",
  "School of Management",
  "School of Mathematical Sciences",
  "School of Physics",
  "School of Social Sciences",
  "School of The Arts",
  "Other",
];


export default function RegistrationForm({ isOpen, onClose, onSubmit, isSubmitting }: RegistrationFormProps) {
  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      matricNo: '',
      faculty: '',
      otherFaculty: '',
    },
  });

  const facultyValue = form.watch('faculty');

  const handleFormSubmit = (data: RegistrationFormValues) => {
    const finalFaculty = data.faculty === 'Other' ? data.otherFaculty! : data.faculty;
    onSubmit({
        name: data.name,
        matricNo: data.matricNo,
        faculty: finalFaculty,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register for Event</DialogTitle>
          <DialogDescription>
            Please fill in your details to complete the registration.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your full name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="matricNo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Matriculation Number</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter your matric no." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="faculty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Faculty / School</FormLabel>
                   <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your faculty/school" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {faculties.map((faculty) => (
                        <SelectItem key={faculty} value={faculty}>
                          {faculty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             {facultyValue === 'Other' && (
              <FormField
                control={form.control}
                name="otherFaculty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Please Specify Your Faculty</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your faculty/school" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
             <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
