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
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';

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
  isRegistrationClosed: boolean;
  eventId?: string;
}

const faculties = [
  "School of Biological Sciences", "School of Chemical Sciences", "School of Communication", "School of Computer Sciences", "School of Educational Studies", "School of Housing, Building and Planning", "School of Humanities", "School of Industrial Technology", "School of Language, Literacies and Translation", "School of Management", "School of Mathematical Sciences", "School of Physics", "School of Social Sciences", "School of The Arts", "Other",
];

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


export default function RegistrationForm({ 
  isOpen, onClose, onSubmit, isSubmitting, eventPrice, eventQrCodeUrl, isRegistrationClosed, eventId
}: RegistrationFormProps) {
  const { user } = useAuth();
  const isPaidEvent = eventPrice !== undefined && eventQrCodeUrl;
  const [step, setStep] = useState(1);
  const [isUploading, setIsUploading] = useState(false);
  const paymentProofInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const dynamicFormSchema = formSchema.refine(data => !isPaidEvent || !!data.paymentProofUrl, {
    message: 'Proof of payment is required for paid events.',
    path: ['paymentProofUrl'],
  });

  const form = useForm<RegistrationFormValues>({
    resolver: zodResolver(dynamicFormSchema),
    defaultValues: { name: '', matricNo: '', faculty: '', otherFaculty: '', paymentProofUrl: '' },
  });

  useEffect(() => {
    if (isOpen && isRegistrationClosed) {
      onClose();
      toast({ variant: "destructive", title: "Registration Closed", description: "The registration window for this event has passed." });
    }
  }, [isOpen, isRegistrationClosed, onClose, toast]);
  
  const handleClose = () => {
    onClose();
    setTimeout(() => { form.reset(); setStep(1); }, 300);
  }

  const facultyValue = form.watch('faculty');
  const paymentProofPreview = form.watch('paymentProofUrl');

  const handleFormSubmit = async (data: RegistrationFormValues) => {
    if (isRegistrationClosed) {
      toast({ variant: "destructive", title: "Registration Closed", description: "The registration window has passed." });
      handleClose();
      return;
    }
    
    const finalFaculty = data.faculty === 'Other' ? data.otherFaculty! : data.faculty;
    onSubmit({
        name: data.name,
        matricNo: data.matricNo,
        faculty: finalFaculty,
        paymentProofUrl: data.paymentProofUrl, // The URL is already the final storage URL from handleFileChange
    });
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !eventId) return;

    if(file.size > 2 * 1024 * 1024) { // 2MB limit
      toast({ variant: 'destructive', title: 'File too large', description: 'Please upload an image smaller than 2MB.' });
      return;
    }
    
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `payment-proofs/${eventId}/${user.uid}/proof.jpg`);
      const resizedDataUrl = await resizeImage(file, 800); // Resize receipt to a max of 800px
      
      await uploadString(storageRef, resizedDataUrl, 'data_url');
      const downloadURL = await getDownloadURL(storageRef);

      form.setValue('paymentProofUrl', downloadURL, { shouldValidate: true, shouldDirty: true });
      toast({ title: 'Receipt uploaded successfully.' });

    } catch (error) {
      console.error("Receipt upload failed:", error);
      toast({ variant: 'destructive', title: 'Upload Failed', description: 'There was an error uploading your receipt.' });
    } finally {
      setIsUploading(false);
    }
  }

  const handleNextStep = async () => {
    const isValid = await form.trigger(['name', 'matricNo', 'faculty', 'otherFaculty']);
    if (isValid) {
       if (isPaidEvent) {
        setStep(2);
      } else {
        // If it's a free event, skip payment steps and submit directly
        handleFormSubmit(form.getValues());
      }
    }
  }

  const renderStepContent = () => {
    switch (step) {
      case 1: return (<>
        <DialogHeader><DialogTitle>Register for Event</DialogTitle><DialogDescription>Please fill in your details to complete the registration.</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="Enter your full name" {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="matricNo" render={({ field }) => (<FormItem><FormLabel>Matriculation Number</FormLabel><FormControl><Input placeholder="Enter your matric no." {...field} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="faculty" render={({ field }) => (<FormItem><FormLabel>Faculty / School</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Select your faculty/school" /></SelectTrigger></FormControl><SelectContent>{faculties.map((faculty) => (<SelectItem key={faculty} value={faculty}>{faculty}</SelectItem>))}</SelectContent></Select><FormMessage /></FormItem>)} />
          {facultyValue === 'Other' && (<FormField control={form.control} name="otherFaculty" render={({ field }) => (<FormItem><FormLabel>Please Specify Your Faculty</FormLabel><FormControl><Input placeholder="Enter your faculty/school" {...field} /></FormControl><FormMessage /></FormItem>)} />)}
        </div>
      </>);
      case 2: return (<>
        <DialogHeader><div className="flex flex-col items-center text-center gap-2"><QrCode className="h-8 w-8 text-primary" strokeWidth={1.5} /><h3 className="text-lg font-semibold font-headline">Step 2: Scan to Pay</h3><p className="text-sm text-muted-foreground">Please scan the QR code to pay <strong>RM{eventPrice?.toFixed(2)}</strong>. Proceed to the next step to upload your receipt.</p></div></DialogHeader>
        <div className="flex justify-center py-4"><div className="relative h-96 w-96 rounded-md overflow-hidden border bg-white"><Image src={eventQrCodeUrl!} alt="Payment QR Code" layout="fill" objectFit="contain" /></div></div>
      </>);
      case 3: return (<>
        <DialogHeader><div className="flex flex-col items-center text-center gap-2"><Upload className="h-8 w-8 text-primary" strokeWidth={1.5} /><h3 className="text-lg font-semibold font-headline">Step 3: Upload Receipt</h3><p className="text-sm text-muted-foreground">Please upload a screenshot or image of your payment receipt to finalize your registration.</p></div></DialogHeader>
        <div className="space-y-4 py-4"><FormField control={form.control} name="paymentProofUrl" render={() => (<FormItem><FormLabel>Payment Receipt</FormLabel><FormControl><div onClick={() => paymentProofInputRef.current?.click()} className={cn("aspect-video w-full relative rounded-md overflow-hidden border bg-muted flex items-center justify-center text-muted-foreground text-center cursor-pointer", isUploading && "cursor-not-allowed opacity-50")}><input type="file" ref={paymentProofInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg, image/webp" disabled={isUploading} />{paymentProofPreview ? (<Image src={paymentProofPreview} alt="Payment proof preview" fill style={{ objectFit: 'cover' }} />) : (<div className='text-center text-muted-foreground'><Upload className="h-8 w-8 mx-auto" /><p>Click to upload receipt</p></div>)}{isUploading && (<div className="absolute inset-0 bg-black/50 flex items-center justify-center"><Loader2 className="h-8 w-8 text-white animate-spin" /></div>)}</div></FormControl><FormMessage /></FormItem>)} /></div>
      </>);
      default: return null;
    }
  }

  const renderFooter = () => {
    if (isPaidEvent) {
      switch (step) {
        case 1: return (<DialogFooter className="pt-4"><DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose><Button type="button" onClick={handleNextStep}>Next</Button></DialogFooter>);
        case 2: return (<DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setStep(1)}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button><Button type="button" onClick={() => setStep(3)}>Next</Button></DialogFooter>);
        case 3: return (<DialogFooter className="pt-4"><Button type="button" variant="outline" onClick={() => setStep(2)} disabled={isSubmitting || isRegistrationClosed}><ArrowLeft className="mr-2 h-4 w-4"/>Back</Button><Button type="submit" disabled={isSubmitting || isUploading || !paymentProofPreview || isRegistrationClosed}>{isSubmitting ? 'Submitting...' : (isRegistrationClosed ? 'Registration Closed' : 'Submit Registration')}</Button></DialogFooter>);
        default: return null;
      }
    } else {
        return (
            <DialogFooter className="pt-4">
                <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={isSubmitting || isRegistrationClosed}>Cancel</Button>
                </DialogClose>
                <Button type="button" onClick={handleNextStep} disabled={isSubmitting || isRegistrationClosed}>
                    {isSubmitting ? 'Submitting...' : (isRegistrationClosed ? 'Registration Closed' : 'Submit Registration')}
                </Button>
            </DialogFooter>
        );
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent onInteractOutside={(e) => { if (isSubmitting) e.preventDefault(); }}>
        <Form {...form}><form onSubmit={form.handleSubmit(handleFormSubmit)}>{renderStepContent()}{renderFooter()}</form></Form>
      </DialogContent>
    </Dialog>
  );
}
