import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth } from '../../firebase/Config';
import { db } from '../../firebase/Config';

export function useAdminAuthCheck() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          // User is logged in, check if they are an admin
          const adminQuery = query(
            collection(db, 'admins'),
            where('uid', '==', user.uid),
            limit(1)
          );
          
          const adminSnapshot = await getDocs(adminQuery);
          
          if (adminSnapshot.empty) {
            // User is not an admin
            console.log('User is not an admin');
            setIsAdmin(false);
            setIsLoading(false);
            router.replace('/(auth)/login');
            return;
          }
          
          // User is an admin
          console.log('User is an admin');
          setIsAdmin(true);
        } else {
          // User is not logged in
          console.log('User is not logged in');
          setIsAdmin(false);
          router.replace('/(admin)/login');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { isLoading, isAdmin };
}

export function AdminAuthWrapper({ children }) {
  const { isLoading, isAdmin } = useAdminAuthCheck();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Verifying admin access...</Text>
      </View>
    );
  }

  if (!isAdmin) {
    return null; // Router will handle the redirect
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
});