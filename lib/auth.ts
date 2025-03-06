import { supabase } from './supabase';
import { router } from 'expo-router';

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;

  router.replace('/(app)');
}

export async function signUp(email: string, password: string, fullName: string) {
  const { error: signUpError, data: { user } } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) throw signUpError;
  if (!user) throw new Error('User not created');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([{ user_id: user.id, full_name: fullName }]);

  if (profileError) throw profileError;

  router.replace('/(app)');
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  
  router.replace('/(auth)/login');
}