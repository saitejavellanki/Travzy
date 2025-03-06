import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { User, LogOut, Settings, Heart, Car, StarIcon } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

type Profile = {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw sessionError;
      
      if (!session) {
        setError('You are not logged in');
        setLoading(false);
        return;
      }

      // Get profile data
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      if (profileError) {
        if (profileError.code === '42P01') {
          // Table doesn't exist yet
          setError('Profile table not set up. Please run database migration first.');
        } else if (profileError.code === 'PGRST116') {
          // No profile found for this user
          setError('Profile not found. Please complete your profile setup.');
        } else {
          throw profileError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Profile fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Navigate to login screen
      router.replace('/login');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.actionButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.profileHeader}>
            {profile?.avatar_url ? (
              <Image
                source={{ uri: profile.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarInitial}>
                  {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View>
              <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
            </View>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Rides Given</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Rides Taken</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ 0.0</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          <View style={styles.menuContainer}>
            <TouchableOpacity style={styles.menuItem}>
              <User size={20} color="#64748B" />
              <Text style={styles.menuText}>Edit Profile</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Car size={20} color="#64748B" />
              <Text style={styles.menuText}>My Vehicles</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <StarIcon size={20} color="#64748B" />
              <Text style={styles.menuText}>My Ratings</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Heart size={20} color="#64748B" />
              <Text style={styles.menuText}>Saved Locations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem}>
              <Settings size={20} color="#64748B" />
              <Text style={styles.menuText}>Settings</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#DC2626" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 24,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarInitial: {
    fontSize: 32,
    color: '#fff',
    fontFamily: 'Inter-Bold',
  },
  name: {
    fontSize: 22,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  menuContainer: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuText: {
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: 16,
  },
  logoutText: {
    fontSize: 16,
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
    marginLeft: 12,
  },
});