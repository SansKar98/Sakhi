import { createContext, useContext, useEffect, useState } from 'react';
import { User, AuthError, PostgrestError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../types/database';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  profileCompleted: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: AuthError | PostgrestError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileCompleted, setProfileCompleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      setProfileCompleted(data?.profile_completed ?? false);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            full_name: fullName,
            safety_credits: 0,
            emergency_contacts: [],
            profile_completed: false,
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
        }
      }

      return { error: null };
    } catch (error) {
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    try {
      if (!user) throw new Error('No user logged in');

      // Prepare the update data with proper formatting
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are being updated
      if (data.age !== undefined) updateData.age = data.age;
      if (data.gender !== undefined) updateData.gender = data.gender;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.occupation !== undefined) updateData.occupation = data.occupation;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.emergency_contacts !== undefined) updateData.emergency_contacts = data.emergency_contacts;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
      if (data.profile_completed !== undefined) updateData.profile_completed = data.profile_completed;

      console.log('Updating profile with:', updateData);

      // Use upsert to handle both insert and update cases
      updateData.id = user.id;
      // Ensure NOT NULL fields are present for insert case
      updateData.full_name = data.full_name || profile?.full_name || user.user_metadata?.full_name || user.email || '';
      if (updateData.safety_credits === undefined) {
        updateData.safety_credits = profile?.safety_credits ?? 0;
      }
      if (updateData.emergency_contacts === undefined) {
        updateData.emergency_contacts = profile?.emergency_contacts ?? [];
      }

      const { data: result, error } = await supabase
        .from('profiles')
        .upsert(updateData, { onConflict: 'id' })
        .select()
        .maybeSingle();

      if (error) {
        console.error('Profile update error:', error);
        return { error };
      }

      console.log('Profile updated successfully:', result);

      
      // Immediately update the AuthContext state
      setProfile(result);
      setProfileCompleted(result.profile_completed ?? false);

      return { error: null };
    } catch (error) {
      console.error('Profile update exception:', error);
      return { error: error as AuthError };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, profileCompleted, signUp, signIn, signOut, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
