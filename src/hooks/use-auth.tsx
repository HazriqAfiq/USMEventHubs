
'use client';

import * as React from 'react';
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/types';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isOrganizer: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loading: boolean;
}

const AuthContext = React.createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isOrganizer: false,
  isSuperAdmin: false,
  isAdmin: false,
  loading: true,
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = React.useState<User | null>(null);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [isOrganizer, setIsOrganizer] = React.useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setLoading(true);
      if (user) {
        setUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        
        const unsubscribeProfile = onSnapshot(userDocRef, (userDocSnap) => {
           if (userDocSnap.exists()) {
              const profile = userDocSnap.data() as UserProfile;
              setUserProfile(profile);
              setIsOrganizer(profile.role === 'organizer');
              setIsSuperAdmin(profile.role === 'superadmin');
              setIsAdmin(profile.role === 'admin');
            } else {
              setUserProfile(null);
              setIsOrganizer(false);
              setIsSuperAdmin(false);
              setIsAdmin(false);
            }
            setLoading(false);
        }, () => {
          // Handle snapshot errors if needed, e.g., permission denied
          setUserProfile(null);
          setIsOrganizer(false);
          setIsSuperAdmin(false);
          setIsAdmin(false);
          setLoading(false);
        });

        return () => unsubscribeProfile();

      } else {
        setUser(null);
        setUserProfile(null);
        setIsOrganizer(false);
        setIsSuperAdmin(false);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const value = { user, userProfile, loading, isOrganizer, isSuperAdmin, isAdmin };

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
