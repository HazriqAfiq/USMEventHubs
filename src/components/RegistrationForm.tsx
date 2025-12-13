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
import { ArrowLeft, QrCode, Upload, Loader2 } from 'lucide-react';
import { useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from './ui/use-toast';

const formSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  matricNo: z.string().min(5, { message: 'Matriculation number is required.' }),
  faculty: z.string().min(1, { message: 'Please select a faculty.' }),
  otherFaculty: z.string().optional(),
  paymentProofUrl: z.string().optional(),
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
  onSubmit: (data: { name: string, matricNo: string, faculty: string, paymentProofUrl?: string }) => void;
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
  const [isUploading, setIsUploading] = useState(false);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dynamicFormSchema = formSchema.refine(data => {
    if (isPaidEvent) {
      return !!data.paymentProofUrl;
    }
    return true;
  }, {
    message: 'Proof of payment is required for paid events.',
    path: ['paymentProofUrl'],
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: {
      name: '',
      matricNo: '',
      faculty: '',
      otherFaculty: '',
      paymentProofUrl: '',
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
  const paymentProofPreview = form.watch('paymentProofUrl');

  const handleFormSubmit = (data: RegistrationFormValues) => {
    const finalFaculty = data.faculty === 'Other' ? data.otherFaculty! : data.faculty;
    onSubmit({
        name: data.name,
        matricNo: data.matricNo,
        faculty: finalFaculty,
        paymentProofUrl: data.paymentProofUrl,
    });
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if(file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB.'
      });
      return;
    }
    
    setIsUploading(true);

    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      form.setValue('paymentProofUrl', dataUri, { shouldValidate: true });
      
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Image processing failed',
        description: 'There was an error processing your image. Please try another one.'
      });
    } finally {
      setIsUploading(false);
    }
  }


  const handleNextStep = async () => {
    // Only validate the fields relevant to the first step
    const isValid = await form.trigger(['name', 'matricNo', 'faculty', 'otherFaculty']);
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
                  <h3 className="text-lg font-semibold font-headline">Scan to Pay & Upload Proof</h3>
                  <p className="text-sm text-muted-foreground">
                    Please scan the QR code to pay <strong>RM{eventPrice?.toFixed(2)}</strong>, then upload a screenshot of your receipt below.
                  </p>
                </div>
          )}
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            {step === 1 && (
                <>
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
                </>
            )}

            {step === 2 && isPaidEvent && (
              <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="relative h-60 w-60 rounded-md overflow-hidden border bg-white">
                      <Image src={eventQrCodeUrl!} alt="Payment QR Code" layout="fill" objectFit="contain" />
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="paymentProofUrl"
                    render={() => (
                      <FormItem>
                        <FormLabel>Upload Payment Receipt</FormLabel>
                        <FormControl>
                          <div 
                            onClick={() => paymentProofInputRef.current?.click()}
                            className={cn(
                              "aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center cursor-pointer",
                              isUploading && "cursor-not-allowed opacity-50"
                            )}
                          >
                            <input 
                              type="file" 
                              ref={paymentProofInputRef} 
                              onChange={handleFileChange} 
                              className="hidden" 
                              accept="image/png, image/jpeg, image/webp"
                              disabled={isUploading}
                            />
                            {paymentProofPreview ? (
                              <Image src={paymentProofPreview} alt="Payment proof preview" fill style={{objectFit: 'cover'}} />
                            ) : (
                               <div className='text-center text-muted-foreground'>
                                  <Upload className="h-8 w-8 mx-auto" />
                                  <p>Click to upload receipt</p>
                                </div>
                            )}

                            {isUploading && (
                               <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
            )}

            <DialogFooter className="pt-4">
              {step === 1 && (
                  <>
                      <DialogClose asChild>
                          <Button type="button" variant="outline" disabled={isSubmitting}>Cancel</Button>
                      </DialogClose>
                      {isPaidEvent ? (
                          <Button type="button" onClick={handleNextStep}>Next</Button>
                      ) : (
                          <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                          </Button>
                      )}
                  </>
              )}
              {step === 2 && isPaidEvent && (
                  <>
                      <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isSubmitting}>
                          <ArrowLeft className="mr-2 h-4 w-4"/>
                          Back
                      </Button>
                      <Button type="submit" disabled={isSubmitting || isUploading || !paymentProofPreview}>
                          {isSubmitting ? 'Submitting...' : 'Submit Registration'}
                      </Button>
                  </>
              )}
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
