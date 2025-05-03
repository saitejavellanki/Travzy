// app/(p2p)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { HomeIcon as Home, Car, MessageSquare, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMode } from '../components/mode/ModeContext';
import { TouchableOpacity } from 'react-native';
import { useEffect, useState } from 'react';
import { auth, db } from '../../firebase/Config';
import { collection, query, where, getDocs, onSnapshot } from 'firebase/firestore';

export default function AppLayout() {
  const router = useRouter();
  const { currentMode, setCurrentMode } = useMode();
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const handleSwitchMode = () => {
    const newMode = currentMode === 'p2p' ? 'auto' : 'p2p';
    setCurrentMode(newMode);
    router.replace(`/(${newMode})`);
  };

  // Monitor pending ride requests for the current user
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const userId = currentUser.uid;
    
    // Set up listener for ride requests
    const setupRequestsListener = async () => {
      try {
        // First get the driver's rides
        const ridesQuery = query(
          collection(db, 'rides'),
          where('driver_id', '==', userId),
          where('status', '==', 'active')
        );
        
        const ridesSnapshot = await getDocs(ridesQuery);
        
        if (ridesSnapshot.empty) {
          setPendingRequestsCount(0);
          return;
        }
        
        // Get all ride IDs
        const rideIds = [];
        ridesSnapshot.forEach((doc) => {
          rideIds.push(doc.id);
        });
        
        // If no rides, exit
        if (rideIds.length === 0) {
          setPendingRequestsCount(0);
          return;
        }
        
        // Listen for pending requests for any of the driver's rides
        const requestsQuery = query(
          collection(db, 'ride_requests'),
          where('ride_id', 'in', rideIds),
          where('status', '==', 'pending')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
          setPendingRequestsCount(snapshot.docs.length);
        }, (error) => {
          console.error('Error listening to ride requests:', error);
        });
        
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up ride requests listener:', error);
      }
    };
    
    const unsubscribe = setupRequestsListener();
    
    return () => {
      // Clean up the listener when component unmounts
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        headerTitle: 'P2P Mode',
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontFamily: 'Inter-SemiBold',
          fontSize: 18,
        },
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: {
          fontFamily: 'Inter-Medium',
          fontSize: 12,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="rides"
        options={{
          title: 'My Rides',
          tabBarIcon: ({ color, size }) => <Car size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="mode-switch"
        options={{
          title: 'Mode',
          tabBarButton: () => (
            <TouchableOpacity
              style={styles.switchContainer}
              onPress={handleSwitchMode}
              activeOpacity={0.8}
            >
              <View style={styles.switchTrack}>
                <View style={styles.switchLabels}>
                  <Text style={[styles.switchLabel, styles.activeSwitchLabel]}>P2P</Text>
                  <Text style={styles.switchLabel}>Auto</Text>
                </View>
                <View style={[styles.switchThumb, { left: 2 }]} />
              </View>
            </TouchableOpacity>
          ),
          listeners: () => ({
            tabPress: (e) => {
              e.preventDefault();
            },
          }),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size }) => (
            <View>
              <MessageSquare size={size} color={color} />
              {pendingRequestsCount > 0 && (
                <View style={styles.notificationDot} />
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  switchContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  switchTrack: {
    width: 80,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    position: 'relative',
  },
  switchLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  switchLabel: {
    color: '#64748B',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    zIndex: 1,
  },
  activeSwitchLabel: {
    color: '#FFFFFF',
  },
  switchThumb: {
    position: 'absolute',
    width: 40,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#3B82F6',
    top: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
  },
  notificationDot: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#EF4444', // Red notification dot
    borderRadius: 6,
    width: 8,
    height: 8,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
});