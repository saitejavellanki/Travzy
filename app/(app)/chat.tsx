import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, MapPin, Clock, Users } from 'lucide-react-native';
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
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        setUserId(session.user.id);
        fetchDriverRideRequests(session.user.id);
      } else {
        setLoading(false);
        Alert.alert('Not logged in', 'Please login to view ride requests');
      }
    } catch (error) {
      console.error('Error getting user session:', error);
      setLoading(false);
    }
  };

  // Change this function in your code
// Updated fetchDriverRideRequests function with correct join syntax
const fetchDriverRideRequests = async (driverId) => {
    try {
      setLoading(true);
      
      // First, get all rides that belong to this driver
      const { data: driverRides, error: ridesError } = await supabase
        .from('rides')
        .select('id')
        .eq('driver_id', driverId)
        .eq('status', 'active');
      
      if (ridesError) throw ridesError;
      
      if (!driverRides || driverRides.length === 0) {
        setRideRequests([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      // Get the ride IDs
      const rideIds = driverRides.map(ride => ride.id);
      
      // Get all ride requests for these rides with correct join syntax
      const { data: requests, error: requestsError } = await supabase
        .from('ride_requests')
        .select(`
          *,
          rides (
            id,
            pickup_location,
            dropoff_location,
            departure_time,
            available_seats,
            price,
            vehicle_name
          )
        `)
        .in('ride_id', rideIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (requestsError) {
        console.error('Error fetching ride requests:', requestsError);
        throw requestsError;
      }
      
      // If we have requests, we need to fetch the passenger profiles separately
      if (requests && requests.length > 0) {
        // Extract all passenger IDs
        const passengerIds = requests.map(request => request.passenger_id);
        
        // Fetch profiles for these passengers
        const { data: passengerProfiles, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .in('user_id', passengerIds);
        
        if (profilesError) {
          console.error('Error fetching passenger profiles:', profilesError);
          throw profilesError;
        }
        
        // Create a map of passenger profiles for fast lookup
        const profilesMap = {};
        if (passengerProfiles) {
          passengerProfiles.forEach(profile => {
            profilesMap[profile.user_id] = profile;
          });
        }
        
        // Attach profiles to requests
        const requestsWithProfiles = requests.map(request => ({
          ...request,
          profiles: profilesMap[request.passenger_id] || null
        }));
        
        setRideRequests(requestsWithProfiles);
      } else {
        setRideRequests([]);
      }
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
      const { data: rideData, error: rideError } = await supabase
        .from('rides')
        .select('available_seats')
        .eq('id', rideId)
        .single();
      
      if (rideError) throw rideError;
      
      if (rideData.available_seats < seatsRequested) {
        Alert.alert('Error', 'Not enough seats available for this request');
        setLoading(false);
        return;
      }
      
      // Update the ride request status
      const { error: updateRequestError } = await supabase
        .from('ride_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
      
      if (updateRequestError) throw updateRequestError;
      
      // Update the available seats
      const newAvailableSeats = rideData.available_seats - seatsRequested;
      const { error: updateRideError } = await supabase
        .from('rides')
        .update({ available_seats: newAvailableSeats })
        .eq('id', rideId);
      
      if (updateRideError) throw updateRideError;
      
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
      
      const { error } = await supabase
        .from('ride_requests')
        .update({ status: 'declined' })
        .eq('id', requestId);
      
      if (error) throw error;
      
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
              onPress={() => router.push('./components/rides')}
            >
              <Text style={styles.viewRidesButtonText}>View My Rides</Text>
            </TouchableOpacity>
          </View>
        ) : (
          rideRequests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.cardHeader}>
                <View style={styles.passengerInfo}>
                  {/* FIXED: Changed from request.passengers to request.profiles */}
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