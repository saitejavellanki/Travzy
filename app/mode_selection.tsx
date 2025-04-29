// app/mode_selection.tsx
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useMode } from './components/mode/ModeContext';
export default function ModeSelectionScreen() {
  const router = useRouter();
  const { setCurrentMode } = useMode();

  const handleSelectMode = (mode: 'p2p' | 'auto') => {
    setCurrentMode(mode);
    router.replace(`/(${mode})`);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Select Mode</Text>
      
      <TouchableOpacity 
        style={styles.modeButton} 
        onPress={() => handleSelectMode('p2p')}
      >
        <Text style={styles.buttonText}>P2P</Text>
        <Text style={styles.description}>Connect with drivers directly</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.modeButton}
        onPress={() => handleSelectMode('auto')}
      >
        <Text style={styles.buttonText}>Auto Booking</Text>
        <Text style={styles.description}>Book auto rickshaws on demand</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    fontFamily: 'Inter-Bold',
  },
  modeButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 5,
    fontFamily: 'Inter-SemiBold',
  },
  description: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  }
});