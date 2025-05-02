import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Animated, 
  Dimensions, 
  Modal,
  StatusBar,
  BackHandler,
  Alert,
  LogBox // For debugging
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ArrowLeft, XCircle, Phone, Navigation, MessageSquare, User } from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { getDatabase, ref, set, push, onValue, off } from 'firebase/database';
import { decode } from '@mapbox/polyline';
import { GOOGLE_API } from '../apiKeys';

// Ignore warnings during development
LogBox.ignoreLogs(['Warning: ...']); // Add specific warnings to ignore

const { width, height } = Dimensions.get('window');

export default function RideSearchScreen({ route, navigation }) {
  // Get ride details from navigation params
  const { pickup, destination, distance, duration, price, rideType } = route.params;
  
  // State for map and locations
  const [pickupCoords, setPickupCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [region, setRegion] = useState(null);
  
  // State for ride searching and matching
  const [searching, setSearching] = useState(true);
  const [searchTimeout, setSearchTimeout] = useState(45); // 45 seconds to find a driver
  const [driverFound, setDriverFound] = useState(false);
  const [driverDetails, setDriverDetails] = useState(null);
  const [rideId, setRideId] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  
  // Add debug states
  const [error, setError] = useState(null);
  const [dbConnectionStatus, setDbConnectionStatus] = useState('Initializing...');
  
  // Refs for animations
  const searchAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  // Refs for map and timers
  const mapRef = useRef(null);
  const searchTimerRef = useRef(null);
  const driverListenerRef = useRef(null);
  
  useEffect(() => {
    // Set up back button handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancelSearch();
      return true;
    });
    
    // Initialize map with location coordinates
    initializeMap();
    
    // Start search animation
    startSearchAnimation();
    
    // Start countdown timer for search
    startSearchCountdown();
    
    // Check Firebase connection
    checkFirebaseConnection();
    
    return () => {
      // Clean up on unmount
      backHandler.remove();
      if (searchTimerRef.current) clearInterval(searchTimerRef.current);
      if (driverListenerRef.current) {
        const db = getDatabase();
        off(driverListenerRef.current);
      }
    };
  }, []);
  
  // Add a function to check Firebase connection
  const checkFirebaseConnection = async () => {
    try {
      const database = getDatabase();
      const connectedRef = ref(database, '.info/connected');
      
      onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
          setDbConnectionStatus('Connected to Firebase');
        } else {
          setDbConnectionStatus('Disconnected from Firebase');
          setError('Firebase connection issues. Please check your internet connection.');
        }
      });
    } catch (error) {
      console.error('Firebase connection check error:', error);
      setDbConnectionStatus('Error checking connection');
      setError(`Firebase error: ${error.message}`);
    }
  };
  
  const initializeMap = async () => {
    try {
      console.log('Initializing map with pickup:', pickup, 'destination:', destination);
      
      // Get coordinates for pickup and destination
      let pickupLocation, destinationLocation;
      
      try {
        pickupLocation = await Location.geocodeAsync(pickup);
        console.log('Pickup geocoding result:', pickupLocation);
      } catch (error) {
        console.error('Error geocoding pickup location:', error);
        setError(`Geocoding pickup error: ${error.message}`);
        
        // Use fallback coordinates for pickup
        pickupLocation = [{ latitude: 12.9716, longitude: 77.5946 }]; // Bangalore coordinates as fallback
      }
      
      try {
        destinationLocation = await Location.geocodeAsync(destination);
        console.log('Destination geocoding result:', destinationLocation);
      } catch (error) {
        console.error('Error geocoding destination location:', error);
        setError(`Geocoding destination error: ${error.message}`);
        
        // Use fallback coordinates for destination
        destinationLocation = [{ latitude: 13.0827, longitude: 77.5090 }]; // Nearby location as fallback
      }
      
      if (pickupLocation.length > 0 && destinationLocation.length > 0) {
        const pickupLatLng = {
          latitude: pickupLocation[0].latitude,
          longitude: pickupLocation[0].longitude,
        };
        
        const destinationLatLng = {
          latitude: destinationLocation[0].latitude,
          longitude: destinationLocation[0].longitude,
        };
        
        setPickupCoords(pickupLatLng);
        setDestinationCoords(destinationLatLng);
        
        // Set initial region to fit both points
        const midLat = (pickupLatLng.latitude + destinationLatLng.latitude) / 2;
        const midLng = (pickupLatLng.longitude + destinationLatLng.longitude) / 2;
        
        // Calculate delta values to ensure both markers are visible
        const latDelta = Math.abs(pickupLatLng.latitude - destinationLatLng.latitude) * 1.5;
        const lngDelta = Math.abs(pickupLatLng.longitude - destinationLatLng.longitude) * 1.5;
        
        setRegion({
          latitude: midLat,
          longitude: midLng,
          latitudeDelta: Math.max(0.02, latDelta),
          longitudeDelta: Math.max(0.02, lngDelta),
        });
        
        // Fetch route between points
        fetchRoute(pickupLatLng, destinationLatLng);
        
        // Create ride request in Firebase
        createRideRequest(pickupLatLng, destinationLatLng);
      } else {
        throw new Error('Could not get coordinates for pickup or destination');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      setError(`Map initialization error: ${error.message}`);
      Alert.alert('Error', 'Failed to load map. Please try again.');
      // Don't navigate back immediately, give user a chance to see the error
    }
  };
  
  const fetchRoute = async (origin, destination) => {
    try {
      console.log('Fetching route between', origin, 'and', destination);
      
      // // For development, use mock data instead of actual API call
      // // In production, uncomment the fetch code below and remove mock data
      
      // // Mock polyline data for development
      // const mockPolyline = "mliwFnecbMt@}AtAcCnAyBdAkB|@_BvAiCrAyBbByC~@{AnA_BhB{BnBwBhAaA|A_AvAy@hBy@dBm@|@W~@Q";
      // const decodedCoords = decode(mockPolyline);
      // const routeCoords = decodedCoords.map(point => ({
      //   latitude: point[0],
      //   longitude: point[1]
      // }));
      
      setRouteCoordinates(routeCoords);
      console.log('Route coordinates set:', routeCoords.length, 'points');
      
      //  In production, use this code to fetch real directions
      const apiKey = GOOGLE_API; // Replace with your API key
      if (!apiKey || apiKey === GOOGLE_API) {
        console.warn('No Google Maps API key provided. Using mock data.');
        return;
      }
      
      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.status === 'OK' && data.routes.length > 0) {
        const points = data.routes[0].overview_polyline.points;
        const decodedCoords = decode(points);
        const routeCoords = decodedCoords.map(point => ({
          latitude: point[0],
          longitude: point[1]
        }));
        
        setRouteCoordinates(routeCoords);
        console.log('Route coordinates set from API:', routeCoords.length, 'points');
      } else {
        console.error('Google Maps API error:', data);
        setError(`Route API error: ${data.status}`);
      }
      // */
    } catch (error) {
      console.error('Error fetching route:', error);
      setError(`Route fetch error: ${error.message}`);
    }
  };
  
  const createRideRequest = async (pickupLatLng, destinationLatLng) => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        const errorMsg = 'You need to be logged in to book a ride';
        setError(errorMsg);
        Alert.alert('Error', errorMsg);
        navigation.goBack();
        return;
      }
      
      console.log('Creating ride request for user:', currentUser.uid);
      
      const database = getDatabase();
      
      // Check if rides path exists first
      const testRef = ref(database, 'rides');
      onValue(testRef, (snapshot) => {
        console.log('Rides reference exists:', snapshot.exists());
      }, {
        onlyOnce: true
      });
      
      const ridesRef = ref(database, 'rides');
      const newRideRef = push(ridesRef);
      
      const rideData = {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'User',
        userPhone: currentUser.phoneNumber || '',
        pickup: {
          address: pickup,
          latitude: pickupLatLng.latitude,
          longitude: pickupLatLng.longitude
        },
        destination: {
          address: destination,
          latitude: destinationLatLng.latitude,
          longitude: destinationLatLng.longitude
        },
        distance: distance,
        duration: duration,
        fare: price,
        rideType: rideType,
        status: 'searching', // searching, accepted, in_progress, completed, cancelled
        timestamp: Date.now(),
        paymentMethod: 'cash', // Default payment method
        driverId: null
      };
      
      console.log('Ride data to save:', rideData);
      console.log('Ride ID:', newRideRef.key);
      
      await set(newRideRef, rideData);
      setRideId(newRideRef.key);
      console.log('Ride created with ID:', newRideRef.key);
      
      // Listen for driver acceptance
      listenForDriverAcceptance(newRideRef.key);
      
    } catch (error) {
      console.error('Error creating ride request:', error);
      setError(`Ride creation error: ${error.message}`);
      Alert.alert('Error', 'Failed to create ride request. Please try again.');
    }
  };
  
  const listenForDriverAcceptance = (rideId) => {
    try {
      console.log('Setting up listener for ride:', rideId);
      
      const database = getDatabase();
      const rideRef = ref(database, `rides/${rideId}`);
      
      driverListenerRef.current = rideRef;
      
      onValue(rideRef, (snapshot) => {
        console.log('Ride update received. Exists:', snapshot.exists());
        
        if (!snapshot.exists()) {
          console.error('Ride does not exist in database');
          setError('Ride not found in database. It may have been deleted.');
          return;
        }
        
        const rideData = snapshot.val();
        console.log('Ride data update:', rideData);
        
        if (rideData && rideData.status === 'accepted' && rideData.driverId) {
          // Driver has accepted the ride
          console.log('Driver accepted ride:', rideData.driverId);
          setSearching(false);
          setDriverFound(true);
          setIsArriving(true);
          
          // Get driver details
          const driverRef = ref(database, `drivers/${rideData.driverId}`);
          onValue(driverRef, (driverSnapshot) => {
            console.log('Driver details retrieved. Exists:', driverSnapshot.exists());
            
            if (!driverSnapshot.exists()) {
              console.warn('Driver not found in database');
              // Create mock driver data for testing
              setDriverDetails({
                id: rideData.driverId,
                name: 'Test Driver',
                phone: '1234567890',
                rating: 4.7,
                autoNumber: 'KA-01-XX-1234',
                photo: null
              });
              return;
            }
            
            const driverData = driverSnapshot.val();
            if (driverData) {
              setDriverDetails({
                id: rideData.driverId,
                name: driverData.name || 'Driver',
                phone: driverData.phone || 'N/A',
                rating: driverData.rating || 4.7,
                autoNumber: driverData.autoNumber || 'KA-01-XX-1234',
                photo: driverData.photo || null
              });
            }
          }, { onlyOnce: true });
          
          // Clear search timer
          if (searchTimerRef.current) {
            clearInterval(searchTimerRef.current);
          }
          
          // Navigate to full width driver card after a delay
          setTimeout(() => {
            setIsArriving(false);
          }, 3000);
        } else if (rideData && rideData.status === 'cancelled') {
          // Ride was cancelled (either by system or driver)
          console.log('Ride cancelled');
          Alert.alert(
            'Ride Cancelled',
            'Your ride request has been cancelled.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }, error => {
        console.error('Error listening for driver acceptance:', error);
        setError(`Listener error: ${error.message}`);
      });
    } catch (error) {
      console.error('Error setting up driver acceptance listener:', error);
      setError(`Setup listener error: ${error.message}`);
    }
  };
  
  // For testing: function to simulate driver acceptance
  const simulateDriverAcceptance = () => {
    if (!rideId) {
      Alert.alert('Error', 'No active ride to simulate');
      return;
    }
    
    try {
      const database = getDatabase();
      const rideRef = ref(database, `rides/${rideId}`);
      
      // Update ride with a mock driver
      set(rideRef, {
        ...route.params,
        status: 'accepted',
        driverId: 'mock-driver-001'
      });
      
      // Add mock driver to database
      const driverRef = ref(database, 'drivers/mock-driver-001');
      set(driverRef, {
        name: 'Test Driver',
        phone: '1234567890',
        rating: 4.7,
        autoNumber: 'KA-01-XX-1234',
        photo: null
      });
      
      console.log('Simulated driver acceptance');
    } catch (error) {
      console.error('Error simulating driver acceptance:', error);
      setError(`Simulation error: ${error.message}`);
    }
  };
  
  const startSearchAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(searchAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(searchAnimation, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
    
    // Pulse animation for search radius
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  };
  
  const startSearchCountdown = () => {
    console.log('Starting search countdown for', searchTimeout, 'seconds');
    searchTimerRef.current = setInterval(() => {
      setSearchTimeout((prev) => {
        console.log('Search time remaining:', prev - 1);
        if (prev <= 1) {
          // Time's up, no driver found
          console.log('Search timeout reached');
          clearInterval(searchTimerRef.current);
          handleSearchTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const handleSearchTimeout = () => {
    // If no driver found after timeout, cancel ride and show alert
    console.log('No drivers found within time limit');
    setSearching(false);
    cancelRideRequest();
    
    Alert.alert(
      'No Drivers Available',
      'We couldn\'t find any drivers nearby. Please try again later.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  
  const cancelRideRequest = async () => {
    if (!rideId) {
      console.warn('No ride ID to cancel');
      return;
    }
    
    try {
      console.log('Cancelling ride request:', rideId);
      const database = getDatabase();
      const rideRef = ref(database, `rides/${rideId}`);
      
      await set(rideRef, {
        ...route.params,
        status: 'cancelled',
        cancellationReason: 'user_cancelled'
      });
      
      console.log('Ride cancelled successfully');
      
      // Clean up listener
      if (driverListenerRef.current) {
        off(driverListenerRef.current);
        console.log('Driver listener removed');
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      setError(`Cancel ride error: ${error.message}`);
    }
  };
  
  const handleCancelSearch = () => {
    if (driverFound) {
      // If driver already found, show confirmation before cancelling
      Alert.alert(
        'Cancel Ride?',
        'A driver has already accepted your ride. Are you sure you want to cancel?',
        [
          { text: 'No', style: 'cancel' },
          { 
            text: 'Yes, Cancel', 
            style: 'destructive',
            onPress: () => {
              setIsCancelling(true);
              cancelRideRequest();
              setTimeout(() => navigation.goBack(), 1000);
            }
          }
        ]
      );
    } else {
      // If still searching, cancel immediately
      setIsCancelling(true);
      cancelRideRequest();
      setTimeout(() => navigation.goBack(), 1000);
    }
  };
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  if (!region || !pickupCoords || !destinationCoords) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <Text style={styles.loadingText}>Loading map...</Text>
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        showsUserLocation={true}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled={true}
      >
        {/* Route Polyline */}
        {routeCoordinates.length > 0 && (
          <Polyline
            coordinates={routeCoordinates}
            strokeWidth={4}
            strokeColor="#3B82F6"
          />
        )}
        
        {/* Pickup Marker */}
        <Marker coordinate={pickupCoords} title="Pickup">
          <View style={styles.markerContainer}>
            <View style={styles.pickupMarker} />
          </View>
        </Marker>
        
        {/* Destination Marker */}
        <Marker coordinate={destinationCoords} title="Destination">
          <View style={styles.markerContainer}>
            <View style={styles.destinationMarker} />
          </View>
        </Marker>
        
        {/* Driver location marker (shown when driver is found) */}
        {driverFound && driverDetails && (
          <Marker
            coordinate={{
              ...pickupCoords,
              latitude: pickupCoords.latitude - 0.002 // Simulated position near pickup
            }}
            title={`${driverDetails.name}'s Auto`}
          >
            <View style={styles.driverMarker}>
              <View style={styles.autoIconContainer} />
            </View>
          </Marker>
        )}
      </MapView>
      
      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleCancelSearch}
      >
        <ArrowLeft size={24} color="#0F172A" />
      </TouchableOpacity>
      
      {/* Debug Button (for development only) */}
      {__DEV__ && (
        <TouchableOpacity
          style={styles.debugButton}
          onPress={simulateDriverAcceptance}
        >
          <Text style={styles.debugButtonText}>Debug: Find Driver</Text>
        </TouchableOpacity>
      )}
      
      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Text style={styles.dbStatusText}>{dbConnectionStatus}</Text>
        </View>
      )}
      
      {/* Searching Card */}
      {searching && !driverFound && !isCancelling && (
        <View style={styles.searchingCard}>
          <View style={styles.searchingContent}>
            <View style={styles.searchAnimationContainer}>
              <Animated.View
                style={[
                  styles.pulseCircle,
                  {
                    transform: [{ scale: pulseAnimation }],
                    opacity: searchAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.5, 0]
                    })
                  }
                ]}
              />
              
            </View>
            
            <Text style={styles.searchingText}>
              Looking for nearby {rideType} autos
            </Text>
            
            <Text style={styles.timerText}>
              {formatTime(searchTimeout)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSearch}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Driver Found & Arriving Notification */}
      {driverFound && isArriving && !isCancelling && (
        <Animated.View 
          style={styles.driverFoundCard}
        >
          <View style={styles.driverFoundHeader}>
            <Text style={styles.driverFoundTitle}>Auto Confirmed!</Text>
          </View>
          
          <View style={styles.driverArriving}>
            <Text style={styles.arrivingText}>
              Your auto is on the way to pick you up
            </Text>
          </View>
        </Animated.View>
      )}
      
      {/* Driver Details Card */}
      {driverFound && !isArriving && !isCancelling && driverDetails && (
        <View style={styles.driverDetailsCard}>
          <View style={styles.rideHeader}>
            <View style={styles.rideInfo}>
              <Text style={styles.etaText}>Driver is on the way</Text>
              <Text style={styles.etaTime}>Arriving in 3 mins</Text>
            </View>
            
            <TouchableOpacity
              style={styles.cancelRideBtn}
              onPress={handleCancelSearch}
            >
              <XCircle size={20} color="#EF4444" />
              <Text style={styles.cancelRideText}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.driverInfoContainer}>
            <View style={styles.driverProfile}>
              {driverDetails.photo ? (
                <Image
                  source={{ uri: driverDetails.photo }}
                  style={styles.driverPhoto}
                />
              ) : (
                <View style={styles.driverPhotoPlaceholder}>
                  <User size={24} color="#64748B" />
                </View>
              )}
              
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driverDetails.name}</Text>
                <View style={styles.ratingContainer}>
                  <Text style={styles.ratingText}>{driverDetails.rating} ★</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.autoDetails}>
              <Text style={styles.autoNumber}>{driverDetails.autoNumber}</Text>
              <Text style={styles.autoType}>{rideType} Auto</Text>
            </View>
          </View>
          
          <View style={styles.rideDetailsSummary}>
            <View style={styles.fareBadge}>
              <Text style={styles.fareText}>₹{price}</Text>
              <Text style={styles.paymentMethod}>Cash</Text>
            </View>
            
            <View style={styles.rideStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{distance.toFixed(1)} km</Text>
                <Text style={styles.statLabel}>Distance</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{Math.round(duration)} min</Text>
                <Text style={styles.statLabel}>Duration</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.contactActions}>
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Alert.alert('Call Driver', `Call ${driverDetails.name}?`)}
            >
              <Phone size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Alert.alert('Message', `Send message to ${driverDetails.name}?`)}
            >
              <MessageSquare size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.contactButton}
              onPress={() => Alert.alert('Share Trip', 'Share your trip details with friends?')}
            >
              <Navigation size={20} color="#FFFFFF" />
              <Text style={styles.contactButtonText}>Share Trip</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      
      {/* Cancelling Animation */}
      {isCancelling && (
        <View style={styles.cancellingOverlay}>
          <Text style={styles.cancellingText}>Cancelling your ride...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginTop: 8,
    padding: 8,
  },
  dbStatusText: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  errorContainer: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(254, 226, 226, 0.95)',
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    backgroundColor: '#FFFFFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  debugButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: '#3B82F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  markerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#22C55E',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  destinationMarker: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  driverMarker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  autoIconContainer: {
    width: 14,
    height: 14,
    backgroundColor: '#FFFFFF',
    borderRadius: 7,
  },
  searchingCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  searchingContent: {
    alignItems: 'center',
    marginBottom: 24,
  },
  searchAnimationContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  pulseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3B82F6',
    position: 'absolute',
  },
  searchingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#0F172A',
  },
  driverFoundCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  driverFoundHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  driverFoundTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  driverArriving: {
    alignItems: 'center',
  },
  arrivingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
  },
  driverDetailsCard: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rideInfo: {
    flex: 1,
  },
  etaText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  etaTime: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
  },
  cancelRideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
  },
  cancelRideText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#EF4444',
    marginLeft: 4,
  },
  driverInfoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  driverPhotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  driverInfo: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  autoDetails: {
    alignItems: 'flex-end',
  },
  autoNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  autoType: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  rideDetailsSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  fareBadge: {
    alignItems: 'center',
  },
  fareText: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#0F172A',
    marginBottom: 4,
  },
  paymentMethod: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  rideStats: {
    flexDirection: 'row',
  },
  statItem: {
    alignItems: 'center',
    marginLeft: 20,
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0F172A',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  contactActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
  cancellingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancellingText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
  }
});