import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Image, Keyboard, Alert } from 'react-native';
import { MapPin, Navigation, ChevronRight, X, Crosshair, Search, XCircle } from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';
import { GOOGLE_API } from '../apiKeys';

// Add your Google API key here
const GOOGLE_PLACES_API_KEY = GOOGLE_API;
const newId = uuidv4();

// VIT-AP University coordinates and address
const VIT_AP_LOCATION = {
  description: 'VIT-AP University',
  address: 'Near Vijayawada, Inavolu, Andhra Pradesh 522237',
  geometry: {
    location: {
      lat: 16.4906,
      lng: 80.5192
    }
  }
};

// Maximum allowed distance (in km)
const MAX_DISTANCE_KM = 60;

export default function BookAutoScreen() {
  const [pickup, setPickup] = useState(VIT_AP_LOCATION.description);
  const [pickupDetails, setPickupDetails] = useState(VIT_AP_LOCATION);
  const [destination, setDestination] = useState('');
  const [destinationDetails, setDestinationDetails] = useState(null);
  const [savedLocations, setSavedLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPricing, setShowPricing] = useState(false);
  const [calculatingPrice, setCalculatingPrice] = useState(false);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [prices, setPrices] = useState({
    regular: 0,
    premium: 0,
    shared: 0
  });
  const [selectedRideType, setSelectedRideType] = useState('regular');
  
  // For place input focus states
  const [pickupFocused, setPickupFocused] = useState(false);
  const [destinationFocused, setDestinationFocused] = useState(false);
  
  // For location permission tracking
  const [locationPermission, setLocationPermission] = useState(null);
  const [fetchingCurrentLocation, setFetchingCurrentLocation] = useState(false);
  
  // References for GooglePlacesAutocomplete
  const pickupRef = useRef(null);
  const destinationRef = useRef(null);

  useEffect(() => {
    fetchSavedLocations();
    checkLocationPermission();
  }, []);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationPermission(status === 'granted');
    } catch (err) {
      console.error('Error checking location permissions:', err);
      setLocationPermission(false);
    }
  };

  const fetchSavedLocations = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;

      if (!currentUser) {
        // If not logged in, don't attempt to fetch saved locations
        setLoading(false);
        return;
      }

      // Query saved_locations collection for the current user
      const locationsQuery = query(
        collection(db, 'saved_locations'),
        where('user_id', '==', currentUser.uid)
      );

      const querySnapshot = await getDocs(locationsQuery);
      
      const locations = [];
      querySnapshot.forEach((doc) => {
        locations.push({
          id: doc.id,
          ...doc.data()
        });
      });

      setSavedLocations(locations);
      setError(null);
    } catch (err) {
      console.error('Error fetching saved locations:', err);
      setError('Failed to load saved locations');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSavedLocation = (location, type) => {
    // For both pickup and destination, check if it's within range before setting
    const distance = calculateHaversineDistance(
      { latitude: VIT_AP_LOCATION.geometry.location.lat, longitude: VIT_AP_LOCATION.geometry.location.lng },
      { latitude: location.latitude || 0, longitude: location.longitude || 0 }
    );
    
    if (distance > MAX_DISTANCE_KM) {
      showDistanceAlert(type);
      return;
    }
    
    if (type === 'pickup') {
      setPickup(location.address);
      setPickupDetails({
        description: location.name,
        address: location.address,
        geometry: {
          location: {
            lat: location.latitude || 0,
            lng: location.longitude || 0
          }
        }
      });
      if (pickupRef.current) {
        pickupRef.current.setAddressText(location.address);
      }
    } else {
      setDestination(location.address);
      setDestinationDetails({
        description: location.name,
        address: location.address,
        geometry: {
          location: {
            lat: location.latitude || 0,
            lng: location.longitude || 0
          }
        }
      });
      if (destinationRef.current) {
        destinationRef.current.setAddressText(location.address);
      }
    }
  };
  // Get current location for pickup
  const getCurrentLocation = async () => {
    if (!locationPermission) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied');
        return;
      }
      setLocationPermission(true);
    }
    
    try {
      setFetchingCurrentLocation(true);
      
      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High
      });
      
      // Check if the location is within 60KM radius of VIT-AP
      const distance = calculateHaversineDistance(
        { latitude: VIT_AP_LOCATION.geometry.location.lat, longitude: VIT_AP_LOCATION.geometry.location.lng },
        { latitude: location.coords.latitude, longitude: location.coords.longitude }
      );
      
      if (distance > MAX_DISTANCE_KM) {
        // First stop the loading indicator
        setFetchingCurrentLocation(false);
        // Then show the alert with isCurrentLocation flag set to true
        showDistanceAlert('pickup', true);
        return;
      }
      
      // Reverse geocode to get address
      const addresses = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude
      });
      
      if (addresses && addresses.length > 0) {
        const address = addresses[0];
        const formattedAddress = 
          `${address.name || ''} ${address.street || ''}, ${address.city || ''}, ${address.region || ''}`.trim();
        
        setPickup(formattedAddress);
        setPickupDetails({
          description: formattedAddress,
          address: formattedAddress,
          geometry: {
            location: {
              lat: location.coords.latitude,
              lng: location.coords.longitude
            }
          }
        });
        
        if (pickupRef.current) {
          pickupRef.current.setAddressText(formattedAddress);
        }
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      alert('Could not get your current location');
      
      // Reset to VIT-AP if there's an error
      setPickup(VIT_AP_LOCATION.description);
      setPickupDetails(VIT_AP_LOCATION);
      if (pickupRef.current) {
        pickupRef.current.setAddressText(VIT_AP_LOCATION.description);
      }
    } finally {
      setFetchingCurrentLocation(false);
    }
  };


  // Function to show distance limit alert
 // Function to show distance limit alert
