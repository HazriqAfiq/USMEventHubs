'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAdmin: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, async (userDocSnap) => {
           if (userDocSnap.exists()) {
              const profile = userDocSnap.data() as UserProfile;
              setUserProfile(profile);
              setIsAdmin(profile.role === 'admin');
            } else {
              // This case should ideally not be hit frequently if registration flow is correct.
              // It can serve as a fallback.
              const newProfile: UserProfile = {
                uid: user.uid,
                email: user.email,
                role: 'student',
                name: user.displayName || '',
              };
              // Only set if it doesn't exist, to avoid race conditions with registration
              try {
                await setDoc(userDocRef, newProfile, { merge: false }); // Do not merge, to catch if it was created elsewhere.
                setUserProfile(newProfile);
              } catch (e) {
                // If this fails, it might be because the doc was just created. Refetch.
                const freshSnap = await getDoc(userDocRef);
                if (freshSnap.exists()) {
                   setUserProfile(freshSnap.data() as UserProfile);
                   setIsAdmin(freshSnap.data().role === 'admin');
                }
              }
              setIsAdmin(false);
            }
            setLoading(false);
        });

        return () => unsubscribeProfile();

      } else {
        setUser(null);
        setUserProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = { user, userProfile, loading, isAdmin };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
