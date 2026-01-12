
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';

interface TermsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsDialog({ isOpen, onClose }: TermsDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Terms and Conditions</DialogTitle>
          <DialogDescription>
            Last Updated: {new Date().toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>Welcome to the USM Event Hub. By creating an account and using this platform, you agree to comply with and be bound by the following terms and conditions of use.</p>
            
            <h4 className="font-semibold text-foreground">1. Account Registration and Use</h4>
            <p>You must be a current student, staff member, or affiliated personnel of Universiti Sains Malaysia (USM) to create an account. You agree to provide accurate, current, and complete information during the registration process. You are responsible for safeguarding your password and for all activities that occur under your account.</p>

            <h4 className="font-semibold text-foreground">2. User Conduct</h4>
            <p>You agree not to use the platform to post or transmit any material which is defamatory, offensive, or of an obscene or menacing character, or that may cause annoyance, inconvenience, or needless anxiety. You agree not to use the platform in a way that is fraudulent or in connection with a criminal offense.</p>

            <h4 className="font-semibold text-foreground">3. Event Listings and Registration</h4>
            <p>The USM Event Hub acts as a platform for event discovery and registration. While we strive to ensure the accuracy of event information, we are not responsible for the content posted by event organizers, nor for the execution or quality of the events themselves. Registration for an event constitutes an agreement between you and the event organizer.</p>

            <h4 className="font-semibold text-foreground">4. Organizer Responsibilities</h4>
            <p>Users who are granted "Organizer" status are responsible for providing accurate and complete details for their events, including dates, times, locations, and descriptions. Organizers must adhere to all USM policies and guidelines when creating and managing events. The platform reserves the right to remove any event listing that violates these terms or USM policies.</p>

            <h4 className="font-semibold text-foreground">5. Data Privacy</h4>
            <p>We collect and use your personal information in accordance with our Privacy Policy. By using this platform, you consent to such collection and use. Primarily, your data is used to manage your event registrations and tailor your user experience. We will not share your personal data with third parties without your consent, except as required by law or to facilitate event management with organizers.</p>

            <h4 className="font-semibold text-foreground">6. Intellectual Property</h4>
            <p>The content on the USM Event Hub, including text, graphics, logos, and software, is the property of the platform or its content suppliers and is protected by copyright and other intellectual property laws. You may not reproduce, duplicate, copy, sell, or otherwise exploit any portion of the service without express written permission from us.</p>
            
            <h4 className="font-semibold text-foreground">7. Termination</h4>
            <p>We may terminate or suspend your access to the platform immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the platform will immediately cease.</p>

            <h4 className="font-semibold text-foreground">8. Changes to Terms</h4>
            <p>We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes by posting the new Terms on this page. Your continued use of the platform after any such changes constitutes your acceptance of the new Terms.</p>
            
            <p>If you have any questions about these Terms, please contact us.</p>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
