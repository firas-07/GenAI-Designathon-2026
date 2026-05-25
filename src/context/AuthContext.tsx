"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser 
} from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";


export type UserRole = "Admin" | "Training Coordinator" | "Trainer";

interface UserProfile {
  uid: string;
  email: string | null;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  accessDenied: boolean;
  isAdmin: boolean;
  isCoordinator: boolean;
  isTrainer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  accessDenied: false,
  isAdmin: false,
  isCoordinator: false,
  isTrainer: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setAccessDenied(false);
      if (firebaseUser) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else if (firebaseUser.email) {
            // Check for pending invitations
            const invRef = doc(db, "invitations", firebaseUser.email.toLowerCase());
            const invDoc = await getDoc(invRef);

            if (invDoc.exists()) {
              const invData = invDoc.data();
              const newProfile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                role: invData.role,
                name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
              };
              await setDoc(doc(db, "users", firebaseUser.uid), newProfile);
              await updateDoc(invRef, { status: "accepted", acceptedAt: new Date().toISOString() });
              setProfile(newProfile);
            } else {
              // No profile and no invitation — access denied
              setAccessDenied(true);
              setProfile(null);
              await signOut(auth); // Sign them out immediately
            }
          } else {
            setAccessDenied(true);
            setProfile(null);
            await signOut(auth);
          }
        } catch (err) {
          console.error("Error fetching user profile:", err);
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    user,
    profile,
    loading,
    accessDenied,
    isAdmin: profile?.role === "Admin",
    isCoordinator: profile?.role === "Training Coordinator",
    isTrainer: profile?.role === "Trainer",
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
