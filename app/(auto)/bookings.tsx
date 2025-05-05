import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  RefreshControl, 
  Alert,
  Image,
  Linking
} from 'react-native';
import { 
  MapPin, 
  Navigation, 
  ChevronRight, 
  Clock, 
  IndianRupee, 
  Calendar, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  CreditCard
} from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { collection, query, where, getDocs, orderBy, doc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';

export default function MyBookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all bookings for current user
  const fetchBookings = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        setError('You must be logged in to view your bookings');
        setLoading(false);
        return;
      }

      // Query auto_rides collection for the current user's rides
      const ridesQuery = query(
        collection(db, 'auto_rides'),
        where('user_id', '==', currentUser.uid),
        orderBy('created_at', 'desc') // Most recent bookings first
      );

      const querySnapshot = await getDocs(ridesQuery);
      
      const userBookings = [];
      querySnapshot.forEach((doc) => {
        userBookings.push({
          id: doc.id,
          ...doc.data(),
          // Convert timestamp to Date object if it exists
          created_at: doc.data().created_at ? doc.data().created_at.toDate() : null,
          completed_at: doc.data().completed_at ? doc.data().completed_at.toDate() : null
        });
      });

      setBookings(userBookings);
      setError(null);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load your bookings');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchBookings();
  }, []);

  // Handle pull-to-refresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  // Format date to readable string
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  // Handle payment for confirmed rides
  const handlePayment = (booking) => {
    // Here you would integrate with your payment gateway
    // For now, let's create a mock payment flow with UPI deep linking
    
    // Mock UPI ID for the auto service
    const upiId = "autoservice@ybl";
    const amount = booking.price;
    const transactionNote = `Auto ride payment - ${booking.id}`;
    const merchantName = "VIT-AP Auto Service";
    
    // Create UPI intent URL
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tn=${encodeURIComponent(transactionNote)}&am=${amount}&cu=INR`;
    
    // Check if the device can handle UPI deep linking
    Linking.canOpenURL(upiUrl).then(supported => {
      if (supported) {
        // Open the UPI payment app
        Linking.openURL(upiUrl);
        
        // After returning from payment app, ask user if payment was successful
        // In a real app, you'd verify this with your backend
        setTimeout(() => {
          Alert.alert(
            "Payment Status",
            "Was your payment successful?",
            [
              {
                text: "No, Try Again",
                style: "cancel"
              },
              { 
                text: "Yes, Completed", 
                onPress: () => updatePaymentStatus(booking.id)
              }
            ]
          );
        }, 1000);
      } else {
        // If UPI apps aren't available, show alternative payment instructions
        Alert.alert(
          "UPI Apps Not Found",
          "Please install a UPI payment app like Google Pay, PhonePe, or Paytm to make payments.",
          [{ text: "OK" }]
        );
      }
    }).catch(err => {
      console.error('Error with payment linking:', err);
      Alert.alert("Payment Error", "Unable to process payment request.");
    });
  };
  
  // Update payment status in Firestore
  const updatePaymentStatus = async (bookingId) => {
    try {
      // Update the status to "paid" in Firestore
      const bookingRef = doc(db, 'auto_rides', bookingId);
      await updateDoc(bookingRef, {
        status: 'paid'
      });
      
      // Refresh bookings to show updated status
      fetchBookings();
      
      Alert.alert(
        "Payment Successful",
        "Thank you! Your ride payment has been completed.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Error updating payment status:', error);
      Alert.alert(
        "Update Failed",
        "There was an error updating your payment. Please contact support.",
        [{ text: "OK" }]
      );
    }
  };

  // View ride details
  const viewRideDetails = (booking) => {
    // Navigate to a detailed view of the booking
    router.push({
      pathname: '/components/RideDetailsScreen',
      params: { ride_id: booking.id }
    });
  };

  // Get status icon based on ride status
  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed':
        return <AlertCircle size={18} color="#F59E0B" />;
      case 'completed':
        return <CheckCircle size={18} color="#10B981" />;
      case 'paid':
        return <CheckCircle size={18} color="#10B981" />;
      case 'cancelled':
        return <XCircle size={18} color="#EF4444" />;
      default:
        return <Clock size={18} color="#3B82F6" />;
    }
  };

  // Get human-readable status text
  const getStatusText = (status) => {
    switch(status) {
      case 'confirmed':
        return 'Payment Pending';
      case 'completed':
        return 'Completed';
      case 'paid':
        return 'Paid';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Processing';
    }
  };

  // Get color for status badge
  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed':
        return '#FEF3C7'; // Light amber background
      case 'completed':
      case 'paid':
        return '#D1FAE5'; // Light green background
      case 'cancelled':
        return '#FEE2E2'; // Light red background
      default:
        return '#DBEAFE'; // Light blue background
    }
  };

  // Get text color for status badge
  const getStatusTextColor = (status) => {
    switch(status) {
      case 'confirmed':
        return '#B45309'; // Amber text
      case 'completed':
      case 'paid':
        return '#047857'; // Green text
      case 'cancelled':
        return '#B91C1C'; // Red text
      default:
        return '#1E40AF'; // Blue text
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading your bookings...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Image 
            source={{uri: 'https://images.unsplash.com/photo-1612178537253-bccd437b730e?q=80&w=720'}}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No Bookings Yet</Text>
          <Text style={styles.emptyText}>Your auto ride bookings will appear here</Text>
          <TouchableOpacity 
            style={styles.bookNowButton}
            onPress={() => router.replace('/components/BookAutoScreen')}
          >
            <Text style={styles.bookNowButtonText}>Book an Auto</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#3B82F6']}
            />
          }
        >
          {bookings.map((booking) => (
            <TouchableOpacity 
              key={booking.id} 
              style={styles.bookingCard}
              onPress={() => viewRideDetails(booking)}
            >
              {/* Status Badge */}
              <View 
                style={[
                  styles.statusBadge, 
                  { backgroundColor: getStatusColor(booking.status) }
                ]}
              >
                {getStatusIcon(booking.status)}
                <Text 
                  style={[
                    styles.statusText,
                    { color: getStatusTextColor(booking.status) }
                  ]}
                >
                  {getStatusText(booking.status)}
                </Text>
              </View>
              
              {/* Locations */}
              <View style={styles.locations}>
                <View style={styles.locationItem}>
                  <View style={styles.locationIconContainer}>
                    <MapPin size={18} color="#3B82F6" />
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Pickup</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {booking.pickup?.name || booking.pickup?.address || 'Not specified'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.divider} />
                
                <View style={styles.locationItem}>
                  <View style={styles.locationIconContainer}>
                    <Navigation size={18} color="#3B82F6" />
                  </View>
                  <View style={styles.locationDetails}>
                    <Text style={styles.locationLabel}>Destination</Text>
                    <Text style={styles.locationText} numberOfLines={1}>
                      {booking.destination?.name || booking.destination?.address || 'Not specified'}
                    </Text>
                  </View>
                </View>
              </View>
              
              {/* Ride Details */}
              <View style={styles.rideDetails}>
                <View style={styles.rideDetail}>
                  <Calendar size={16} color="#64748B" />
                  <Text style={styles.rideDetailText}>
                    {formatDate(booking.created_at)}
                  </Text>
                </View>
                
                <View style={styles.rideDetail}>
                  <Clock size={16} color="#64748B" />
                  <Text style={styles.rideDetailText}>
                    {Math.round(booking.duration)} min
                  </Text>
                </View>
                
                <View style={styles.rideDetail}>
                  <IndianRupee size={16} color="#64748B" />
                  <Text style={styles.rideDetailText}>
                    ₹{booking.price}
                  </Text>
                </View>
              </View>
              
              {/* Actions */}
              <View style={styles.actions}>
                {booking.status === 'confirmed' && (
                  <TouchableOpacity 
                    style={styles.payButton}
                    onPress={() => handlePayment(booking)}
                  >
                    <CreditCard size={16} color="#ffffff" />
                    <Text style={styles.payButtonText}>Pay Online</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={styles.viewButton}
                  onPress={() => viewRideDetails(booking)}
                >
                  <Text style={styles.viewButtonText}>View Details</Text>
                  <ChevronRight size={16} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Inter-Regular',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'Inter-Regular',
  },
  bookNowButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  bookNowButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
  scrollContent: {
    padding: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
    fontFamily: 'Inter-Medium',
  },
  locations: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  locationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  locationDetails: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
    fontFamily: 'Inter-Regular',
  },
  locationText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
    fontFamily: 'Inter-Medium',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 8,
    marginLeft: 48,
  },
  rideDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  rideDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rideDetailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
    fontFamily: 'Inter-SemiBold',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  viewButtonText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
    fontFamily: 'Inter-Medium',
  },
});