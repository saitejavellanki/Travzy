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
  KeyboardAvoidingView,
  Modal,
  FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebase/Config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Predefined locations
const LOCATIONS = [
  "Vijayawada", 
  "Guntur", 
  "Mangalagiri", 
  "Tenali", 
  "Thulluru", 
  "Mandhadam", 
  "Inavolu", 
  "Tadikonda", 
  "VIT-AP"
];

const OfferRide = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [pickupLocation, setPickupLocation] = useState('VIT-AP'); // Default to VIT-AP
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState('1');
  const [price, setPrice] = useState('0');
  const [vehicleName, setVehicleName] = useState('');

  // Dropdown states
  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);

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
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You must be logged in to offer a ride');
        setLoading(false);
        return;
      }

      // Create the ride object
      const rideData = {
        driver_id: currentUser.uid,
        pickup_location: pickupLocation,
        dropoff_location: dropoffLocation,
        departure_time: departureDateTime.toISOString(),
        available_seats: seats,
        price: ridePrice,
        status: 'active',
        vehicle_name: vehicleName,
        created_at: serverTimestamp()
      };

      // Insert into Firestore
      const ridesCollection = collection(db, 'rides');
      await addDoc(ridesCollection, rideData);

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

  // Location selection handler
  const selectLocation = (location: string, isPickup: boolean) => {
    if (isPickup) {
      setPickupLocation(location);
      setShowPickupDropdown(false);
    } else {
      setDropoffLocation(location);
      setShowDropoffDropdown(false);
    }
  };

  // Location dropdown component
  const LocationDropdown = ({ visible, onClose, onSelect, isPickup }) => (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownTitle}>
            {isPickup ? 'Select Pickup Location' : 'Select Dropoff Location'}
          </Text>
          <FlatList
            data={LOCATIONS}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.dropdownItem}
                onPress={() => onSelect(item)}
              >
                <Text style={styles.dropdownItemText}>{item}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
                  <TouchableOpacity 
                    style={styles.locationInputButton}
                    onPress={() => setShowPickupDropdown(true)}
                  >
                    <Text style={[styles.locationInput, !pickupLocation && styles.placeholderText]}>
                      {pickupLocation || "Select pickup location"}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.divider} />
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>DROPOFF</Text>
                  <TouchableOpacity 
                    style={styles.locationInputButton}
                    onPress={() => setShowDropoffDropdown(true)}
                  >
                    <Text style={[styles.locationInput, !dropoffLocation && styles.placeholderText]}>
                      {dropoffLocation || "Select dropoff location"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Location Dropdowns */}
            <LocationDropdown 
              visible={showPickupDropdown}
              onClose={() => setShowPickupDropdown(false)}
              onSelect={(location) => selectLocation(location, true)}
              isPickup={true}
            />
            <LocationDropdown 
              visible={showDropoffDropdown}
              onClose={() => setShowDropoffDropdown(false)}
              onSelect={(location) => selectLocation(location, false)}
              isPickup={false}
            />
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
  placeholderText: {
    color: '#aaa',
  },
  locationInputButton: {
    padding: 4,
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
  // Dropdown styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    maxHeight: '70%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  dropdownItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#333',
  },
});

export default OfferRide;