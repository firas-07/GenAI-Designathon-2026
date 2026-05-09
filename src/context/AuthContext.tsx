"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { 
  onAuthStateChanged, 
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
  isAdmin: boolean;
  isCoordinator: boolean;
  isTrainer: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isCoordinator: false,
  isTrainer: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // Check for pending invitations if profile doesn't exist
            if (user.email) {
              const invRef = doc(db, "invitations", user.email.toLowerCase());
              const invDoc = await getDoc(invRef);
              
              if (invDoc.exists()) {
                const invData = invDoc.data();
                // Create profile automatically from invitation
                const newProfile: UserProfile = {
                  uid: user.uid,
                  email: user.email,
                  role: invData.role,
                  name: user.displayName || user.email.split('@')[0], // Default name
                };
                
                await setDoc(doc(db, "users", user.uid), newProfile);
                
                // Update invitation status (optional: delete or mark accepted)
                await updateDoc(invRef, { status: "accepted", acceptedAt: new Date().toISOString() });
                
                setProfile(newProfile);
              } else {
                setProfile(null);
              }
            } else {
              setProfile(null);
            }
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
    isAdmin: profile?.role === "Admin",
    isCoordinator: profile?.role === "Training Coordinator",
    isTrainer: profile?.role === "Trainer",
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
