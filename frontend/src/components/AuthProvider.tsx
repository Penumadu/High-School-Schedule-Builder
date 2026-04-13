'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, isDemoMode } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  role: string;
  schoolId: string;
  loading: boolean;
  isDemoMode: boolean;
  setRole: (role: string) => void;
  setSchoolId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: '',
  schoolId: '',
  loading: true,
  isDemoMode: false,
  setRole: () => {},
  setSchoolId: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Firebase Auth is in Demo Mode (missing API keys), trigger mock data
    if (isDemoMode) {
      console.log("Entering Demo Mode (No Firebase configuration detected)");
      const mockUser = {
        uid: 'demo-user',
        email: 'admin@demo.edu',
        displayName: 'Demo Administrator',
        getIdToken: async () => 'mock-token'
      };
      
      // Update global auth singleton for the API client if it's the mock object
      if (auth && !auth.currentUser) {
        (auth as any).currentUser = mockUser;
      }
      
      setUser(mockUser as any);
      setRole('SUPER_ADMIN');
      setSchoolId('demo-school');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const realRole = (tokenResult.claims.role as string) || '';
          
          // Check for session overrides (for SUPER_ADMINs managing a specific school)
          const sessionRole = sessionStorage.getItem('acting_role');
          const sessionSchoolId = sessionStorage.getItem('acting_school_id');
          
          if (realRole === 'SUPER_ADMIN' && sessionRole && sessionSchoolId) {
            setRole(sessionRole);
            setSchoolId(sessionSchoolId);
          } else {
            setRole(realRole);
            setSchoolId((tokenResult.claims.school_id as string) || '');
          }
        } catch (e) {
          console.error("Failed to load claims", e);
        }
      } else {
        setUser(null);
        setRole('');
        setSchoolId('');
        sessionStorage.removeItem('acting_role');
        sessionStorage.removeItem('acting_school_id');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, schoolId, loading, isDemoMode, setRole, setSchoolId }}>
      {children}
    </AuthContext.Provider>
  );
}
