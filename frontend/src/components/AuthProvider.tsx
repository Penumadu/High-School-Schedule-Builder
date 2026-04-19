'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  role: string;
  schoolId: string;
  loading: boolean;
  setRole: (role: string) => void;
  setSchoolId: (id: string) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: '',
  schoolId: '',
  loading: true,
  setRole: () => { },
  setSchoolId: () => { },
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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        if (firebaseUser.isAnonymous) {
          setRole('GUEST');
          setSchoolId('');
          setLoading(false);
          return;
        }

        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const realRole = (tokenResult.claims.role as string) || 'GUEST';

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
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, role, schoolId, loading, setRole, setSchoolId }}>
      {children}
    </AuthContext.Provider>
  );
}