const showDistanceAlert = (type, isCurrentLocation = false) => {
  Alert.alert(
    "Distance Limit Exceeded",
    `Please select a ${type} within 60km of VIT-AP University.`,
    [
      { 
        text: "OK", 
        onPress: () => {
          // For current location button or pickup selection beyond range, reset to VIT-AP
          if (type === 'pickup') {
            setPickup(VIT_AP_LOCATION.description);
            setPickupDetails(VIT_AP_LOCATION);
            if (pickupRef.current) {
              pickupRef.current.setAddressText(VIT_AP_LOCATION.description);
            }
          } 
          // For destination, clear the field
          else {
            setDestination('');
            setDestinationDetails(null);
            if (destinationRef.current) {
              destinationRef.current.setAddressText('');
            }
          }
        }
      }
    ]
  );
};
  // Clear input fields
  const clearField = (type) => {
    if (type === 'pickup') {
      // Instead of resetting to VIT-AP, just clear the field
      setPickup('');
      setPickupDetails(null);
      if (pickupRef.current) {
        pickupRef.current.setAddressText('');
      }
    } else {
      // For destination, keep existing clear logic
      setDestination('');
      setDestinationDetails(null);
      if (destinationRef.current) {
        destinationRef.current.setAddressText('');
      }
    }
  };
  
  // Calculate distance between two coordinates using the Distance Matrix API
  const calculateDistanceWithAPI = async (origin, destination) => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.lat},${origin.lng}&destinations=${destination.lat},${destination.lng}&mode=driving&key=${GOOGLE_PLACES_API_KEY}`
      );
      
      const data = await response.json();
      
      if (data.status === 'OK' && data.rows[0].elements[0].status === 'OK') {
        const distanceText = data.rows[0].elements[0].distance.text;
        const distanceValue = data.rows[0].elements[0].distance.value / 1000; // Convert meters to km
        
        const durationText = data.rows[0].elements[0].duration.text;
        const durationValue = data.rows[0].elements[0].duration.value / 60; // Convert seconds to minutes
        
        return {
          distance: distanceValue,
          duration: durationValue
        };
      } else {
        throw new Error('Could not calculate distance');
      }
    } catch (error) {
      console.error('Error calculating distance with API:', error);
      
      // Fallback to Haversine formula
      const distanceKm = calculateHaversineDistance(
        { latitude: origin.lat, longitude: origin.lng },
        { latitude: destination.lat, longitude: destination.lng }
      );
      
      return {
        distance: distanceKm,
        duration: calculateDuration(distanceKm)
      };
    }
  };
  
  // Calculate distance between two coordinates using Haversine formula (fallback)
  const calculateHaversineDistance = (coord1, coord2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    
    return distance;
  };
  
  // Check if location is within 60km radius of VIT-AP
  const isWithinMaxDistance = (details) => {
    if (!details || !details.geometry || !details.geometry.location) return false;
    
    const distance = calculateHaversineDistance(
      { latitude: VIT_AP_LOCATION.geometry.location.lat, longitude: VIT_AP_LOCATION.geometry.location.lng },
      { latitude: details.geometry.location.lat, longitude: details.geometry.location.lng }
    );
    
    return distance <= MAX_DISTANCE_KM;
  };
  
  // Calculate estimated travel time (simple approximation)
  const calculateDuration = (distanceKm) => {
    // Assuming an average speed of 30 km/h in urban areas
    const averageSpeedKmh = 30;
    return (distanceKm / averageSpeedKmh) * 60; // Duration in minutes
  };
  
  // Calculate prices based on distance and ride type
  const calculatePrices = (distanceKm) => {
    // Base pricing model (these values would ideally come from your backend)
    const basePrice = 20; // Base fare in rupees
    const perKmRegular = 12; // Per km fare for regular auto
    const perKmPremium = 18; // Per km fare for premium auto
    const perKmShared = 8; // Per km fare for shared auto
    
    return {
      regular: Math.round(basePrice + (distanceKm * perKmRegular)),
      premium: Math.round(basePrice * 1.2 + (distanceKm * perKmPremium)),
      shared: Math.round(basePrice * 0.8 + (distanceKm * perKmShared))
    };
  };
  
  const handleBookAuto = async () => {
    if (!pickup || !destination) return;
    
    // Dismiss keyboard
    Keyboard.dismiss();
    
    try {
      setCalculatingPrice(true);
      setShowPricing(true);
      
      if (!pickupDetails || !destinationDetails) {
        throw new Error('Location details not available');
      }
      
      // Get coordinates for pickup and destination
      const pickupCoords = pickupDetails.geometry.location;
      const destCoords = destinationDetails.geometry.location;
      
      // Calculate distance and duration using Google API
      const routeDetails = await calculateDistanceWithAPI(pickupCoords, destCoords);
      
      setDistance(routeDetails.distance);
      setDuration(routeDetails.duration);
      
      // Calculate prices
      const calculatedPrices = calculatePrices(routeDetails.distance);
      setPrices(calculatedPrices);
      
    } catch (err) {
      console.error('Error calculating ride details:', err);
      setError('Failed to calculate ride prices. Please try again.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Handle booking confirmation and navigate to RideSearchScreen
  const confirmRideBooking = () => {
    // Check if destination details are available
    if (!pickupDetails || !destinationDetails) {
      alert('Location details are incomplete. Please try again.');
      return;
    }
    
    // Get the price for the selected ride type
    const selectedPrice = prices[selectedRideType];
    
    // Close the modal
    setShowPricing(false);
    
    // Store ride data globally for access in the next screen
    global.rideData = {
      pickup: pickupDetails.description,
      destination: destinationDetails.description,
      distance,
      duration,
      price: selectedPrice,
      rideType: selectedRideType
    };
    
    // Navigate with just the path, no parameters
    router.push('/components/ride/RideSearchScreen');
  }

  // Close keyboard when tapping outside input fields
  const handlePressOutside = () => {
    Keyboard.dismiss();
    setPickupFocused(false);
    setDestinationFocused(false);
  };

  useEffect(() => {
    // Set VIT-AP as default pickup on component mount only
    if (pickupRef.current) {
      setPickup(VIT_AP_LOCATION.description);
      setPickupDetails(VIT_AP_LOCATION);
      setTimeout(() => {
        pickupRef.current.setAddressText(VIT_AP_LOCATION.description);
      }, 100); // Small delay to ensure ref is ready
    }
  }, []);

//useEffect to handle changes to pickup/destination state
useEffect(() => {
  if (pickupRef.current) {
    pickupRef.current.setAddressText(pickup);
  }
}, [pickup]);

useEffect(() => {
  if (destinationRef.current) {
    destinationRef.current.setAddressText(destination);
  }
}, [destination]);

//google places handling
const renderGooglePlacesInput = (type) => {
  const isPickup = type === 'pickup';
  const placeholder = isPickup ? 'Pickup location' : 'Where to?';
  const icon = isPickup ? <MapPin size={20} color="#3B82F6" /> : <Navigation size={20} color="#3B82F6" />;
  const ref = isPickup ? pickupRef : destinationRef;
  const setFocused = isPickup ? setPickupFocused : setDestinationFocused;
  
  return (
    <View style={styles.locationInputContainer}>
      <View style={styles.iconContainer}>
        {icon}
      </View>
      <GooglePlacesAutocomplete
        ref={ref}
        placeholder={placeholder}
        minLength={2}
        onPress={(data, details = null) => {
          if (isPickup) {
            // Apply distance check for pickup as well
            if (details && !isWithinMaxDistance(details)) {
              showDistanceAlert('pickup');
              return;
            }
            
            setPickup(data.description);
            setPickupDetails(details || data);
          } else {
            // For destination, check if it's within the maximum distance
            if (details && !isWithinMaxDistance(details)) {
              showDistanceAlert('destination');
              return;
            }
            
            setDestination(data.description);
            setDestinationDetails(details || data);
          }
          setFocused(false);
        }}
        returnKeyType={'default'}
        fetchDetails={true}
        enablePoweredByContainer={false}
        query={{
          key: GOOGLE_PLACES_API_KEY,
          language: 'en',
          components: 'country:in', // Limit results to India
        }}
        textInputProps={{
          onFocus: () => setFocused(true),
          onBlur: () => setFocused(false),
          placeholderTextColor: '#94A3B8',
        }}
        styles={{
          textInput: styles.googlePlacesInput,
          container: styles.googlePlacesContainer,
          listView: styles.googlePlacesList,
          row: styles.googlePlacesRow,
          description: styles.googlePlacesDescription,
          separator: styles.googlePlacesSeparator,
          poweredContainer: { display: 'none' },
        }}
        renderRow={(data) => (
          <View style={styles.suggestionItem}>
            <View style={styles.suggestionIcon}>
              <Search size={18} color="#64748B" />
            </View>
            <View style={styles.suggestionDetails}>
              <Text style={styles.suggestionName}>{data.description}</Text>
              <Text style={styles.suggestionAddress}>{data.structured_formatting?.secondary_text || ''}</Text>
            </View>
          </View>
        )}
        debounce={400}
        onFail={(error) => console.error("Google Places Error:", error)}
      />
      
      {isPickup ? (
        <View style={styles.inputButtonsContainer}>
          <TouchableOpacity 
            style={styles.currentLocationBtn}
            onPress={getCurrentLocation}
            disabled={fetchingCurrentLocation}
          >
            {fetchingCurrentLocation ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <Crosshair size={20} color="#3B82F6" />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.clearFieldBtn}
            onPress={() => clearField('pickup')}
          >
            <XCircle size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity 
          style={styles.clearFieldBtn}
          onPress={() => clearField('destination')}
        >
          <XCircle size={20} color="#64748B" />
        </TouchableOpacity>
      )}
    </View>
  );
};

  return (
    <TouchableOpacity 
      activeOpacity={1} 
      style={styles.container}
      onPress={handlePressOutside}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Book Auto</Text>
      </View>

      <View style={styles.locationCard}>
        {renderGooglePlacesInput('pickup')}
        
        <View style={styles.divider} />
        
        {renderGooglePlacesInput('destination')}
      </View>

      <View style={[styles.savedLocationsContainer, (pickupFocused || destinationFocused) && styles.hidden]}>
        <Text style={styles.sectionTitle}>Saved Locations</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3B82F6" />
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : savedLocations.length === 0 ? (
          <Text style={styles.noLocationsText}>No saved locations found</Text>
        ) : (
          <ScrollView 
            style={styles.savedLocations}
            keyboardShouldPersistTaps="handled"
          >
            {savedLocations.map((location) => (
              <TouchableOpacity 
                key={location.id} 
                style={styles.savedLocationItem}
                onPress={() => handleSelectSavedLocation(location, 'pickup')}
              >
                <View style={styles.savedLocationIcon}>
                  <MapPin size={20} color="#64748B" />
                </View>
                <View style={styles.savedLocationDetails}>
                  <Text style={styles.locationName}>{location.name}</Text>
                  <Text style={styles.locationAddress}>{location.address}</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => handleSelectSavedLocation(location, 'destination')}
                >
                  <ChevronRight size={20} color="#64748B" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <TouchableOpacity 
        style={[
          styles.bookButton, 
          (!pickup || !destination) && styles.bookButtonDisabled,
          (pickupFocused || destinationFocused) && styles.hidden
        ]}
        disabled={!pickup || !destination}
        onPress={handleBookAuto}
      >
        <Text style={styles.bookButtonText}>Book Auto</Text>
      </TouchableOpacity>
      
      {/* Pricing Modal */}
      <Modal
        visible={showPricing}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Choose Ride</Text>
              <TouchableOpacity onPress={() => setShowPricing(false)}>
                <X size={24} color="#0F172A" />
              </TouchableOpacity>
            </View>
            
            {calculatingPrice ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.calculatingText}>Calculating prices...</Text>
              </View>
            ) : (
              <>
                <View style={styles.rideDetails}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{distance.toFixed(2)} km</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Est. Time</Text>
                    <Text style={styles.detailValue}>{Math.round(duration)} min</Text>
                  </View>
                </View>
                
                <Text style={styles.optionsTitle}>Available Options</Text>
                
                <TouchableOpacity 
                  style={[styles.rideOption, selectedRideType === 'regular' && styles.selectedRideOption]}
                  onPress={() => setSelectedRideType('regular')}
                >
                  <View style={styles.rideOptionContent}>
                    <View style={styles.rideImageContainer}>
                      <Image 
                        source={{uri: 'https://images.unsplash.com/photo-1583001078167-c7fd713bd123?q=80&w=720'}} 
                        style={styles.rideImage} 
                      />
                    </View>
                    <View style={styles.rideInfo}>
                      <Text style={styles.rideType}>Regular Auto</Text>
                      <Text style={styles.rideDesc}>Economical and reliable</Text>
                    </View>
                  </View>
                  <Text style={styles.ridePrice}>₹{prices.regular}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.rideOption, selectedRideType === 'premium' && styles.selectedRideOption]}
                  onPress={() => setSelectedRideType('premium')}
                >
                  <View style={styles.rideOptionContent}>
                    <View style={styles.rideImageContainer}>
                      <Image 
                        source={{uri: 'https://images.unsplash.com/photo-1618199173830-4e44d05f5832?q=80&w=720'}} 
                        style={styles.rideImage} 
                      />
                    </View>
                    <View style={styles.rideInfo}>
                      <Text style={styles.rideType}>Premium Auto</Text>
                      <Text style={styles.rideDesc}>More comfort and space</Text>
                    </View>
                  </View>
                  <Text style={styles.ridePrice}>₹{prices.premium}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.rideOption, selectedRideType === 'shared' && styles.selectedRideOption]}
                  onPress={() => setSelectedRideType('shared')}
                >
                  <View style={styles.rideOptionContent}>
                    <View style={styles.rideImageContainer}>
                      <Image 
                        source={{uri: 'https://images.unsplash.com/photo-1583001835404-0f3ae9c3508d?q=80&w=720'}} 
                        style={styles.rideImage} 
                      />
                    </View>
                    <View style={styles.rideInfo}>
                      <Text style={styles.rideType}>Shared Auto</Text>
                      <Text style={styles.rideDesc}>Eco-friendly and affordable</Text>
                    </View>
                  </View>
                  <Text style={styles.ridePrice}>₹{prices.shared}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.confirmButton}
                  onPress={confirmRideBooking}
                >
                  <Text style={styles.confirmButtonText}>Confirm {selectedRideType} Auto</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
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
    zIndex: 1,
  },
  locationInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  googlePlacesContainer: {
    flex: 1,
    zIndex: 2,
  },
  googlePlacesInput: {
    height: 40,
    fontSize: 16,
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
    backgroundColor: 'transparent',
  },
  googlePlacesList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: 'absolute',
    top: 45,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  googlePlacesRow: {
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  googlePlacesDescription: {
    fontSize: 15,
  },
  googlePlacesSeparator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginLeft: 32,
  },
  inputButtonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocationBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
  },
  clearFieldBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  // Suggestions styles
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  suggestionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionDetails: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  suggestionAddress: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  savedLocationsContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    maxHeight: '45%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  savedLocations: {
    maxHeight: 300,
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
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
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
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginVertical: 10,
  },
  noLocationsText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginVertical: 10,
    textAlign: 'center',
  },
  hidden: {
    display: 'none',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  calculatingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  rideDetails: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailItem: {
    flex: 1,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 12,
    fontFamily: 'Inter-SemiBold',
  },
  rideOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  selectedRideOption: {
    borderColor: '#3B82F6',
    backgroundColor: '#EFF6FF',
  },
  rideOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rideImageContainer: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
  },
  rideImage: {
    width: '100%',
    height: '100%',
  },
  rideInfo: {
    flex: 1,
  },
  rideType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  rideDesc: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});