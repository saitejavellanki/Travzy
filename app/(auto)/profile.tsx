import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ChevronRight, Heart, CreditCard, Bell, Settings, HelpCircle, LogOut } from 'lucide-react-native';
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

  const renderMenuItem = (icon, title, rightComponent = <ChevronRight size={20} color="#64748B" />) => (
    <TouchableOpacity style={styles.menuItem}>
      <View style={styles.menuItemLeft}>
        {icon}
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      {rightComponent}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>
      
      {error ? (
        <View style={styles.centeredErrorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.replace('/login')}
          >
            <Text style={styles.actionButtonText}>Log In</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.profileCard}>
            <Image
              source={{ uri: profile?.avatar_url || 'https://i.pravatar.cc/300' }}
              style={styles.profileImage} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'User'}</Text>
              <Text style={styles.profilePhone}>User since {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'recently'}</Text>
            </View>
            <TouchableOpacity style={styles.editButton}>
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            {renderMenuItem(<Heart size={20} color="#3B82F6" style={styles.menuIcon} />, 'Saved Locations')}
            {renderMenuItem(<CreditCard size={20} color="#3B82F6" style={styles.menuIcon} />, 'Payment Methods')}
            {renderMenuItem(<Bell size={20} color="#3B82F6" style={styles.menuIcon} />, 'Notifications')}
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferences</Text>
            {renderMenuItem(<Settings size={20} color="#3B82F6" style={styles.menuIcon} />, 'App Settings')}
            {renderMenuItem(
              <HelpCircle size={20} color="#3B82F6" style={styles.menuIcon} />,
              'Help & Support'
            )}
          </View>
          
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <LogOut size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
          
          <View style={styles.footer}>
            <Text style={styles.versionText}>Version 1.0.0</Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
  },
  centeredErrorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#F8FAFC',
    height: 500,
    marginTop: 50,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#683367',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    // marginTop: 16,
    width: 140,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  profilePhone: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 4,
    fontFamily: 'Inter-Regular',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
  section: {
    backgroundColor: '#fff',
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    margin: 16,
    padding: 16,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginLeft: 8,
    fontFamily: 'Inter-SemiBold',
  },
  footer: {
    alignItems: 'center',
    padding: 16,
    marginBottom: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
  },
});