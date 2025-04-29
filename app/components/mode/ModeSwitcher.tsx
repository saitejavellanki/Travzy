// app/components/ModeSwitcher.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { RefreshCw } from 'lucide-react-native';
import { useMode } from './ModeContext';
export default function ModeSwitcher() {
  const router = useRouter();
  const { currentMode, setCurrentMode } = useMode();

  const handleSwitchMode = () => {
    const newMode = currentMode === 'p2p' ? 'auto' : 'p2p';
    setCurrentMode(newMode);
    router.replace(`/(${newMode})`);
  };

  return (
    <TouchableOpacity
      style={styles.switcherContainer}
      onPress={handleSwitchMode}
      activeOpacity={0.7}
    >
      <View style={styles.iconContainer}>
        <RefreshCw size={16} color="#ffffff" />
      </View>
      <Text style={styles.switcherText}>
        Switch to {currentMode === 'p2p' ? 'Auto' : 'P2P'} Mode
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  switcherContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  iconContainer: {
    marginRight: 6,
  },
  switcherText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  }
});