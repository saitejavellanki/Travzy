import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl, Modal, FlatList } from 'react-native';
import { Search, MapPin, Clock, Users, Check, Phone, ChevronDown, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import { 
  getAuth, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit,
  doc,
  getDoc
} from 'firebase/firestore';
import { initializeApp } from 'firebase/app';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBB9UxfdXt5_DqM_o-EQGZDF3lDrSmfTYw",
  authDomain: "travzyy.firebaseapp.com",
  databaseURL: "https://travzyy-default-rtdb.firebaseio.com",
  projectId: "travzyy",
  storageBucket: "travzyy.firebasestorage.app",
  messagingSenderId: "399356874562",
  appId: "1:399356874562:web:2b447680e0c96365b9c2db",
  measurementId: "G-CM9H23P9D7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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

export default function HomeScreen() {
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [userRideRequests, setUserRideRequests] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Fetch current user
  const fetchCurrentUser = async () => {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe(); // Stop listening immediately after the first response
        if (user) {
          setCurrentUserId(user.uid);
          resolve(user.uid);
        } else {
          resolve(null);
        }
      });
    }).catch(err => {
      console.error('Error fetching current user:', err);
      return null;
    });
  };

  // Fetch user's ride requests - IMPROVED VERSION
  const fetchUserRideRequests = async (userId) => {
    if (!userId) return;
    
    try {
      console.log('Fetching ride requests for user:', userId);
      
      // First fetch the ride requests
      const requestsRef = collection(db, 'ride_requests');
      const requestsQuery = query(
        requestsRef,
        where('passenger_id', '==', userId),
        where('status', '==', 'accepted')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      
      if (requestsSnapshot.empty) {
        console.log('No accepted ride requests found');
        setUserRideRequests([]);
        return;
      }
      
      console.log('Found accepted ride requests:', requestsSnapshot.size);
      
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Process each request individually to handle any possible errors
      const processedRequests = await Promise.all(
        requestsData.map(async (request) => {
          try {
            // Get the full ride document using document ID
            const rideId = request.ride_id;
            if (!rideId) {
              console.error('No ride_id found in request:', request.id);
              return null;
            }
            
            console.log('Fetching ride details for:', rideId);
            
            // Use getDoc for better performance when fetching a known document
            const rideDocRef = doc(db, 'rides', rideId);
            const rideDoc = await getDoc(rideDocRef);
            
            if (!rideDoc.exists()) {
              console.error('Ride document not found for ID:', rideId);
              return null;
            }
            
            const rideData = {
              id: rideDoc.id,
              ...rideDoc.data()
            };
            
            // Get driver info if we have driver_id
            const driverId = rideData.driver_id;
            if (!driverId) {
              console.error('No driver_id found in ride:', rideId);
              // Return with default values for driver info
              return {
                ...request,
                ride: {
                  ride_id: rideData.id,
                  pickup_location: rideData.pickup_location || 'Unknown',
                  dropoff_location: rideData.dropoff_location || 'Unknown',
                  price: rideData.price || '0',
                  departure_time: rideData.departure_time || new Date().toISOString(),
                  available_seats: rideData.available_seats || 0,
                  vehicle_name: rideData.vehicle_name || 'Unknown Vehicle',
                  status: rideData.status || 'unknown',
                  driver_id: driverId || 'unknown',
                  driver_name: 'Unknown Driver',
                  driver_phone: 'N/A',
                  driver_avatar: ''
                }
              };
            }
            
            console.log('Fetching driver profile for:', driverId);
            
            // Get driver profile from profiles collection
            const profileRef = collection(db, 'profiles');
            const profileQuery = query(profileRef, where('user_id', '==', driverId));
            const profileSnapshot = await getDocs(profileQuery);
            
            let driverProfile = {
              full_name: 'Unknown Driver',
              phoneNumber: 'N/A',
              avatar_url: ''
            };
            
            if (!profileSnapshot.empty) {
              const profileData = profileSnapshot.docs[0].data();
              driverProfile = {
                full_name: profileData.fullName || 'Unknown Driver',
                phoneNumber: profileData.phoneNumber || 'N/A',
                avatar_url: profileData.avatar_url || ''
              };
            }
            
            // Format and return the complete request with ride and driver info
            return {
              ...request,
              ride: {
                ride_id: rideData.id,
                pickup_location: rideData.pickup_location || 'Unknown',
                dropoff_location: rideData.dropoff_location || 'Unknown',
                price: rideData.price || '0',
                departure_time: rideData.departure_time || new Date().toISOString(),
                available_seats: rideData.available_seats || 0,
                vehicle_name: rideData.vehicle_name || 'Unknown Vehicle',
                status: rideData.status || 'unknown',
                driver_id: driverId,
                driver_name: driverProfile.full_name,
                driver_phone: driverProfile.phoneNumber,
                driver_avatar: driverProfile.avatar_url
              }
            };
          } catch (err) {
            console.error('Error processing ride request:', request.id, err);
            return null;
          }
        })
      );
      
      // Filter out any null results from failed processing
      const validRequests = processedRequests.filter(req => req !== null);
      console.log('Processed accepted ride requests:', validRequests.length);
      
      setUserRideRequests(validRequests);
    } catch (err) {
      console.error('Error fetching user ride requests:', err);
      setError('Failed to load your accepted rides');
    }
  };

  const fetchRides = async () => {
    try {
      console.log('Fetching rides...');
      
      // Step 1: Get active rides
      const ridesRef = collection(db, 'rides');
      const ridesQuery = query(
        ridesRef,
        where('status', '==', 'active'),
        orderBy('departure_time'),
        limit(10)
      );
  
      const ridesSnapshot = await getDocs(ridesQuery);
      
      if (ridesSnapshot.empty) {
        console.log('No active rides found');
        setRides([]);
        setFilteredRides([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const ridesData = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      console.log('Fetched rides:', ridesData.length);
      
      // Get all driver IDs from rides
      const driverIds = ridesData.map(ride => ride.driver_id);
      
      // Step 2: Get driver info from profiles collection
      // Firebase doesn't support direct 'in' queries with arrays that are too large
      // so we'll fetch each profile individually
      const profilesPromises = driverIds.map(driverId => {
        const profileRef = collection(db, 'profiles');
        const profileQuery = query(profileRef, where('user_id', '==', driverId));
        return getDocs(profileQuery);
      });
      
      const profilesResults = await Promise.all(profilesPromises);
      
      // Extract profile data
      let profiles = [];
      profilesResults.forEach(snapshot => {
        if (!snapshot.empty) {
          snapshot.docs.forEach(doc => {
            profiles.push({ id: doc.id, ...doc.data() });
          });
        }
      });
      
      // Step 3: Format the data by combining rides with driver profiles
      const formattedRides = ridesData.map(ride => {
        // Find matching driver profile
        const driverProfile = profiles.find(profile => profile.user_id === ride.driver_id);
        
        return {
          id: ride.id,
          pickup_location: ride.pickup_location,
          dropoff_location: ride.dropoff_location,
          departure_time: ride.departure_time,
          available_seats: ride.available_seats,
          price: ride.price,
          vehicle_name: ride.vehicle_name || 'Unknown Vehicle',
          driver: {
            id: ride.driver_id || 'unknown',
            full_name: driverProfile?.fullName || 'Unknown Driver',
            phone_no: driverProfile?.phoneNumber || 'N/A',
            avatar_url: driverProfile?.avatar_url || ''
          },
          // Add isCurrentUserDriver flag to indicate if the current user is the driver
          isCurrentUserDriver: ride.driver_id === currentUserId
        };
      });
      
      setRides(formattedRides);
      setFilteredRides(formattedRides);
      
    } catch (err) {
      console.error('Error in fetchRides:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      try {
        const userId = await fetchCurrentUser();
        console.log('Current user ID:', userId);
        
        if (userId) {
          // Load both data types in parallel
          await Promise.all([
            fetchRides(),
            fetchUserRideRequests(userId)
          ]);
        } else {
          await fetchRides();
        }
      } catch (err) {
        console.error('Error initializing data:', err);
        setError('Failed to load data. Please try again.');
        setLoading(false);
      }
    };
    
    initializeData();
  }, []);

  // Update ride data when currentUserId changes
  useEffect(() => {
    if (currentUserId && rides.length > 0) {
      // Update the isCurrentUserDriver flag for all rides
      const updatedRides = rides.map(ride => ({
        ...ride,
        isCurrentUserDriver: ride.driver.id === currentUserId
      }));
      
      setRides(updatedRides);
      
      // Also update filtered rides
      const updatedFilteredRides = filteredRides.map(ride => ({
        ...ride,
        isCurrentUserDriver: ride.driver.id === currentUserId
      }));
      
      setFilteredRides(updatedFilteredRides);
    }
  }, [currentUserId, rides.length]);

  // Filter rides when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRides(rides);
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const filtered = rides.filter(ride => 
        ride.dropoff_location.toLowerCase().includes(lowerCaseQuery)
      );
      setFilteredRides(filtered);
    }
  }, [searchQuery, rides]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchRides(),
        fetchUserRideRequests(currentUserId)
      ]);
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchChange = (text) => {
    setSearchQuery(text);
  };

  const selectLocation = (location) => {
    setSearchQuery(location);
    setDropdownVisible(false);
  };

  // Get accepted ride requests (already filtered in the fetch function)
  const acceptedRideRequests = userRideRequests;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning</Text>
        <Text style={styles.title}>Find a ride</Text>
      </View>

      {/* Modified search bar with dropdown */}
      <TouchableOpacity 
        style={styles.searchBar}
        onPress={() => setDropdownVisible(true)}
      >
        <Search size={20} color="#64748B" />
        <Text style={[styles.searchInput, !searchQuery && styles.searchPlaceholder]}>
          {searchQuery || "Where are you going?"}
        </Text>
        <ChevronDown size={20} color="#64748B" />
      </TouchableOpacity>

      {/* Location Dropdown Modal */}
      <Modal
        visible={dropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDropdownVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setDropdownVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Destination</Text>
            <FlatList
              data={LOCATIONS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={() => selectLocation(item)}
                >
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.locationItemText}>{item}</Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Accepted Rides Section */}
        {acceptedRideRequests.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Accepted Rides</Text>
            {acceptedRideRequests.map((request) => {
              const ride = request.ride;
              
              // Skip if we don't have ride data
              if (!ride) return null;
              
              return (
                <TouchableOpacity 
                  key={request.id} 
                  style={[styles.rideCard, styles.acceptedRideCard]}
                  onPress={() => router.push(`./components/ride/${ride.ride_id}`)}
                >
                  <View style={styles.acceptedBadge}>
                    <Check size={16} color="#fff" />
                    <Text style={styles.acceptedBadgeText}>Accepted</Text>
                  </View>
                  
                  <View style={styles.rideHeader}>
                    <Image
                      source={{ uri: ride.driver_avatar || 
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' 
                      }}
                      style={styles.driverImage}
                    />
                    <View>
                      <Text style={styles.driverName}>{ride.driver_name || 'Unknown Driver'}</Text>
                      <Text style={styles.carInfo}>{ride.vehicle_name || 'Vehicle'}</Text>
                    </View>
                    <Text style={styles.price}>${ride.price}</Text>
                  </View>

                  <View style={styles.driverContact}>
                    <Phone size={16} color="#64748B" />
                    <Text style={styles.phoneNumber}>{ride.driver_phone || 'N/A'}</Text>
                  </View>

                  <View style={styles.rideDetails}>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.location}>{ride.pickup_location}</Text>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.location}>{ride.dropoff_location}</Text>
                    </View>
                  </View>

                  <View style={styles.rideFooter}>
                    <View style={styles.footerItem}>
                      <Clock size={16} color="#64748B" />
                      <Text style={styles.footerText}>
                        {new Date(ride.departure_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Users size={16} color="#64748B" />
                      <Text style={styles.footerText}>
                        {request.seats_requested} seats booked
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={onRefresh}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Available Rides</Text>
            
            {filteredRides.length === 0 ? (
              <View style={styles.noRidesContainer}>
                <Text style={styles.noRidesText}>
                  {searchQuery.trim() !== '' 
                    ? `No rides found to ${searchQuery}` 
                    : 'No rides available at the moment'}
                </Text>
              </View>
            ) : (
              filteredRides.map((ride) => (
                <TouchableOpacity 
                  key={ride.id} 
                  style={[
                    styles.rideCard,
                    ride.isCurrentUserDriver && styles.offeringRideCard
                  ]}
                  onPress={() => router.push(`./components/ride/${ride.id}`)}
                >
                  {/* Add Offering badge if the current user is the driver */}
                  {ride.isCurrentUserDriver && (
                    <View style={styles.offeringBadge}>
                      <Star size={16} color="#fff" />
                      <Text style={styles.offeringBadgeText}>Offering</Text>
                    </View>
                  )}
                  
                  <View style={styles.rideHeader}>
                    <Image
                      source={{ uri: ride.driver.avatar_url || 
                          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' 
                      }}
                      style={styles.driverImage}
                    />
                    <View>
                      <Text style={styles.driverName}>
                        {ride.isCurrentUserDriver ? 'You' : ride.driver.full_name}
                      </Text>
                      <Text style={styles.carInfo}>{ride.vehicle_name}</Text>
                    </View>
                    <Text style={styles.price}>${ride.price}</Text>
                  </View>

                  <View style={styles.driverContact}>
                    <Phone size={16} color="#64748B" />
                    <Text style={styles.phoneNumber}>{ride.driver.phone_no}</Text>
                  </View>

                  <View style={styles.rideDetails}>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.location}>{ride.pickup_location}</Text>
                    </View>
                    <View style={styles.locationRow}>
                      <MapPin size={16} color="#3B82F6" />
                      <Text style={styles.location}>{ride.dropoff_location}</Text>
                    </View>
                  </View>

                  <View style={styles.rideFooter}>
                    <View style={styles.footerItem}>
                      <Clock size={16} color="#64748B" />
                      <Text style={styles.footerText}>
                        {new Date(ride.departure_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.footerItem}>
                      <Users size={16} color="#64748B" />
                      <Text style={styles.footerText}>
                        {ride.available_seats} seats left
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

      <TouchableOpacity 
        style={styles.offerButton}
        onPress={() => router.push('./components/offer-ride')}
      >
        <Text style={styles.offerButtonText}>Offer a Ride</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  greeting: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  title: {
    fontSize: 24,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
    marginTop: 4,
  },
  searchBar: {
    margin: 24,
    marginTop: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-Regular',
  },
  searchPlaceholder: {
    color: '#64748B',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 16,
    textAlign: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  locationItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
  },
  separator: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  content: {
    flex: 1,
    padding: 24,
    paddingTop: 0,
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#EEF2FF',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  noRidesContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
  },
  noRidesText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  rideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  driverName: {
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
  },
  carInfo: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  price: {
    marginLeft: 'auto',
    fontSize: 18,
    color: '#3B82F6',
    fontFamily: 'Inter-Bold',
  },
  
  // New style for driver contact info
  driverContact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  phoneNumber: {
    marginLeft: 8,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  
  rideDetails: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 16,
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
  },
  rideFooter: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 24,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  offerButton: {
    margin: 24,
    height: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  acceptedRideCard: {
    borderColor: '#22C55E',
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    position: 'relative',
    marginTop: 16, // Add some margin at top to make room for the badge
  },
  acceptedBadge: {
    position: 'absolute',
    top: -16, // This positions it halfway above the card
    right: 16, 
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 1,
  },
  acceptedBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  offeringRideCard: {
    borderColor: '#3B82F6',
    borderWidth: 2,
    backgroundColor: '#F0FDF4',
    position: 'relative',
    marginTop: 16,
  },
  offeringBadge: {
    position: 'absolute',
    top: -16,
    right: 12,
    backgroundColor: '#22C55E',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  offeringBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginLeft: 4,
  },
});