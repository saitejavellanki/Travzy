import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ChevronRight, Heart, CreditCard, Bell, Settings, HelpCircle, LogOut } from 'lucide-react-native';
import { auth, db, logOut } from '@/firebase/Config';
import { router } from 'expo-router';
import { doc, getDoc, setDoc } from 'firebase/firestore';

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
      
      // Get current user
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You are not logged in');
        setLoading(false);
        return;
      }

      console.log("Current user ID:", currentUser.uid);
      
      // Get profile data from Firestore - use the user's UID directly
      const profileRef = doc(db, 'profiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      console.log("Profile exists:", profileSnap.exists());
      
      if (profileSnap.exists()) {
        // Transform the data to match our Profile type
        const profileData = profileSnap.data();
        console.log("Retrieved profile data:", profileData);
        
        setProfile({
          user_id: currentUser.uid,
          full_name: profileData.full_name || currentUser.displayName || 'User',
          avatar_url: profileData.avatar_url || null,
          created_at: profileData.created_at || new Date().toISOString(),
        });
      } else {
        console.log("Creating new profile");
        // Create a basic profile if it doesn't exist
        const newProfile = {
          user_id: currentUser.uid,
          uid: currentUser.uid, // Adding this to match your Firestore structure
          full_name: currentUser.displayName || 'User',
          avatar_url: currentUser.photoURL,
          created_at: new Date().toISOString(),
        };
        
        await setDoc(profileRef, newProfile);
        setProfile(newProfile);
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logOut();
      
      // Navigate to login screen
      router.replace('/(auth)');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchProfile();
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
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>
                {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
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
            style={styles.debugButton}
            onPress={handleRefresh}
          >
            <Text style={styles.debugButtonText}>Refresh Profile</Text>
          </TouchableOpacity>
          
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
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    fontFamily: 'Inter-Bold',
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
  debugButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 12,
  },
  debugButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0284C7',
    fontFamily: 'Inter-SemiBold',
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