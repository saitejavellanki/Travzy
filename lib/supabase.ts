import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

const supabaseUrl = "https://pgfcpqfahuidhystvami.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZmNwcWZhaHVpZGh5c3R2YW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMzM2MjQsImV4cCI6MjA1NjgwOTYyNH0._iBFPiWIjqwsoul-t6JN_dnrgTW1Dbv9jSnXw0xP1SI";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
  },
});