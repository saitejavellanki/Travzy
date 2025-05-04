import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Image, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { auth, db } from '../../firebase/Config';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { MapPin, Navigation, Phone, X, ChevronLeft } from 'lucide-react-native';
import LottieView from 'lottie-react-native'; // Make sure to install lottie-react-native

// Path to your animation file (place in assets folder)
// You'll need to add a s // Update this path to your animation file

export default function RideSearchScreen() {
  // Get params passed from BookAutoScreen
  const params = useLocalSearchParams();
  const {
    ride_id,
    pickup,
    destination,
    distance,
    duration,
    price,
    rideType
  } = params;

  const [searching, setSearching] = useState(true);
  const [searchTime, setSearchTime] = useState(0); // in seconds
  const [driver, setDriver] = useState(null);
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  // Debug incoming params and check Firestore connection
  useEffect(() => {
    console.log('==== DEBUG: RIDE SEARCH PARAMS ====');
    console.log('ride_id:', ride_id);
    console.log('pickup:', pickup);
    console.log('destination:', destination);
    console.log('price:', price);
    
    // Check Firebase config/initialization
    console.log('DEBUG: Firebase db object exists:', !!db);
    
    // Log all params for debugging
    const allParams = JSON.stringify(params);
    console.log('DEBUG: All URL params:', allParams);
    
    // Add to debug info state
    setDebugInfo(prev => 
      prev + `\nParams received:
ride_id: ${ride_id}
pickup: ${pickup}
destination: ${destination}
price: ${price}
Firebase initialized: ${!!db}
All params: ${allParams.substring(0, 200)}${allParams.length > 200 ? '...' : ''}\n`
    );
    
    // Check if ride_id is valid
    if (!ride_id) {
      console.error('DEBUG: No ride_id provided or ride_id is invalid');
      setDebugInfo(prev => prev + 'ERROR: No ride_id provided or ride_id is invalid\n');
    } else {
      console.log('DEBUG: ride_id format appears valid');
      setDebugInfo(prev => prev + `ride_id format appears valid: ${ride_id}\n`);
      
      // Add check for common URL parameter encoding issues
      if (ride_id.includes('%')) {
        const decodedId = decodeURIComponent(ride_id);
        console.log('DEBUG: ride_id might be URL encoded, decoded value:', decodedId);
        setDebugInfo(prev => prev + `⚠️ ride_id might be URL encoded, decoded value: ${decodedId}\n`);
      }
    }
    
    // Verify Firebase Config is working correctly
    try {
      if (db) {
        console.log('DEBUG: Attempting simple Firebase operation to verify connection');
        const testRef = doc(db, 'test', 'test');
        console.log('DEBUG: Test reference created:', testRef.path);
        setDebugInfo(prev => prev + `Test reference created: ${testRef.path}\n`);
      }
    } catch (err) {
      console.error('DEBUG: Error testing Firebase connection:', err);
      setDebugInfo(prev => prev + `ERROR testing Firebase connection: ${err.message}\n`);
    }
  }, []);

  // Set up timer for search time
  useEffect(() => {
    let interval;
    if (searching) {
      interval = setInterval(() => {
        setSearchTime((prevTime) => prevTime + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [searching]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Listen for ride updates from Firestore
  useEffect(() => {
    if (!ride_id) {
      const errorMsg = 'No ride ID provided';
      console.error('DEBUG:', errorMsg);
      setDebugInfo(prev => prev + `ERROR: ${errorMsg}\n`);
      setError(errorMsg);
      setLoading(false);
      return;
    }

    // Check if ride_id is in expected format (typically a string)
    console.log('DEBUG: ride_id type:', typeof ride_id);
    console.log('DEBUG: ride_id value:', ride_id);
    setDebugInfo(prev => prev + `ride_id type: ${typeof ride_id}\nride_id value: ${ride_id}\n`);
    
    // Sometimes URL params are encoded or have extra characters
    const cleanRideId = String(ride_id).trim();
    console.log('DEBUG: Cleaned ride_id:', cleanRideId);
    setDebugInfo(prev => prev + `Cleaned ride_id: ${cleanRideId}\n`);
    
    console.log('DEBUG: Setting up Firestore listener for ride ID:', cleanRideId);
    setDebugInfo(prev => prev + `Setting up Firestore listener for ride ID: ${cleanRideId}\n`);
    
    setLoading(true);

    try {
      // Verify database connection before proceeding
      if (!db) {
        throw new Error('Firebase database connection is not initialized');
      }
      
      // First try to get the document directly to verify it exists
      getDoc(doc(db, 'rides', cleanRideId))
        .then(docSnap => {
          if (docSnap.exists()) {
            console.log('DEBUG: Direct check - document exists!', docSnap.id);
            setDebugInfo(prev => prev + `Direct check - document exists with ID: ${docSnap.id}\n`);
            const data = docSnap.data();
            console.log('DEBUG: Document data:', JSON.stringify(data, null, 2));
            setDebugInfo(prev => prev + `Document data preview: ${JSON.stringify(data).substring(0, 100)}...\n`);
          } else {
            console.error('DEBUG: Direct check - document does NOT exist!');
            setDebugInfo(prev => prev + `ERROR: Direct check - document does NOT exist!\nVerify ride_id: ${cleanRideId} exists in 'rides' collection\n`);
            
            // List all rides to check if collection is accessible (limit to 5)
            try {
              const { collection, getDocs, query, limit } = require('firebase/firestore');
              
              console.log('DEBUG: Attempting to list some ride documents to verify collection access...');
              setDebugInfo(prev => prev + 'Attempting to list some ride documents to verify collection access...\n');
              
              getDocs(query(collection(db, 'rides'), limit(5)))
                .then(querySnapshot => {
                  console.log('DEBUG: Found', querySnapshot.size, 'rides in collection');
                  setDebugInfo(prev => prev + `Found ${querySnapshot.size} rides in collection\n`);
                  
                  if (querySnapshot.size > 0) {
                    let sampleIds = [];
                    querySnapshot.forEach(doc => {
                      sampleIds.push(doc.id);
                    });
                    console.log('DEBUG: Sample ride IDs:', sampleIds);
                    setDebugInfo(prev => prev + `Sample ride IDs: ${sampleIds.join(', ')}\n`);
                  }
                })
                .catch(err => {
                  console.error('DEBUG: Error listing ride documents:', err);
                  setDebugInfo(prev => prev + `ERROR listing ride documents: ${err.message}\n`);
                });
            } catch (err) {
              console.error('DEBUG: Error importing or executing collection query:', err);
              setDebugInfo(prev => prev + `ERROR importing or executing collection query: ${err.message}\n`);
            }
          }
        })
        .catch(err => {
          console.error('DEBUG: Error checking document existence:', err);
          setDebugInfo(prev => prev + `ERROR checking document existence: ${err.message}\n`);
        });
      
      // Set up the real-time listener for the document
      const rideRef = doc(db, 'rides', cleanRideId);
      
      console.log('DEBUG: Created ride reference:', rideRef.path);
      setDebugInfo(prev => prev + `Created ride reference: ${rideRef.path}\n`);
      
      const unsubscribe = onSnapshot(
        rideRef,
        (doc) => {
          console.log('DEBUG: Received Firestore snapshot');
          setDebugInfo(prev => prev + 'Received Firestore snapshot\n');
          
          if (doc.exists()) {
            const rideData = { id: doc.id, ...doc.data() };
            console.log('DEBUG: Ride document exists:', rideData.id);
            console.log('DEBUG: Ride status:', rideData.status);
            setDebugInfo(prev => prev + `Ride document exists with ID: ${rideData.id}\nStatus: ${rideData.status}\n`);
            
            setRide(rideData);

            // Check if driver has been assigned
            if (rideData.driver_id && rideData.status === 'accepted') {
              console.log('DEBUG: Driver assigned:', rideData.driver_id);
              setDebugInfo(prev => prev + `Driver assigned: ${rideData.driver_id}\n`);
              setSearching(false);
              fetchDriverDetails(rideData.driver_id);
            }

            // Handle ride cancellation
            if (rideData.status === 'cancelled') {
              console.log('DEBUG: Ride was cancelled');
              setDebugInfo(prev => prev + 'Ride was cancelled\n');
              Alert.alert(
                "Ride Cancelled",
                "Your ride has been cancelled.",
                [
                  { text: "OK", onPress: () => router.replace('/components/ride/BookAutoScreen') }
                ]
              );
            }
          } else {
            const errorMsg = 'Ride not found';
            console.error('DEBUG:', errorMsg);
            setDebugInfo(prev => prev + `ERROR: ${errorMsg} - Document does not exist at path: 'rides/${cleanRideId}'\n`);
            setError(errorMsg);
          }
          setLoading(false);
        },
        (err) => {
          console.error('DEBUG: Error listening for ride updates:', err);
          setDebugInfo(prev => prev + `ERROR listening for ride updates: ${err.message}\n`);
          setError('Failed to load ride details: ' + err.message);
          setLoading(false);
        }
      );

      // Debug Firebase connection status
      console.log('DEBUG: Firebase listener initialized');
      setDebugInfo(prev => prev + 'Firebase listener initialized\n');

      // Cleanup listener on unmount
      return () => {
        console.log('DEBUG: Cleaning up Firestore listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('DEBUG: Error setting up ride listener:', err);
      setDebugInfo(prev => prev + `ERROR setting up ride listener: ${err.message}\n`);
      setError('Error setting up ride listener: ' + err.message);
      setLoading(false);
    }
  }, [ride_id]);

  // Fetch driver details when a driver is assigned
  const fetchDriverDetails = async (driverId) => {
    try {
      console.log('DEBUG: Fetching driver details for ID:', driverId);
      setDebugInfo(prev => prev + `Fetching driver details for ID: ${driverId}\n`);
      
      const driverDoc = await getDoc(doc(db, 'drivers', driverId));
      if (driverDoc.exists()) {
        console.log('DEBUG: Driver document found');
        setDebugInfo(prev => prev + 'Driver document found\n');
        setDriver(driverDoc.data());
      } else {
        console.error('DEBUG: Driver document does not exist');
        setDebugInfo(prev => prev + 'ERROR: Driver document does not exist\n');
      }
    } catch (err) {
      console.error('DEBUG: Error fetching driver details:', err);
      setDebugInfo(prev => prev + `ERROR fetching driver details: ${err.message}\n`);
    }
  };

  // Cancel ride
  const cancelRide = async () => {
    Alert.alert(
      "Cancel Ride",
      "Are you sure you want to cancel this ride?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes", 
          style: "destructive",
          onPress: async () => {
            try {
              console.log('DEBUG: Cancelling ride:', ride_id);
              setDebugInfo(prev => prev + `Cancelling ride: ${ride_id}\n`);
              
              const rideRef = doc(db, 'rides', ride_id);
              await updateDoc(rideRef, {
                status: 'cancelled',
                cancelled_at: new Date()
              });
              console.log('DEBUG: Ride cancelled successfully');
              setDebugInfo(prev => prev + 'Ride cancelled successfully\n');
              
              router.replace('/components/ride/BookAutoScreen');
            } catch (err) {
              console.error('DEBUG: Error cancelling ride:', err);
              setDebugInfo(prev => prev + `ERROR cancelling ride: ${err.message}\n`);
              Alert.alert('Error', 'Failed to cancel ride. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Call driver
  const callDriver = () => {
    if (driver && driver.phone) {
      // Implement calling functionality
      console.log('DEBUG: Calling driver:', driver.name, driver.phone);
      Alert.alert('Call Driver', `Calling ${driver.name} at ${driver.phone}`);
    }
  };

  // Navigate back to BookAutoScreen
  const handleBack = () => {
    Alert.alert(
      "Go Back",
      "Going back will cancel your ride search. Are you sure?",
      [
        { text: "Stay Here", style: "cancel" },
        { 
          text: "Go Back", 
          onPress: async () => {
            try {
              if (ride_id) {
                console.log('DEBUG: Cancelling ride on back navigation:', ride_id);
                setDebugInfo(prev => prev + `Cancelling ride on back navigation: ${ride_id}\n`);
                
                const rideRef = doc(db, 'rides', ride_id);
                await updateDoc(rideRef, {
                  status: 'cancelled',
                  cancelled_at: new Date()
                });
                console.log('DEBUG: Ride cancelled on back navigation');
              }
              router.replace('/components/ride/BookAutoScreen');
            } catch (err) {
              console.error('DEBUG: Error cancelling ride on back:', err);
              setDebugInfo(prev => prev + `ERROR cancelling ride on back: ${err.message}\n`);
              router.replace('/components/ride/BookAutoScreen');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading ride details...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        
        {/* Debug information section */}
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>Debug Information:</Text>
          <Text style={styles.debugText}>{debugInfo}</Text>
        </View>
        
        {/* Attempt to fix the ride_id issue */}
        <View style={styles.fixSection}>
          <TouchableOpacity 
            style={styles.fixButton}
            onPress={() => {
              // Try to manually fetch the ride data using getDoc
              Alert.alert(
                "Debug Action",
                "Attempt to manually fetch ride data?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Try", 
                    onPress: async () => {
                      try {
                        setLoading(true);
                        const cleanId = String(ride_id).trim();
                        console.log('DEBUG: Manual fetch attempt with ID:', cleanId);
                        
                        const docRef = doc(db, 'rides', cleanId);
                        const docSnap = await getDoc(docRef);
                        
                        if (docSnap.exists()) {
                          const rideData = { id: docSnap.id, ...docSnap.data() };
                          setRide(rideData);
                          setError(null);
                          setDebugInfo(prev => prev + `Manual fetch SUCCESS! Found ride with ID: ${docSnap.id}\n`);
                          
                          if (rideData.driver_id && rideData.status === 'accepted') {
                            setSearching(false);
                            await fetchDriverDetails(rideData.driver_id);
                          }
                        } else {
                          Alert.alert("Debug Result", "Ride document still not found. Check Firestore database.");
                          setDebugInfo(prev => prev + `Manual fetch failed: Document still not found\n`);
                        }
                      } catch (err) {
                        Alert.alert("Debug Error", `Error: ${err.message}`);
                        setDebugInfo(prev => prev + `Manual fetch ERROR: ${err.message}\n`);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.fixButtonText}>Try Manual Fetch</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => {
              // Offer to create a test ride document
              Alert.alert(
                "Debug Action",
                "Create a test ride document in Firestore?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Create", 
                    onPress: async () => {
                      try {
                        const { setDoc, collection, addDoc } = require('firebase/firestore');
                        
                        setLoading(true);
                        setDebugInfo(prev => prev + `Attempting to create a test ride document...\n`);
                        
                        // Create a test ride document
                        const testRideData = {
                          pickup: pickup || "Test Pickup",
                          destination: destination || "Test Destination",
                          price: price || "200",
                          distance: distance || "5",
                          duration: duration || "15",
                          rideType: rideType || "auto",
                          status: "searching",
                          created_at: new Date(),
                          user_id: auth.currentUser?.uid || "test_user"
                        };
                        
                        // Try to use the existing ride_id if available
                        let testRideRef;
                        if (ride_id) {
                          testRideRef = doc(db, 'rides', String(ride_id).trim());
                          await setDoc(testRideRef, testRideData);
                          setDebugInfo(prev => prev + `Created test ride with provided ID: ${ride_id}\n`);
                        } else {
                          testRideRef = await addDoc(collection(db, 'rides'), testRideData);
                          setDebugInfo(prev => prev + `Created test ride with new ID: ${testRideRef.id}\n`);
                        }
                        
                        Alert.alert(
                          "Test Ride Created", 
                          `Ride document created. ID: ${testRideRef.id || ride_id}`,
                          [
                            { 
                              text: "Use This Ride", 
                              onPress: () => {
                                // Reload the screen with the new ride_id
                                router.replace({
                                  pathname: '/components/ride/RideSearchScreen',
                                  params: {
                                    ride_id: testRideRef.id || ride_id,
                                    pickup: pickup || "Test Pickup",
                                    destination: destination || "Test Destination",
                                    price: price || "200",
                                    distance: distance || "5",
                                    duration: duration || "15",
                                    rideType: rideType || "auto"
                                  }
                                });
                              }
                            }
                          ]
                        );
                      } catch (err) {
                        Alert.alert("Debug Error", `Error creating test ride: ${err.message}`);
                        setDebugInfo(prev => prev + `ERROR creating test ride: ${err.message}\n`);
                      } finally {
                        setLoading(false);
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.fixButtonText}>Create Test Ride</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.replace('/components/ride/BookAutoScreen')}
        >
          <Text style={styles.backButtonText}>Back to Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <ChevronLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {searching ? 'Finding Auto' : 'Driver Found'}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Debug floating button */}
      <TouchableOpacity 
        style={styles.debugButton}
        onPress={() => Alert.alert('Debug Info', debugInfo)}
      >
        <Text style={styles.debugButtonText}>Debug</Text>
      </TouchableOpacity>

      {searching ? (
        <View style={styles.searchingContainer}>
          <View style={styles.animationContainer}>
            <LottieView
              source={SEARCHING_ANIMATION}
              autoPlay
              loop
              style={styles.animation}
            />
          </View>
          
          <Text style={styles.searchingText}>Searching for nearby autos...</Text>
          <Text style={styles.timeText}>Search time: {formatTime(searchTime)}</Text>
          
          <View style={styles.rideInfoCard}>
            <View style={styles.rideInfoHeader}>
              <Text style={styles.rideInfoTitle}>Ride Details</Text>
              <Text style={styles.ridePrice}>₹{price}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <MapPin size={20} color="#3B82F6" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationText}>{pickup}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <Navigation size={20} color="#3B82F6" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationText}>{destination}</Text>
              </View>
            </View>
            
            <View style={styles.rideStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{distance} km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{duration} min</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ride Type</Text>
                <Text style={styles.statValue}>{rideType.charAt(0).toUpperCase() + rideType.slice(1)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={cancelRide}
          >
            <Text style={styles.cancelButtonText}>Cancel Search</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.driverFoundContainer}>
          <View style={styles.driverCard}>
            <Text style={styles.driverFoundText}>Driver Found!</Text>
            
            <View style={styles.driverProfile}>
              <Image 
                source={{ uri: driver?.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400' }}
                style={styles.driverPhoto}
              />
              
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>{driver?.name || 'Driver Name'}</Text>
                <Text style={styles.vehicleInfo}>{driver?.vehicle_details || 'Auto Rickshaw'}</Text>
                <View style={styles.driverRating}>
                  {/* Add rating stars here */}
                  <Text style={styles.ratingText}>{driver?.rating || '4.8'}</Text>
                </View>
              </View>
              
              <TouchableOpacity 
                style={styles.callButton}
                onPress={callDriver}
              >
                <Phone size={20} color="#fff" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.arrivalInfo}>
              <Text style={styles.arrivalText}>
                Arriving in {driver?.eta || '5'} min
              </Text>
              <Text style={styles.vehicleNumber}>
                {driver?.vehicle_number || 'AP 12 AB 3456'}
              </Text>
            </View>
          </View>
          
          <View style={styles.rideInfoCard}>
            <View style={styles.rideInfoHeader}>
              <Text style={styles.rideInfoTitle}>Ride Details</Text>
              <Text style={styles.ridePrice}>₹{price}</Text>
            </View>
            
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <MapPin size={20} color="#3B82F6" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationText}>{pickup}</Text>
              </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.locationContainer}>
              <View style={styles.locationIcon}>
                <Navigation size={20} color="#3B82F6" />
              </View>
              <View style={styles.locationDetails}>
                <Text style={styles.locationLabel}>Destination</Text>
                <Text style={styles.locationText}>{destination}</Text>
              </View>
            </View>
            
            <View style={styles.rideStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Distance</Text>
                <Text style={styles.statValue}>{distance} km</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{duration} min</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Ride Type</Text>
                <Text style={styles.statValue}>{rideType.charAt(0).toUpperCase() + rideType.slice(1)}</Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.cancelButton}
            onPress={cancelRide}
          >
            <Text style={styles.cancelButtonText}>Cancel Ride</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fixSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fixButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  createButton: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginLeft: 8,
  },
  fixButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backBtn: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  backButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  // Debugging styles
  debugButton: {
    position: 'absolute',
    right: 16,
    top: 120,
    backgroundColor: '#FFA500',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    zIndex: 999,
  },
  debugButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  debugContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxHeight: 300,
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#334155',
    fontFamily: 'monospace',
  },
  // Searching screen
  searchingContainer: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
  },
  animationContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  searchingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 16,
    fontFamily: 'Inter-SemiBold',
  },
  timeText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: 8,
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  // Driver found screen
  driverFoundContainer: {
    flex: 1,
    padding: 16,
  },
  driverCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  driverFoundText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Inter-SemiBold',
  },
  driverProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverPhoto: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#64748B',
    marginVertical: 2,
    fontFamily: 'Inter-Regular',
  },
  driverRating: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
  },
  callButton: {
    backgroundColor: '#3B82F6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrivalInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  arrivalText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  vehicleNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  // Ride info card - shared between searching and driver found screens
  rideInfoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  rideInfoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  rideInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    fontFamily: 'Inter-SemiBold',
  },
  ridePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  locationText: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 12,
    marginLeft: 32,
  },
  rideStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    marginTop: 4,
    fontFamily: 'Inter-Medium',
  },
  cancelButton: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginTop: 'auto',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});