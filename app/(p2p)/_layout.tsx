// app/(p2p)/_layout.tsx
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { HomeIcon as Home, Car, MessageSquare, User } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useMode } from '../components/mode/ModeContext';
import { TouchableOpacity } from 'react-native';

export default function AppLayout() {
  const router = useRouter();
  const { currentMode, setCurrentMode } = useMode();

  const handleSwitchMode = () => {
    const newMode = currentMode === 'p2p' ? 'auto' : 'p2p';
    setCurrentMode(newMode);
    router.replace(`/(${newMode})`);
  };

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
          tabBarIcon: ({ color, size }) => <MessageSquare size={size} color={color} />,
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
});