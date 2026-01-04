

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const campuses = ["Main Campus", "Engineering Campus", "Health Campus", "AMDI / IPPT"];

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerCampus, setRegisterCampus] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await setPersistence(auth, browserSessionPersistence);
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const user = userCredential.user;

      // Fetch user profile to check role and status
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        if (userData.disabled === true) {
          await auth.signOut(); // Sign out the user immediately
          toast({
            variant: 'destructive',
            title: 'Account Disabled',
            description: 'Your account has been disabled. Please contact an admin for assistance.',
          });
          setIsLoading(false);
          return;
        }

        toast({
          title: 'Login successful!',
          description: 'Redirecting...',
        });
        
        if (userData.role === 'superadmin') {
          router.push('/superadmin');
        } else if (userData.role === 'admin') {
          router.push('/admin');
        } else if (userData.role === 'organizer') {
          router.push('/organizer');
        } else {
          router.push('/');
        }
      } else {
         router.push('/');
      }
     
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'An unknown error occurred. Please try again.';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'No account found with this email address.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Incorrect password. Please try again.';
          break;
        case 'auth/invalid-credential':
           errorMessage = 'The credentials provided are invalid.';
           break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerName) {
      toast({
        variant: 'destructive',
        title: 'Name is required.',
        description: 'Please enter your full name.',
      });
      return;
    }
    if (!registerCampus) {
        toast({
            variant: 'destructive',
            title: 'Campus is required.',
            description: 'Please select your campus.',
        });
        return;
    }

    const validEmailDomains = ['@usm.my', '@student.usm.my'];
    const isEmailValid = validEmailDomains.some(domain => registerEmail.endsWith(domain));

    if (!isEmailValid) {
        toast({
            variant: 'destructive',
            title: 'Invalid Email Domain',
            description: 'Registration is only open to emails ending with "@usm.my" or "@student.usm.my".',
        });
        return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'student',
        name: registerName,
        photoURL: null,
        campus: registerCampus,
        disabled: false,
      });
      
      toast({
        title: 'Registration successful!',
        description: 'You are now logged in. Redirecting to homepage...',
      });
      router.push('/');
    } catch (error: any)
{
      console.error('Registration error:', error);
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: error.message || 'There was a problem with your registration request.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
        toast({
            variant: 'destructive',
            title: 'Email required',
            description: 'Please enter the email address for your account.',
        });
        return;
    }
    setIsResetting(true);
    setResetSent(false);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        setResetSent(true); // Indicate that the dialog should show the success message
        toast({
            title: 'Password Reset Email Sent',
            description: 'Please check your inbox (and spam folder) for a link to reset your password.',
        });
    } catch (error: any) {
        console.error('Password reset error:', error);
        let description = 'Could not send reset email. Please try again later.';
        if (error.code === 'auth/user-not-found') {
            description = 'No account was found with this email address. Please make sure you have entered the correct email.';
        }
        toast({
            variant: 'destructive',
            title: 'Reset Failed',
            description: description,
        });
    } finally {
        setIsResetting(false);
    }
  }


  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-10rem)] py-12">
      <Card className="mx-auto max-w-sm w-full">
        <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
                <CardHeader className="text-center">
                <CardTitle className="text-2xl font-bold font-headline">Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                        id="login-email"
                        type="email"
                        placeholder="example@student.usm.my"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Password</Label>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                             <button
                                type="button"
                                className="text-sm font-medium text-primary hover:underline"
                                onClick={() => {
                                  setResetSent(false); // Reset UI state when opening dialog
                                  setResetEmail(''); // Clear email field
                                }}
                              >
                                Forgot password?
                              </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <form onSubmit={handlePasswordReset}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Reset Your Password</AlertDialogTitle>
                                {resetSent ? (
                                    <AlertDialogDescription>
                                        A password reset link has been sent to <strong>{resetEmail}</strong>. Please check your inbox and spam folder. You can close this dialog now.
                                    </AlertDialogDescription>
                                ) : (
                                  <>
                                    <AlertDialogDescription>
                                      Enter your account's email address and we'll send you a link to reset your password.
                                    </AlertDialogDescription>
                                    <div className="pt-4">
                                      <Label htmlFor="reset-email" className="sr-only">Email</Label>
                                      <Input
                                        id="reset-email"
                                        type="email"
                                        placeholder="user@example.com"
                                        required
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        disabled={isResetting}
                                      />
                                    </div>
                                  </>
                                )}
                              </AlertDialogHeader>
                              <AlertDialogFooter className="mt-4">
                                <AlertDialogCancel>
                                  {resetSent ? 'Close' : 'Cancel'}
                                </AlertDialogCancel>
                                {!resetSent && (
                                  <AlertDialogAction type="submit" disabled={isResetting}>
                                    {isResetting ? 'Sending...' : 'Send Reset Link'}
                                  </AlertDialogAction>
                                )}
                              </AlertDialogFooter>
                            </form>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                      <div className="relative">
                        <Input
                            id="login-password"
                            type={showLoginPassword ? 'text' : 'password'}
                            required
                            placeholder="********"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            disabled={isLoading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                          onClick={() => setShowLoginPassword((prev) => !prev)}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                        'Logging in...'
                    ) : (
                        <>
                        <LogIn className="mr-2 h-4 w-4" /> Log In
                        </>
                    )}
                    </Button>
                </form>
                </CardContent>
            </TabsContent>
            <TabsContent value="register">
                 <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold font-headline">Create an Account</CardTitle>
                    <CardDescription>Register as a student to join events.</CardDescription>
                </CardHeader>
                <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                     <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                          id="register-name"
                          type="text"
                          placeholder="Your full name"
                          required
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="register-campus">Campus</Label>
                        <Select onValueChange={setRegisterCampus} value={registerCampus} disabled={isLoading}>
                            <SelectTrigger id="register-campus">
                                <SelectValue placeholder="Select your campus" />
                            </SelectTrigger>
                            <SelectContent>
                                {campuses.map(campus => (
                                    <SelectItem key={campus} value={campus}>{campus}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="example@student.usm.my"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Input
                            id="register-password"
                            type={showRegisterPassword ? 'text' : 'password'}
                            required
                            placeholder="********"
                            value={registerPassword}
                            onChange={(e) => setRegisterPassword(e.target.value)}
                            disabled={isLoading}
                        />
                         <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                          onClick={() => setShowRegisterPassword((prev) => !prev)}
                        >
                          {showRegisterPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Registering...' : 'Create Account'}
                    </Button>
                </form>
                </CardContent>
            </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
