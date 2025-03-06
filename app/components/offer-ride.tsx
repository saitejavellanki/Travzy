// app/components/offer-ride.tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

const OfferRide = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  // Use string format for date and time to avoid date picker dependency
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('1');
  const [price, setPrice] = useState('0');

  const handleSubmit = async () => {
    // Validate form data
    if (!pickupLocation || !dropoffLocation || !departureDate || !departureTime || !availableSeats || !price) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Convert seats and price to numbers
    const seats = parseInt(availableSeats, 10);
    const ridePrice = parseFloat(price);

    if (isNaN(seats) || seats < 1) {
      Alert.alert('Error', 'Available seats must be a positive number');
      return;
    }

    if (isNaN(ridePrice) || ridePrice < 0) {
      Alert.alert('Error', 'Price must be a valid number');
      return;
    }

    // Validate date and time format (simple validation)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    const timeRegex = /^\d{2}:\d{2}$/;
    
    if (!dateRegex.test(departureDate)) {
      Alert.alert('Error', 'Date must be in YYYY-MM-DD format');
      return;
    }
    
    if (!timeRegex.test(departureTime)) {
      Alert.alert('Error', 'Time must be in HH:MM format');
      return;
    }

    // Combine date and time
    const departureDateTimeString = `${departureDate}T${departureTime}:00`;
    const departureDateTime = new Date(departureDateTimeString);

    if (isNaN(departureDateTime.getTime())) {
      Alert.alert('Error', 'Invalid date or time');
      return;
    }

    setLoading(true);

    try {
      // Get the current user
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        Alert.alert('Error', 'You must be logged in to offer a ride');
        setLoading(false);
        return;
      }

      // Create the ride object
      const rideData = {
        driver_id: session.user.id,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        departure_time: departureDateTime.toISOString(),
        available_seats: seats,
        price: ridePrice,
        status: 'active'
      };

      // Insert into Supabase
      const { data, error } = await supabase
        .from('rides')
        .insert(rideData)
        .select();

      if (error) throw error;

      Alert.alert(
        'Success',
        'Your ride has been posted successfully',
        [{ text: 'OK', onPress: () => router.push('/rides') }]
      );
    } catch (error: any) {
      console.error('Error creating ride:', error);
      Alert.alert('Error', error.message || 'Failed to create ride');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Offer a Ride</Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Pickup Location</Text>
        <TextInput
          style={styles.input}
          value={pickupLocation}
          onChangeText={setPickupLocation}
          placeholder="Enter pickup location"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Dropoff Location</Text>
        <TextInput
          style={styles.input}
          value={dropoffLocation}
          onChangeText={setDropoffLocation}
          placeholder="Enter dropoff location"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Departure Date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          value={departureDate}
          onChangeText={setDepartureDate}
          placeholder="2025-03-06"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Departure Time (HH:MM)</Text>
        <TextInput
          style={styles.input}
          value={departureTime}
          onChangeText={setDepartureTime}
          placeholder="14:30"
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Available Seats</Text>
        <TextInput
          style={styles.input}
          value={availableSeats}
          onChangeText={setAvailableSeats}
          keyboardType="numeric"
          placeholder="1"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Price ($)</Text>
        <TextInput
          style={styles.input}
          value={price}
          onChangeText={setPrice}
          keyboardType="numeric"
          placeholder="0.00"
        />
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Offer Ride</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#0066ff',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OfferRide;