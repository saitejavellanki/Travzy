import { supabase } from './supabase'; // Assuming you're using Supabase
import { router } from 'expo-router';

export async function signUp({ email, password, fullName, phoneNumber }) {
  console.log("Auth service signUp called with:", { email, fullName, phoneNumber });
  
  try {
    // Step 1: Create the user in auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error("Auth error during signup:", authError);
      throw authError;
    }

    console.log("Auth user created:", authData);
    
    if (!authData.user || !authData.user.id) {
      console.error("No user ID returned from auth");
      throw new Error("Failed to create user account");
    }

    // Step 2: Use upsert instead of insert to handle the case where the profile might already exist
    const userId = authData.user.id;
    
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          user_id: userId,
          full_name: fullName,
          phone_no: phoneNumber, // Store the phone number
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' } // Specify that we're handling conflicts on user_id
      );

    if (profileError) {
      console.error("Profile creation error:", profileError);
      throw profileError;
    }

    console.log("Profile created/updated successfully:", profileData);

    return {
      user: authData.user,
      profile: profileData
    };
  } catch (err) {
    console.error("Error in signUp function:", err);
    throw err;
  }
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;

  router.replace("/(auth)/login");
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getSession();
  
  if (error) throw error;
  
  return data?.session?.user || null;
}

export async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
      
    if (error) throw error;
    
    return data;
  } catch (err) {
    console.error("Error getting user profile:", err);
    return null;
  }
}