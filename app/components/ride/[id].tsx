import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { router } from 'expo-router';
import { MapPin, Clock, Users, ArrowLeft, Star } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

type RideDetail = {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  departure_time: string;
  available_seats: number;
  price: number;
  vehicle_name: string;
  driver: {
    id: string;
    full_name: string;
    avatar_url: string;
    rating: number;
  };
};

export default function RideDetailScreen() {
  const { id } = useLocalSearchParams();
  const [user, setUser] = useState(null); // Simple user state without useAuth
  const [ride, setRide] = useState<RideDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestedSeats, setRequestedSeats] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRideDetails();
    // Get current user from supabase
    getCurrentUser();
  }, [id]);

  const getCurrentUser = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (data?.session?.user) {
        setUser(data.session.user);
      }
    } catch (err) {
      console.error('Error getting current user:', err);
    }
  };

  const fetchRideDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setRide({
          id: data.id,
          pickup_location: data.pickup_location,
          dropoff_location: data.dropoff_location,
          departure_time: data.departure_time,
          available_seats: data.available_seats,
          price: data.price,
          vehicle_name: data.vehicle_name || 'Unknown Vehicle',
          driver: {
            id: data.driver_id,
            full_name: data.driver_full_name || 'Unknown Driver',
            avatar_url: data.driver_avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80',
            rating: data.driver_rating || 4.5,
          }
        });
      }
    } catch (err) {
      console.error('Error fetching ride details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load ride details');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestSeat = async () => {
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to request a ride');
      router.push('/(auth)/login');
      return;
    }

    if (ride && requestedSeats > ride.available_seats) {
      Alert.alert('Not enough seats', `Only ${ride.available_seats} seats available`);
      return;
    }

    setRequestLoading(true);

    try {
      const { data, error } = await supabase
        .from('ride_requests')
        .insert({
          ride_id: ride?.id,
          passenger_id: user.id,
          status: 'pending',
          seats_requested: requestedSeats,
        });

      if (error) throw error;

      Alert.alert(
        'Request Submitted',
        'Your ride request has been submitted successfully.',
        [{ text: 'OK', onPress: () => router.push('/(app)') }]
      );
    } catch (err) {
      console.error('Error submitting ride request:', err);
      Alert.alert('Error', 'Failed to submit ride request. Please try again.');
    } finally {
      setRequestLoading(false);
    }
  };

  const incrementSeats = () => {
    if (ride && requestedSeats < ride.available_seats) {
      setRequestedSeats(prev => prev + 1);
    }
  };

  const decrementSeats = () => {
    if (requestedSeats > 1) {
      setRequestedSeats(prev => prev - 1);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (error || !ride) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error || 'Ride not found'}</Text>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.driverInfoContainer}>
          <Image
            source={{ uri: ride.driver.avatar_url }}
            style={styles.driverImage}
          />
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{ride.driver.full_name}</Text>
            <View style={styles.ratingContainer}>
              <Star size={16} color="#EAB308" fill="#EAB308" />
              <Text style={styles.ratingText}>{ride.driver.rating.toFixed(1)}</Text>
            </View>
          </View>
          <Text style={styles.price}>${ride.price}</Text>
        </View>

        <View style={styles.carInfoContainer}>
          <Text style={styles.carInfoLabel}>Vehicle</Text>
          <Text style={styles.carInfoValue}>{ride.vehicle_name}</Text>
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Ride Details</Text>
          
          <View style={styles.locationContainer}>
            <View style={styles.locationDot} />
            <View style={styles.locationLine} />
            <View style={styles.locationDot} />
            
            <View style={styles.locationsContent}>
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Pickup</Text>
                <Text style={styles.locationValue}>{ride.pickup_location}</Text>
              </View>
              
              <View style={styles.locationItem}>
                <Text style={styles.locationLabel}>Dropoff</Text>
                <Text style={styles.locationValue}>{ride.dropoff_location}</Text>
              </View>
            </View>
          </View>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Clock size={16} color="#64748B" />
              <Text style={styles.detailText}>
                {new Date(ride.departure_time).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <View style={styles.detailItem}>
              <Users size={16} color="#64748B" />
              <Text style={styles.detailText}>
                {ride.available_seats} seats available
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.bookingSection}>
          <Text style={styles.bookingSectionTitle}>Request Seat</Text>
          
          <View style={styles.seatsContainer}>
            <Text style={styles.seatsLabel}>Number of seats:</Text>
            <View style={styles.seatsControls}>
              <TouchableOpacity 
                style={styles.seatButton}
                onPress={decrementSeats}
              >
                <Text style={styles.seatButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.seatCount}>{requestedSeats}</Text>
              <TouchableOpacity 
                style={styles.seatButton}
                onPress={incrementSeats}
              >
                <Text style={styles.seatButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total price:</Text>
            <Text style={styles.totalPrice}>${(ride.price * requestedSeats).toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.requestButton}
          onPress={handleRequestSeat}
          disabled={requestLoading}
        >
          {requestLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.requestButtonText}>Request Ride</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#fff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 60,
      paddingBottom: 16,
      backgroundColor: '#fff',
    },
    backButton: {
      padding: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#1E293B',
      marginLeft: 8,
    },
    content: {
      flex: 1,
      padding: 24,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: '#fff',
      padding: 24,
    },
    errorText: {
      fontSize: 16,
      color: '#DC2626',
      fontFamily: 'Inter-Medium',
      textAlign: 'center',
      marginBottom: 16,
    },
    backButtonText: {
      color: '#3B82F6',
      fontSize: 16,
      fontFamily: 'Inter-Medium',
    },
    driverInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 24,
    },
    driverImage: {
      width: 60,
      height: 60,
      borderRadius: 30,
      marginRight: 16,
    },
    driverDetails: {
      flex: 1,
    },
    driverName: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#1E293B',
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
      marginLeft: 4,
    },
    price: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: '#3B82F6',
    },
    carInfoContainer: {
      marginBottom: 24,
    },
    carInfoLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#64748B',
    },
    carInfoValue: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: '#1E293B',
      marginTop: 4,
    },
    detailsCard: {
      backgroundColor: '#F8FAFC',
      borderRadius: 16,
      padding: 24,
      marginBottom: 24,
    },
    detailsTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#1E293B',
      marginBottom: 16,
    },
    locationContainer: {
      position: 'relative',
      marginBottom: 24,
      flexDirection: 'row',
    },
    locationDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#3B82F6',
      marginTop: 6,
    },
    locationLine: {
      position: 'absolute',
      left: 4,
      top: 16,
      width: 2,
      height: 40,
      backgroundColor: '#3B82F6',
    },
    locationsContent: {
      flex: 1,
      marginLeft: 16,
    },
    locationItem: {
      marginBottom: 22,
    },
    locationLabel: {
      fontSize: 14,
      fontFamily: 'Inter-Regular',
      color: '#64748B',
    },
    locationValue: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: '#1E293B',
      marginTop: 4,
    },
    detailsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    detailItem: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    detailText: {
      marginLeft: 8,
      fontSize: 14,
      fontFamily: 'Inter-Medium',
      color: '#64748B',
    },
    bookingSection: {
      marginBottom: 100,
    },
    bookingSectionTitle: {
      fontSize: 18,
      fontFamily: 'Inter-SemiBold',
      color: '#1E293B',
      marginBottom: 16,
    },
    seatsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    seatsLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: '#64748B',
    },
    seatsControls: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    seatButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EEF2FF',
      alignItems: 'center',
      justifyContent: 'center',
    },
    seatButtonText: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#3B82F6',
    },
    seatCount: {
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
      color: '#1E293B',
      marginHorizontal: 16,
    },
    priceContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    priceLabel: {
      fontSize: 16,
      fontFamily: 'Inter-Medium',
      color: '#64748B',
    },
    totalPrice: {
      fontSize: 24,
      fontFamily: 'Inter-Bold',
      color: '#3B82F6',
    },
    footer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: '#fff',
      padding: 24,
      borderTopWidth: 1,
      borderTopColor: '#E2E8F0',
    },
    requestButton: {
      backgroundColor: '#3B82F6',
      borderRadius: 12,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
    },
    requestButtonText: {
      color: '#fff',
      fontSize: 16,
      fontFamily: 'Inter-SemiBold',
    }
  });