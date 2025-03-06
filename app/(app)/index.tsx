import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Search, MapPin, Clock, Users } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';

type Ride = {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  departure_time: string;
  available_seats: number;
  price: number;
  driver_id: string;
  driver_full_name: string;
  driver_avatar_url: string | null;
  status: string;
};

type FormattedRide = {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  departure_time: string;
  available_seats: number;
  price: number;
  driver: {
    id: string;
    full_name: string;
    avatar_url: string;
  };
};

export default function HomeScreen() {
  const [rides, setRides] = useState<FormattedRide[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRides = async () => {
    try {
      console.log('Fetching rides...');
      
      // First approach: Try direct query without joins
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('status', 'active')
        .order('departure_time', { ascending: true });

      if (error) {
        console.error('Supabase query error:', error);
        throw error;
      }
      
      console.log('Fetched rides:', data?.length || 0);
      
      if (data && data.length > 0) {
        // Transform the data to match the expected format
        const formattedRides: FormattedRide[] = data.map((ride: any) => ({
          id: ride.id,
          pickup_location: ride.pickup_location,
          dropoff_location: ride.dropoff_location,
          departure_time: ride.departure_time,
          available_seats: ride.available_seats,
          price: ride.price,
          driver: {
            id: ride.driver_id || 'unknown',
            full_name: ride.driver_full_name || 'Unknown Driver',
            avatar_url: ride.driver_avatar_url || ''
          }
        }));
        
        setRides(formattedRides);
      } else {
        // If no data is returned, set empty array
        setRides([]);
        console.log('No active rides found');
      }
    } catch (err) {
      console.error('Error in fetchRides:', err);
      setError(err instanceof Error ? err.message : 'Failed to load rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRides();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
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
      <View style={styles.header}>
        <Text style={styles.greeting}>Good morning, Alex</Text>
        <Text style={styles.title}>Find a ride</Text>
      </View>

      <TouchableOpacity style={styles.searchBar}>
        <Search size={20} color="#64748B" />
        <Text style={styles.searchText}>Where are you going?</Text>
      </TouchableOpacity>

      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchRides}
            >
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Available Rides</Text>
            
            {rides.length === 0 ? (
              <View style={styles.noRidesContainer}>
                <Text style={styles.noRidesText}>No rides available at the moment</Text>
              </View>
            ) : (
              rides.map((ride) => (
                <TouchableOpacity 
                  key={ride.id} 
                  style={styles.rideCard}
                  onPress={() => router.push(`/ride/${ride.id}`)}
                >
                  <View style={styles.rideHeader}>
                    <Image
                      source={{ 
                        uri: ride.driver.avatar_url || 
                            'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&auto=format&fit=crop&q=80' 
                      }}
                      style={styles.driverImage}
                    />
                    <View>
                      <Text style={styles.driverName}>{ride.driver.full_name}</Text>
                      <Text style={styles.carInfo}>Tesla Model 3 • White</Text>
                    </View>
                    <Text style={styles.price}>${ride.price}</Text>
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
  searchText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
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
    marginBottom: 16,
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
});