import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithRedirect,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db_firebase } from './firebase';

interface AuthState {
  user: User | null;
  licensed: boolean;
  loading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  licensed: false,
  loading: true,
  signIn: async () => {},
  signOutUser: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [licensed, setLicensed] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkLicense = useCallback(async (uid: string) => {
    try {
      const snap = await getDoc(doc(db_firebase, 'licenses', uid));
      setLicensed(snap.exists() && snap.data()?.licensed === true);
    } catch {
      setLicensed(false);
    }
  }, []);

  useEffect(() => {
    // Capturar resultado del redirect de Google (si viene de uno)
    getRedirectResult(auth).catch(() => {});

    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) await checkLicense(u.uid);
      else setLicensed(false);
      setLoading(false);
    });
    return unsub;
  }, [checkLicense]);

  const signIn = useCallback(async () => {
    const provider = new GoogleAuthProvider();

    if (Platform.OS === 'web') {
      await signInWithRedirect(auth, provider);
      return;
    }

    // Android: OAuth se maneja desde login.native.tsx via expo-auth-session
    throw new Error('USE_EXPO_AUTH');
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, licensed, loading, signIn, signOutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
