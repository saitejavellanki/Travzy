import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { auth, db } from '../../firebase/Config';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { CheckCircle, XCircle, MapPin, Clock, Users, Phone } from 'lucide-react-native';
import { router } from 'expo-router';

export default function RideRequestsScreen() {
  const [rideRequests, setRideRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    getUserSession();
  }, []);

  const getUserSession = async () => {
    try {
      // Get the current user from Firebase Auth
      const currentUser = auth.currentUser;
      
      if (currentUser) {
        setUserId(currentUser.uid);
        fetchDriverRideRequests(currentUser.uid);
      } else {
        setLoading(false);
        Alert.alert('Not logged in', 'Please login to view ride requests');
      }
    } catch (error) {
      console.error('Error getting user session:', error);
      setLoading(false);
    }
  };

  const fetchDriverRideRequests = async (driverId) => {
    try {
      setLoading(true);
      
      // First, get all rides that belong to this driver
      const ridesQuery = query(
        collection(db, 'rides'),
        where('driver_id', '==', driverId),
        where('status', '==', 'active')
      );
      
      const ridesSnapshot = await getDocs(ridesQuery);
      
      if (ridesSnapshot.empty) {
        setRideRequests([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get the ride IDs
      const driverRides = [];
      ridesSnapshot.forEach((doc) => {
        driverRides.push({ id: doc.id, ...doc.data() });
      });
      
      const rideIds = driverRides.map(ride => ride.id);
      
      // Create an array to store all requests with their details
      let allRequests = [];
      
      // For each ride, get the pending ride requests
      for (const rideId of rideIds) {
        const requestsQuery = query(
          collection(db, 'ride_requests'),
          where('ride_id', '==', rideId),
          where('status', '==', 'pending')
        );
        
        const requestsSnapshot = await getDocs(requestsQuery);
        
        if (!requestsSnapshot.empty) {
          // For each request, get the ride details and passenger profile
          for (const requestDoc of requestsSnapshot.docs) {
            const requestData = { id: requestDoc.id, ...requestDoc.data() };
            
            // Get ride details
            const rideDoc = await getDoc(doc(db, 'rides', requestData.ride_id));
            const rideData = rideDoc.exists() ? rideDoc.data() : null;
            
            // Get passenger profile
            const profileDoc = await getDoc(doc(db, 'profiles', requestData.passenger_id));
            const profileData = profileDoc.exists() ? { user_id: profileDoc.id, ...profileDoc.data() } : null;
            
            // Combine all data
            allRequests.push({
              ...requestData,
              rides: rideData,
              profiles: profileData
            });
          }
        }
      }
      
      // Sort by created_at timestamp (newest first)
      allRequests.sort((a, b) => {
        return new Date(b.created_at) - new Date(a.created_at);
      });
      
      setRideRequests(allRequests);
    } catch (error) {
      console.error('Error fetching ride requests:', error);
      Alert.alert('Error', 'Failed to load ride requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userId) {
      fetchDriverRideRequests(userId);
    } else {
      setRefreshing(false);
    }
  };

  const handleAcceptRequest = (requestId, rideId, seatsRequested) => {
    Alert.alert(
      'Accept Request',
      `Are you sure you want to accept this ride request for ${seatsRequested} seat(s)?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Accept',
          onPress: () => acceptRideRequest(requestId, rideId, seatsRequested),
        },
      ]
    );
  };

  const acceptRideRequest = async (requestId, rideId, seatsRequested) => {
    try {
      setLoading(true);
      
      // First check if there are enough seats available
      const rideRef = doc(db, 'rides', rideId);
      const rideSnapshot = await getDoc(rideRef);
      
      if (!rideSnapshot.exists()) {
        Alert.alert('Error', 'Ride not found');
        setLoading(false);
        return;
      }
      
      const rideData = rideSnapshot.data();
      
      if (rideData.available_seats < seatsRequested) {
        Alert.alert('Error', 'Not enough seats available for this request');
        setLoading(false);
        return;
      }
      
      // Update the ride request status
      const requestRef = doc(db, 'ride_requests', requestId);
      await updateDoc(requestRef, {
        status: 'accepted'
      });
      
      // Update the available seats
      const newAvailableSeats = rideData.available_seats - seatsRequested;
      await updateDoc(rideRef, {
        available_seats: newAvailableSeats
      });
      
      Alert.alert('Success', 'Ride request accepted successfully');
      fetchDriverRideRequests(userId);
    } catch (error) {
      console.error('Error accepting ride request:', error);
      Alert.alert('Error', 'Failed to accept ride request');
      setLoading(false);
    }
  };

  const handleDeclineRequest = (requestId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this ride request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Decline',
          onPress: () => declineRideRequest(requestId),
          style: 'destructive',
        },
      ]
    );
  };

  const declineRideRequest = async (requestId) => {
    try {
      setLoading(true);
      
      const requestRef = doc(db, 'ride_requests', requestId);
      await updateDoc(requestRef, {
        status: 'declined'
      });
      
      Alert.alert('Success', 'Ride request declined');
      fetchDriverRideRequests(userId);
    } catch (error) {
      console.error('Error declining ride request:', error);
      Alert.alert('Error', 'Failed to decline ride request');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ride Requests</Text>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {rideRequests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You have no pending ride requests</Text>
            <TouchableOpacity 
              style={styles.viewRidesButton}
              onPress={() => router.push('/rides')}
            >
              <Text style={styles.viewRidesButtonText}>View My Rides</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rideRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                  <View style={styles.avatarCircle}>
                    {request.profiles?.full_name ? (
                      <Text style={styles.avatarText}>
                        {request.profiles.full_name.charAt(0).toUpperCase()}
                      </Text>
                    ) : (
                      <Text style={styles.avatarText}>?</Text>
                    )}
                  </View>
                  <Text style={styles.passengerName}>
                    {request.profiles?.full_name || 'Unknown Passenger'}
                  </Text>
                </View>
                <Text style={styles.requestStatus}>Pending</Text>
              </View>
              
              <View style={styles.rideDetails}>
                <View style={styles.locationRow}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.location}>From: {request.rides?.pickup_location || 'Unknown'}</Text>
                </View>
                <View style={styles.locationRow}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.location}>To: {request.rides?.dropoff_location || 'Unknown'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Clock size={16} color="#64748B" />
                    <Text style={styles.infoText}>
                      {request.rides?.departure_time ? 
                        new Date(request.rides.departure_time).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Unknown time'}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Users size={16} color="#64748B" />
                    <Text style={styles.infoText}>{request.seats_requested} seat(s) requested</Text>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Phone size={16} color="#64748B" />
                      <Text style={styles.infoText}>
                        {request.profiles?.phone_no || 'No phone number'}
                      </Text>
                  </View>
                </View>
                
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>Ride Price:</Text>
                  <Text style={styles.price}>${request.rides?.price || 0}</Text>
                </View>
                
                <Text style={styles.requestDate}>
                  Requested on {new Date(request.created_at).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.actions}>
                <TouchableOpacity 
                  style={styles.acceptButton}
                  onPress={() => handleAcceptRequest(request.id, request.ride_id, request.seats_requested)}
                >
                  <CheckCircle size={16} color="#10B981" />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.declineButton}
                  onPress={() => handleDeclineRequest(request.id)}
                >
                  <XCircle size={16} color="#EF4444" />
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    color: '#1E293B',
    fontFamily: 'Inter-Bold',
    marginBottom: 20,
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
    marginBottom: 20,
    textAlign: 'center',
  },
  viewRidesButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  viewRidesButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  passengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  passengerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  requestStatus: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rideDetails: {
    padding: 16,
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  location: {
    marginLeft: 8,
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  priceLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  price: {
    fontSize: 18,
    color: '#3B82F6',
    fontFamily: 'Inter-Bold',
  },
  requestDate: {
    fontSize: 12,
    color: '#94A3B8',
    fontFamily: 'Inter-Regular',
    marginTop: 8,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    flex: 1,
    marginRight: 8,
  },
  declineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    flex: 1,
    marginLeft: 8,
  },
  acceptText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#10B981',
    fontFamily: 'Inter-Medium',
  },
  declineText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
  },
});