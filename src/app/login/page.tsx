'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { LogIn } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function LoginPage() {
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      
      toast({
        title: 'Login successful!',
        description: 'Redirecting...',
      });
      
      // The useAuth hook will handle role check and redirection
      // For a slightly better UX, we could try to predict the role, but for now
      // a simple push to home is fine. The auth provider will redirect to /admin if needed.
      router.push('/');
     
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'There was a problem with your login request.';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        errorMessage = 'Invalid email or password. Please try again.';
      } else {
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
    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      const user = userCredential.user;

      // Create a user profile document in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        role: 'student', // Default role for new users
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
                        placeholder="user@example.com"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                        id="login-password"
                        type="password"
                        required
                        placeholder="********"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                    />
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
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                        id="register-email"
                        type="email"
                        placeholder="student@example.com"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        disabled={isLoading}
                    />
                    </div>
                    <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                        id="register-password"
                        type="password"
                        required
                        placeholder="********"
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        disabled={isLoading}
                    />
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
