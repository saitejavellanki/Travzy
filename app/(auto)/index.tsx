import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Image, Keyboard } from 'react-native';
import { MapPin, Navigation, ChevronRight, X, Crosshair, Search } from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { collection, getDocs, query, where } from 'firebase/firestore';
import * as Location from 'expo-location';
import { router } from 'expo-router'; // Import router from expo-router

export default function BookAutoScreen() { // Remove navigation prop
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
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
  
  // For place suggestions
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeField, setActiveField] = useState(null); // 'pickup' or 'destination'
  const [fetchingSuggestions, setFetchingSuggestions] = useState(false);
  
  // For location permission tracking
  const [locationPermission, setLocationPermission] = useState(null);
  const [fetchingCurrentLocation, setFetchingCurrentLocation] = useState(false);
  
  // Debounce timer for search suggestions
  const searchTimer = useRef(null);

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
    if (type === 'pickup') {
      setPickup(location.address);
    } else {
      setDestination(location.address);
    }
    setShowSuggestions(false);
  };
  
  // Search for place suggestions based on input text
  const searchPlaces = async (text, fieldType) => {
    if (text.length < 3) {
      setPlaceSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setFetchingSuggestions(true);
      setActiveField(fieldType);
      setShowSuggestions(true);
      
      // Use Expo Location's geocodeAsync as a simple suggestion engine
      // In a production app, you might want to use Google Places API or similar service
      const results = await Location.geocodeAsync(text);
      
      // Mock suggestions for demo purposes (since geocodeAsync doesn't provide multiple suggestions)
      // In production, replace this with real API calls to a places service
      const mockSuggestions = [
        { id: '1', name: `${text} Main Street`, address: `${text} Main Street, City` },
        { id: '2', name: `${text} Center`, address: `${text} Shopping Center, Downtown` },
        { id: '3', name: `${text} Park`, address: `${text} Park Road, City Central` },
      ];
      
      if (results && results.length > 0) {
        // Add the actual geocoded result to our mock suggestions
        mockSuggestions.unshift({
          id: '0',
          name: text,
          address: text,
          coordinates: {
            latitude: results[0].latitude,
            longitude: results[0].longitude
          }
        });
      }
      
      setPlaceSuggestions(mockSuggestions);
    } catch (err) {
      console.error('Error fetching place suggestions:', err);
    } finally {
      setFetchingSuggestions(false);
    }
  };
  
  // Handle text input change with debounce
  const handleInputChange = (text, fieldType) => {
    if (fieldType === 'pickup') {
      setPickup(text);
    } else {
      setDestination(text);
    }
    
    // Clear previous timer
    if (searchTimer.current) {
      clearTimeout(searchTimer.current);
    }
    
    // Set up new timer for debounce
    searchTimer.current = setTimeout(() => {
      searchPlaces(text, fieldType);
    }, 700);
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
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Error getting current location:', err);
      alert('Could not get your current location');
    } finally {
      setFetchingCurrentLocation(false);
    }
  };
  
  // Get coordinates from address using Geocoding
  const getCoordinates = async (address) => {
    try {
      const result = await Location.geocodeAsync(address);
      
      if (result && result.length > 0) {
        return {
          latitude: result[0].latitude,
          longitude: result[0].longitude
        };
      }
      
      throw new Error('Location not found');
    } catch (err) {
      console.error('Geocoding error:', err);
      throw err;
    }
  };
  
  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (coord1, coord2) => {
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
    
    // Dismiss keyboard and suggestions
    Keyboard.dismiss();
    setShowSuggestions(false);
    
    try {
      setCalculatingPrice(true);
      setShowPricing(true);
      
      // Get coordinates for pickup and destination
      const pickupCoords = await getCoordinates(pickup);
      const destCoords = await getCoordinates(destination);
      
      // Calculate distance
      const distanceInKm = calculateDistance(pickupCoords, destCoords);
      setDistance(distanceInKm);
      
      // Calculate duration
      const durationInMinutes = calculateDuration(distanceInKm);
      setDuration(durationInMinutes);
      
      // Calculate prices
      const calculatedPrices = calculatePrices(distanceInKm);
      setPrices(calculatedPrices);
      
    } catch (err) {
      console.error('Error calculating ride details:', err);
      setError('Failed to calculate ride prices. Please try again.');
    } finally {
      setCalculatingPrice(false);
    }
  };

  // Handle suggestion selection
  const handleSelectSuggestion = (suggestion) => {
    if (activeField === 'pickup') {
      setPickup(suggestion.address);
    } else {
      setDestination(suggestion.address);
    }
    setShowSuggestions(false);
  };

  // Close suggestions when tapping outside
  const handlePressOutside = () => {
    if (showSuggestions) {
      setShowSuggestions(false);
      Keyboard.dismiss();
    }
  };

  // Handle booking confirmation and navigate to RideSearchScreen
  const confirmRideBooking = () => {
    // Get the price for the selected ride type
    const selectedPrice = prices[selectedRideType];
    
    // Close the modal
    setShowPricing(false);
    
    // Use router.push instead of navigation.navigate
    router.push({
      pathname: '/RideSearchScreen.tsx',
      params: {
        pickup,
        destination,
        distance,
        duration,
        price: selectedPrice,
        rideType: selectedRideType
      }
    });
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
        <View style={styles.locationInputContainer}>
          <View style={styles.iconContainer}>
            <MapPin size={20} color="#3B82F6" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Pickup location"
            value={pickup}
            onChangeText={(text) => handleInputChange(text, 'pickup')}
            onFocus={() => {
              setActiveField('pickup');
              if (pickup.length >= 3) {
                setShowSuggestions(true);
                searchPlaces(pickup, 'pickup');
              }
            }}
          />
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
            onChangeText={(text) => handleInputChange(text, 'destination')}
            onFocus={() => {
              setActiveField('destination');
              if (destination.length >= 3) {
                setShowSuggestions(true);
                searchPlaces(destination, 'destination');
              }
            }}
          />
        </View>
      </View>

      {/* Place Suggestions */}
      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          {fetchingSuggestions ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
            </View>
          ) : placeSuggestions.length > 0 ? (
            <ScrollView 
              style={styles.suggestionsList}
              keyboardShouldPersistTaps="handled"
            >
              {placeSuggestions.map((suggestion) => (
                <TouchableOpacity 
                  key={suggestion.id} 
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(suggestion)}
                >
                  <View style={styles.suggestionIcon}>
                    <Search size={18} color="#64748B" />
                  </View>
                  <View style={styles.suggestionDetails}>
                    <Text style={styles.suggestionName}>{suggestion.name}</Text>
                    <Text style={styles.suggestionAddress}>{suggestion.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noSuggestionsText}>
              No suggestions found. Try a different search.
            </Text>
          )}
        </View>
      )}

      <View style={[styles.savedLocationsContainer, showSuggestions && styles.hidden]}>
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
          showSuggestions && styles.hidden
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
  currentLocationBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  // Suggestions styles
  suggestionsContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 8,
    maxHeight: 250,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
    zIndex: 2,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
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
  noSuggestionsText: {
    color: '#64748B',
    textAlign: 'center',
    padding: 16,
    fontFamily: 'Inter-Regular',
  },
  savedLocationsContainer: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    zIndex: 0,
  },
  savedLocations: {
    flex: 1,
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
    zIndex: 0,
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
  },
  errorText: {
    color: '#DC2626',
    textAlign: 'center',
    padding: 10,
    fontFamily: 'Inter-Regular',
  },
  noLocationsText: {
    color: '#64748B',
    textAlign: 'center',
    padding: 20,
    fontFamily: 'Inter-Regular',
  },
  hidden: {
    display: 'none',
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  calculatingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  optionsTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
    marginBottom: 12,
  },
  rideOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
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
    width: 64,
    height: 64,
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
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  rideDesc: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  ridePrice: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
  },
  confirmButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    textTransform: 'capitalize',
  },
});