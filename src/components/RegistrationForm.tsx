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
import Image from 'next/image';
import { ArrowLeft, QrCode } from 'lucide-react';
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
  eventPrice?: number;
  eventQrCodeUrl?: string;
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


export default function RegistrationForm({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isSubmitting,
  eventPrice,
  eventQrCodeUrl
}: RegistrationFormProps) {
  const isPaidEvent = eventPrice !== undefined && eventQrCodeUrl;
  const [step, setStep] = useState(1);

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      matricNo: '',
      faculty: '',
      otherFaculty: '',
    },
  });
  
  const handleClose = () => {
    onClose();
    // Reset form and step when dialog closes
    setTimeout(() => {
        form.reset();
        setStep(1);
    }, 300);
  }

  const facultyValue = form.watch('faculty');

  const handleFormSubmit = (data: RegistrationFormValues) => {
    const finalFaculty = data.faculty === 'Other' ? data.otherFaculty! : data.faculty;
    onSubmit({
        name: data.name,
        matricNo: data.matricNo,
        faculty: finalFaculty,
    });
  };

  const handleNextStep = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setStep(2);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent onInteractOutside={(e) => {
          // Prevent closing dialog when clicking outside if submitting
          if (isSubmitting) {
            e.preventDefault();
          }
        }}>
        <DialogHeader>
           {step === 1 && (
            <>
              <DialogTitle>Register for Event</DialogTitle>
              <DialogDescription>
                Please fill in your details to complete the registration.
              </DialogDescription>
            </>
          )}
           {step === 2 && isPaidEvent && (
             <div className="flex flex-col items-center text-center gap-2">
                  <QrCode className="h-8 w-8 text-primary" strokeWidth={1.5} />
                  <h3 className="text-lg font-semibold font-headline">Scan to Pay</h3>
                  <p className="text-sm text-muted-foreground">
                    Please scan the QR code to complete your payment of <strong>RM{eventPrice?.toFixed(2)}</strong>. After payment, you can submit your registration.
                  </p>
                </div>
          )}
        </DialogHeader>
        
        {step === 1 && (
             <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
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
                         {isPaidEvent ? (
                            <Button type="button" onClick={handleNextStep}>Next</Button>
                        ) : (
                            <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleFormSubmit)}>
                                {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                            </Button>
                        )}
                    </DialogFooter>
                </form>
             </Form>
        )}

        {step === 2 && isPaidEvent && (
            <div className="space-y-4">
                 <div className="flex justify-center">
                  <div className="relative h-80 w-80 rounded-md overflow-hidden border bg-white">
                    <Image src={eventQrCodeUrl} alt="Payment QR Code" layout="fill" objectFit="contain" />
                  </div>
                </div>
                <DialogFooter className="pt-4">
                    <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4"/>
                        Back
                    </Button>
                    <Button type="button" disabled={isSubmitting} onClick={form.handleSubmit(handleFormSubmit)}>
                        {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                    </Button>
                </DialogFooter>
            </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
