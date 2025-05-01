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
  Alert
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ArrowLeft, XCircle, Phone, Navigation, MessageSquare, User } from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { getDatabase, ref, set, push, onValue, off } from 'firebase/database';
import { decode } from '@mapbox/polyline';

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
  
  const initializeMap = async () => {
    try {
      // Get coordinates for pickup and destination
      const pickupLocation = await Location.geocodeAsync(pickup);
      const destinationLocation = await Location.geocodeAsync(destination);
      
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
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      Alert.alert('Error', 'Failed to load map. Please try again.');
      navigation.goBack();
    }
  };
  
  const fetchRoute = async (origin, destination) => {
    try {
      const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your API key
      const apiUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${apiKey}`;
      
      // For development, use mock data instead of actual API call
      // In production, uncomment the fetch code below and remove mock data
      
      // Mock polyline data for development
      const mockPolyline = "mliwFnecbMt@}AtAcCnAyBdAkB|@_BvAiCrAyBbByC~@{AnA_BhB{BnBwBhAaA|A_AvAy@hBy@dBm@|@W~@Q";
      const decodedCoords = decode(mockPolyline);
      const routeCoords = decodedCoords.map(point => ({
        latitude: point[0],
        longitude: point[1]
      }));
      
      setRouteCoordinates(routeCoords);
      
      /* In production, use this code to fetch real directions
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
      }
      */
    } catch (error) {
      console.error('Error fetching route:', error);
    }
  };
  
  const createRideRequest = async (pickupLatLng, destinationLatLng) => {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        Alert.alert('Error', 'You need to be logged in to book a ride');
        navigation.goBack();
        return;
      }
      
      const database = getDatabase();
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
      
      await set(newRideRef, rideData);
      setRideId(newRideRef.key);
      
      // Listen for driver acceptance
      listenForDriverAcceptance(newRideRef.key);
      
    } catch (error) {
      console.error('Error creating ride request:', error);
      Alert.alert('Error', 'Failed to create ride request. Please try again.');
    }
  };
  
  const listenForDriverAcceptance = (rideId) => {
    const database = getDatabase();
    const rideRef = ref(database, `rides/${rideId}`);
    
    driverListenerRef.current = rideRef;
    
    onValue(rideRef, (snapshot) => {
      const rideData = snapshot.val();
      
      if (rideData && rideData.status === 'accepted' && rideData.driverId) {
        // Driver has accepted the ride
        setSearching(false);
        setDriverFound(true);
        setIsArriving(true);
        
        // Get driver details
        const driverRef = ref(database, `drivers/${rideData.driverId}`);
        onValue(driverRef, (driverSnapshot) => {
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
        Alert.alert(
          'Ride Cancelled',
          'Your ride request has been cancelled.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    });
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
    searchTimerRef.current = setInterval(() => {
      setSearchTimeout((prev) => {
        if (prev <= 1) {
          // Time's up, no driver found
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
    setSearching(false);
    cancelRideRequest();
    
    Alert.alert(
      'No Drivers Available',
      'We couldn\'t find any drivers nearby. Please try again later.',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  };
  
  const cancelRideRequest = async () => {
    if (!rideId) return;
    
    try {
      const database = getDatabase();
      const rideRef = ref(database, `rides/${rideId}`);
      
      await set(rideRef, {
        ...route.params,
        status: 'cancelled',
        cancellationReason: 'user_cancelled'
      });
      
      // Clean up listener
      if (driverListenerRef.current) {
        off(driverListenerRef.current);
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
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
          entering={Animated.FadeInDown}
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
    },
    loadingText: {
      fontSize: 16,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    backButton: {
      position: 'absolute',
      top: 50,
      left: 20,
      backgroundColor: '#FFFFFF',
      padding: 10,
      borderRadius: 50,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    markerContainer: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    pickupMarker: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#3B82F6',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 5,
    },
    destinationMarker: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: '#EF4444',
      borderWidth: 3,
      borderColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 2,
      elevation: 5,
    },
    autoIcon: {
      width: 40,
      height: 40,
    },
    searchingCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingVertical: 24,
      paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    searchingContent: {
      alignItems: 'center',
      marginBottom: 20,
    },
    searchAnimationContainer: {
      width: 120,
      height: 120,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
    pulseCircle: {
      position: 'absolute',
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: 'rgba(59, 130, 246, 0.2)',
    },
    autoTopView: {
      width: 60,
      height: 60,
      resizeMode: 'contain',
    },
    searchingText: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
      textAlign: 'center',
      marginBottom: 8,
    },
    timerText: {
      fontSize: 16,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
    },
    cancelButton: {
      backgroundColor: '#F1F5F9',
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
    },
    cancelButtonText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
    },
    driverFoundCard: {
      position: 'absolute',
      top: 100,
      left: 20,
      right: 20,
      backgroundColor: '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 4,
    },
    driverFoundHeader: {
      marginBottom: 10,
    },
    driverFoundTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: '#16A34A',
      fontFamily: 'Inter-Bold',
      textAlign: 'center',
    },
    driverArriving: {
      alignItems: 'center',
    },
    arrivingText: {
      fontSize: 16,
      color: '#0F172A',
      fontFamily: 'Inter-Regular',
      textAlign: 'center',
    },
    driverDetailsCard: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingTop: 16,
      paddingBottom: 34,
      paddingHorizontal: 20,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 8,
    },
    rideHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#E2E8F0',
    },
    rideInfo: {
      flex: 1,
    },
    etaText: {
      fontSize: 14,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
    },
    etaTime: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
    },
    cancelRideBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 40,
      backgroundColor: '#FEE2E2',
    },
    cancelRideText: {
      fontSize: 14,
      fontWeight: '500',
      color: '#EF4444',
      fontFamily: 'Inter-Medium',
      marginLeft: 4,
    },
    driverInfoContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
      marginBottom: 16,
    },
    driverProfile: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    driverPhoto: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginRight: 12,
    },
    driverPhotoPlaceholder: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: '#E2E8F0',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    driverInfo: {
      justifyContent: 'center',
    },
    driverName: {
      fontSize: 18,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
      marginBottom: 4,
    },
    ratingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    ratingText: {
      fontSize: 14,
      color: '#0F172A',
      fontFamily: 'Inter-Medium',
    },
    autoDetails: {
      alignItems: 'flex-end',
    },
    autoNumber: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
      marginBottom: 4,
    },
    autoType: {
      fontSize: 14,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
      textTransform: 'capitalize',
    },
    rideDetailsSummary: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      marginBottom: 16,
    },
    fareBadge: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: '#EFF6FF',
      borderRadius: 8,
      alignItems: 'center',
    },
    fareText: {
      fontSize: 18,
      fontWeight: '700',
      color: '#2563EB',
      fontFamily: 'Inter-Bold',
      marginBottom: 2,
    },
    paymentMethod: {
      fontSize: 12,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
    },
    rideStats: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    statItem: {
      alignItems: 'center',
      marginLeft: 16,
    },
    statValue: {
      fontSize: 16,
      fontWeight: '600',
      color: '#0F172A',
      fontFamily: 'Inter-SemiBold',
    },
    statLabel: {
      fontSize: 12,
      color: '#64748B',
      fontFamily: 'Inter-Regular',
    },
    contactActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    contactButton: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#3B82F6',
      paddingVertical: 12,
      borderRadius: 12,
      marginHorizontal: 4,
    },
    contactButtonText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#FFFFFF',
      fontFamily: 'Inter-SemiBold',
      marginLeft: 6,
    },
    cancellingOverlay: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      height: 100,
      alignItems: 'center',
      justifyContent: 'center',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    cancellingText: {
      fontSize: 16,
      fontWeight: '500',
      color: '#0F172A',
      fontFamily: 'Inter-Medium',
    }
  });