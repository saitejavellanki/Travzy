import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { User, LogOut, Settings, Heart, Car, StarIcon, Camera } from 'lucide-react-native';
import { auth, db, storage, logOut } from '../../firebase/Config';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

type Profile = {
  uid: string;
  full_name: string;
  avatar_url: string | null;
  created_at: string;
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

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

      // Get profile data from Firestore
      const profileRef = doc(db, 'profiles', currentUser.uid);
      const profileSnap = await getDoc(profileRef);
      
      if (profileSnap.exists()) {
        setProfile(profileSnap.data() as Profile);
      } else {
        // Create a basic profile if it doesn't exist
        const newProfile = {
          uid: currentUser.uid,
          full_name: currentUser.displayName || 'User',
          avatar_url: currentUser.photoURL,
          created_at: new Date().toISOString(),
        };
        
        await setDoc(profileRef, newProfile);
        setProfile(newProfile);
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
      await logOut();
      
      // Navigate to login screen
      router.replace('/(auth)');
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to log out');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePhoto = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }
  
      // Use simpler options to avoid processing issues
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Lower quality to reduce file size
      });
  
      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadProfilePhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert('Error', 'Could not open image picker. Please try again.');
    }
  };

  const uploadProfilePhoto = async (uri) => {
    try {
      setUploadingPhoto(true);
      
      // Get current user
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Not logged in');
      }
      
      // First, we need to convert the image URI to a blob
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Create a reference to Firebase Storage
      const fileName = `avatars/${currentUser.uid}-${Date.now()}.jpg`;
      const storageRef = ref(storage, fileName);
      
      // Upload the file
      await uploadBytes(storageRef, blob);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);
      
      // Update profile in Firestore
      const profileRef = doc(db, 'profiles', currentUser.uid);
      await updateDoc(profileRef, { 
        avatar_url: downloadURL 
      });
      
      // Update local state
      setProfile(prev => prev ? { ...prev, avatar_url: downloadURL } : null);
      
      Alert.alert('Success', 'Profile photo updated successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', `Could not upload your photo. Error: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
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
            <TouchableOpacity onPress={handleUpdatePhoto} disabled={uploadingPhoto}>
              {uploadingPhoto ? (
                <View style={styles.avatarPlaceholder}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              ) : profile?.avatar_url ? (
                <View style={styles.avatarContainer}>
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={styles.avatar}
                  />
                  <View style={styles.cameraIconContainer}>
                    <Camera size={16} color="#FFFFFF" />
                  </View>
                </View>
              ) : (
                <View style={styles.avatarContainer}>
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>
                      {profile?.full_name?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <View style={styles.cameraIconContainer}>
                    <Camera size={16} color="#FFFFFF" />
                  </View>
                </View>
              )}
            </TouchableOpacity>
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
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
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
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 12,
    backgroundColor: '#3B82F6',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
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