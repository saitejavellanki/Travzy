import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RidesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Rides</Text>
      {/* Your rides screen content will go here */}
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
  },
});