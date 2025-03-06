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
  KeyboardAvoidingView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const OfferRide = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('1');
  const [price, setPrice] = useState('0');
  const [vehicleName, setVehicleName] = useState('');

  const handleSubmit = async () => {
    // Validate form data
    if (!pickupLocation || !dropoffLocation || !departureDate || !departureTime || !availableSeats || !price || !vehicleName) {
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
        status: 'active',
        vehicle_name: vehicleName
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
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.title}>Offer a Ride</Text>
          </View>

          <View style={styles.formSection}>
            <View style={styles.locationContainer}>
              <View style={styles.locationIconContainer}>
                <View style={styles.originDot} />
                <View style={styles.verticalLine} />
                <View style={styles.destinationDot} />
              </View>
              
              <View style={styles.locationInputsContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>PICKUP</Text>
                  <TextInput
                    style={styles.locationInput}
                    value={pickupLocation}
                    onChangeText={setPickupLocation}
                    placeholder="Enter pickup location"
                    placeholderTextColor="#aaa"
                  />
                </View>
                <View style={styles.divider} />
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>DROPOFF</Text>
                  <TextInput
                    style={styles.locationInput}
                    value={dropoffLocation}
                    onChangeText={setDropoffLocation}
                    placeholder="Enter dropoff location"
                    placeholderTextColor="#aaa"
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Vehicle Name</Text>
              <TextInput
                style={styles.input}
                value={vehicleName}
                onChangeText={setVehicleName}
                placeholder="Enter your vehicle name/model"
                placeholderTextColor="#aaa"
              />
            </View>
          </View>

          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Travel Details</Text>
            
            <View style={styles.twoColumnContainer}>
              <View style={styles.columnItem}>
                <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={departureDate}
                  onChangeText={setDepartureDate}
                  placeholder="2025-03-06"
                  placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
              
              <View style={styles.columnItem}>
                <Text style={styles.label}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.input}
                  value={departureTime}
                  onChangeText={setDepartureTime}
                  placeholder="14:30"
                  placeholderTextColor="#aaa"
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            </View>
            
            <View style={styles.twoColumnContainer}>
              <View style={styles.columnItem}>
                <Text style={styles.label}>Available Seats</Text>
                <TextInput
                  style={styles.input}
                  value={availableSeats}
                  onChangeText={setAvailableSeats}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#aaa"
                />
              </View>
              
              <View style={styles.columnItem}>
                <Text style={styles.label}>Price ($)</Text>
                <TextInput
                  style={styles.input}
                  value={price}
                  onChangeText={setPrice}
                  keyboardType="numeric"
                  placeholder="0.00"
                  placeholderTextColor="#aaa"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.button} 
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.buttonText}>OFFER RIDE</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f7',
  },
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066ff',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  formGroup: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    color: '#333',
  },
  locationContainer: {
    flexDirection: 'row',
  },
  locationIconContainer: {
    width: 24,
    alignItems: 'center',
    marginRight: 12,
    paddingTop: 24,
  },
  originDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#0066ff',
  },
  verticalLine: {
    width: 2,
    height: 30,
    backgroundColor: '#ddd',
    marginVertical: 6,
  },
  destinationDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ff4500',
  },
  locationInputsContainer: {
    flex: 1,
  },
  inputContainer: {
    paddingVertical: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777',
    marginBottom: 4,
  },
  locationInput: {
    fontSize: 16,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  twoColumnContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  columnItem: {
    width: '48%',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#0066ff',
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
    elevation: 2,
    shadowColor: '#0066ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});

export default OfferRide;