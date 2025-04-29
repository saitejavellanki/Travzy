import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { MapPin, Navigation, ChevronRight } from 'lucide-react-native';

export default function BookAutoScreen() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Auto</Text>
      </View>

      <View style={styles.locationCard}>
        <View style={styles.locationInputContainer}>
          <View style={styles.iconContainer}>
            <MapPin size={20} color="#3B82F6" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Pickup location"
            value={pickup}
            onChangeText={setPickup}
          />
        </View>
        
        <View style={styles.divider} />
        
        <View style={styles.locationInputContainer}>
          <View style={styles.iconContainer}>
            <Navigation size={20} color="#3B82F6" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Where to?"
            value={destination}
            onChangeText={setDestination}
          />
        </View>
      </View>

      <ScrollView style={styles.savedLocations}>
        <Text style={styles.sectionTitle}>Saved Locations</Text>
        
        <TouchableOpacity style={styles.savedLocationItem}>
          <View style={styles.savedLocationIcon}>
            <MapPin size={20} color="#64748B" />
          </View>
          <View style={styles.savedLocationDetails}>
            <Text style={styles.locationName}>Home</Text>
            <Text style={styles.locationAddress}>123 Main Street, City</Text>
          </View>
          <ChevronRight size={20} color="#64748B" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.savedLocationItem}>
          <View style={styles.savedLocationIcon}>
            <MapPin size={20} color="#64748B" />
          </View>
          <View style={styles.savedLocationDetails}>
            <Text style={styles.locationName}>Work</Text>
            <Text style={styles.locationAddress}>456 Office Park, City</Text>
          </View>
          <ChevronRight size={20} color="#64748B" />
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity 
        style={[styles.bookButton, (!pickup || !destination) && styles.bookButtonDisabled]}
        disabled={!pickup || !destination}
      >
        <Text style={styles.bookButtonText}>Book Auto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  locationCard: {
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginLeft: 32,
  },
  savedLocations: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  savedLocationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  savedLocationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  savedLocationDetails: {
    flex: 1,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  locationAddress: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  bookButton: {
    backgroundColor: '#3B82F6',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#94A3B8',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});