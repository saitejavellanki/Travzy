import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { supabase } from '@/lib/supabase';
import { Edit2, Trash2, Users, Clock, MapPin } from 'lucide-react-native';
import { router } from 'expo-router';

export default function RidesScreen() {
  const [userRides, setUserRides] = useState([]);
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
        fetchUserRides(session.user.id);
      } else {
        setLoading(false);
        Alert.alert('Not logged in', 'Please login to view your rides');
      }
    } catch (error) {
      console.error('Error getting user session:', error);
      setLoading(false);
    }
  };

  const fetchUserRides = async (uid) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('driver_id', uid)
        .order('departure_time', { ascending: true });
      
      if (error) throw error;
      
      setUserRides(data || []);
    } catch (error) {
      console.error('Error fetching user rides:', error);
      Alert.alert('Error', 'Failed to load your rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (userId) {
      fetchUserRides(userId);
    } else {
      setRefreshing(false);
    }
  };

  const handleUpdateSeats = (ride) => {
    // Show dialog to update seats
    Alert.prompt(
      'Update Available Seats',
      `Current seats: ${ride.available_seats}`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Update',
          onPress: (seats) => updateRideSeats(ride.id, parseInt(seats)),
        },
      ],
      'plain-text',
      ride.available_seats.toString()
    );
  };

  const updateRideSeats = async (rideId, seats) => {
    try {
      if (isNaN(seats) || seats < 0) {
        Alert.alert('Invalid input', 'Please enter a valid number of seats');
        return;
      }

      setLoading(true);
      
      const { error } = await supabase
        .from('rides')
        .update({ available_seats: seats })
        .eq('id', rideId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Seats updated successfully');
      fetchUserRides(userId);
    } catch (error) {
      console.error('Error updating seats:', error);
      Alert.alert('Error', 'Failed to update seats');
      setLoading(false);
    }
  };

  const handleCancelRide = (rideId) => {
    Alert.alert(
      'Cancel Ride',
      'Are you sure you want to cancel this ride?',
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes',
          onPress: () => cancelRide(rideId),
          style: 'destructive',
        },
      ]
    );
  };

  const cancelRide = async (rideId) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('rides')
        .update({ status: 'cancelled' })
        .eq('id', rideId);
      
      if (error) throw error;
      
      Alert.alert('Success', 'Ride cancelled successfully');
      fetchUserRides(userId);
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel ride');
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
      <Text style={styles.title}>My Rides</Text>
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {userRides.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>You haven't offered any rides yet</Text>
            <TouchableOpacity 
                    style={styles.offerButton}
                    onPress={() => router.push('./components/offer-ride')}
                  >
                    <Text style={styles.offerButtonText}>Offer a Ride</Text>
                  </TouchableOpacity>
          </View>
        ) : (
          userRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.rideStatus}>
                  {ride.status === 'active' ? '🟢 Active' : 
                   ride.status === 'completed' ? '✅ Completed' : '❌ Cancelled'}
                </Text>
                <Text style={styles.price}>${ride.price}</Text>
              </View>
              
              <View style={styles.rideDetails}>
                <View style={styles.locationRow}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.location}>From: {ride.pickup_location}</Text>
                </View>
                <View style={styles.locationRow}>
                  <MapPin size={16} color="#3B82F6" />
                  <Text style={styles.location}>To: {ride.dropoff_location}</Text>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Clock size={16} color="#64748B" />
                    <Text style={styles.infoText}>
                      {new Date(ride.departure_time).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Users size={16} color="#64748B" />
                    <Text style={styles.infoText}>{ride.available_seats} seats</Text>
                  </View>
                  <Text style={styles.vehicleText}>{ride.vehicle_name || 'Vehicle not specified'}</Text>
                </View>
              </View>
              
              {ride.status === 'active' && (
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleUpdateSeats(ride)}
                  >
                    <Edit2 size={16} color="#3B82F6" />
                    <Text style={styles.actionText}>Update Seats</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelRide(ride.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.cancelText}>Cancel Ride</Text>
                  </TouchableOpacity>
                </View>
              )}
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
  offerButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  offerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  rideCard: {
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
  rideStatus: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
  },
  price: {
    fontSize: 18,
    color: '#3B82F6',
    fontFamily: 'Inter-Bold',
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
  vehicleText: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    flex: 1,
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    marginRight: 0,
    marginLeft: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
  cancelText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
  },
});