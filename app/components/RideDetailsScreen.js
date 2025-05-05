import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Linking,
  Image
} from 'react-native';
import { 
  MapPin, 
  Navigation, 
  ArrowLeft, 
  Clock, 
  Calendar, 
  IndianRupee, 
  CheckCircle, 
  AlertCircle,
  PhoneCall,
  MessageSquare,
  CreditCard,
  Share2
} from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useLocalSearchParams, router } from 'expo-router';

export default function RideDetailsScreen() {
  const { ride_id } = useLocalSearchParams();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Fetch ride details
  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        if (!ride_id) {
          setError('No ride ID provided');
          setLoading(false);
          return;
        }

        setLoading(true);
        const rideDoc = await getDoc(doc(db, 'auto_rides', ride_id));
        
        if (!rideDoc.exists()) {
          setError('Ride not found');
          setLoading(false);
          return;
        }
        
        const rideData = {
          id: rideDoc.id,
          ...rideDoc.data(),
          created_at: rideDoc.data().created_at ? rideDoc.data().created_at.toDate() : null,
          completed_at: rideDoc.data().completed_at ? rideDoc.data().completed_at.toDate() : null
        };
        
        setRide(rideData);
        setError(null);
      } catch (err) {
        console.error('Error fetching ride details:', err);
        setError('Failed to load ride details');
      } finally {
        setLoading(false);
      }
    };

    fetchRideDetails();
  }, [ride_id]);

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
  const handlePayment = () => {
    // Make sure ride data is available
    if (!ride) return;
    
    // Mock UPI ID for the auto service
    const upiId = "9494733384@ybl";
    const amount = ride.price;
    const transactionNote = `Auto ride payment - ${ride.id}`;
    const merchantName = "VIT-AP Auto Service";
    
    setProcessingPayment(true);
    
    // Create UPI intent URL
    const upiUrl = `upi://pay?pa=${upiId}&pn=${encodeURIComponent(merchantName)}&tn=${encodeURIComponent(transactionNote)}&am=${amount}&cu=INR`;
    
    // Check if the device can handle UPI deep linking
    Linking.canOpenURL(upiUrl).then(supported => {
      if (supported) {
        // Open the UPI payment app
        Linking.openURL(upiUrl);
        
        // After returning from payment app, ask user if payment was successful
        setTimeout(() => {
          setProcessingPayment(false);
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
                onPress: () => updatePaymentStatus()
              }
            ]
          );
        }, 1000);
      } else {
        setProcessingPayment(false);
        // If UPI apps aren't available, show alternative payment instructions
        Alert.alert(
          "UPI Apps Not Found",
          "Please install a UPI payment app like Google Pay, PhonePe, or Paytm to make payments.",
          [{ text: "OK" }]
        );
      }
    }).catch(err => {
      setProcessingPayment(false);
      console.error('Error with payment linking:', err);
      Alert.alert("Payment Error", "Unable to process payment request.");
    });
  };
  
  // Update payment status in Firestore
  const updatePaymentStatus = async () => {
    try {
      // Update the status to "paid" in Firestore
      const rideRef = doc(db, 'auto_rides', ride_id);
      await updateDoc(rideRef, {
        status: 'paid'
      });
      
      // Update local state
      setRide({
        ...ride,
        status: 'paid'
      });
      
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

  // Handle contacting driver through call
  const handleCallManager = () => {
    // Mock driver phone number - in a real app, this would come from the ride data
    const ManagerPhone = "+917989781645"; // Example phone number
    
    const phoneUrl = `tel:${ManagerPhone}`;
    
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert("Phone Call Not Supported", "Your device doesn't support making phone calls.");
        }
      })
      .catch(err => {
        console.error('Error making phone call:', err);
        Alert.alert("Call Error", "Could not initiate phone call.");
      });
  };

  // Handle contacting driver through WhatsApp
  const handleMessageManager = () => {
    // Mock driver phone number - in a real app, this would come from the ride data
    const ManagerPhone = "917989781645"; // Example phone number (without + for WhatsApp)
    
    const message = `Hi, I've a ride coming up with VIT_AP AutoService ${ride_id.substring(0, 8)}`;
    const whatsappUrl = `whatsapp://send?phone=${ManagerPhone}&text=${encodeURIComponent(message)}`;
    
    Linking.canOpenURL(whatsappUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(whatsappUrl);
        } else {
          const webWhatsappUrl = `https://wa.me/${ManagerPhone}?text=${encodeURIComponent(message)}`;
          return Linking.openURL(webWhatsappUrl);
        }
      })
      .catch(err => {
        console.error('Error opening WhatsApp:', err);
        Alert.alert("WhatsApp Error", "Could not open WhatsApp.");
      });
  };

  // Share ride details
  const handleShareRide = async () => {
    try {
      const shareMessage = `I've booked an auto from ${ride.pickup.name || ride.pickup.address} to ${ride.destination.name || ride.destination.address} at ${formatDate(ride.created_at)}. The fare is ₹${ride.price}.`;
      
      await Linking.openURL(`sms:?body=${encodeURIComponent(shareMessage)}`);
    } catch (error) {
      console.error('Error sharing ride:', error);
      Alert.alert("Share Error", "Could not share ride details.");
    }
  };

  // Get status information
  const getStatusInfo = (status) => {
    switch(status) {
      case 'confirmed':
        return {
          icon: <AlertCircle size={20} color="#F59E0B" />,
          text: 'Payment Pending',
          color: '#F59E0B',
          bgColor: '#FEF3C7'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={20} color="#10B981" />,
          text: 'Completed',
          color: '#10B981',
          bgColor: '#D1FAE5'
        };
      case 'paid':
        return {
          icon: <CheckCircle size={20} color="#10B981" />,
          text: 'Paid',
          color: '#10B981',
          bgColor: '#D1FAE5'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle size={20} color="#EF4444" />,
          text: 'Cancelled',
          color: '#EF4444',
          bgColor: '#FEE2E2'
        };
      default:
        return {
          icon: <Clock size={20} color="#3B82F6" />,
          text: 'Processing',
          color: '#3B82F6',
          bgColor: '#DBEAFE'
        };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={styles.placeholder} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      ) : ride ? (
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: getStatusInfo(ride.status).bgColor }]}>
            {getStatusInfo(ride.status).icon}
            <Text style={[styles.statusText, { color: getStatusInfo(ride.status).color }]}>
              {getStatusInfo(ride.status).text}
            </Text>
          </View>
          
          {/* Ride Card */}
          <View style={styles.rideCard}>
            {/* Location Details */}
            <View style={styles.locationContainer}>
              <View style={styles.locationItem}>
                <View style={styles.locationIconContainer}>
                  <MapPin size={20} color="#3B82F6" />
                </View>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Pickup</Text>
                  <Text style={styles.locationText}>{ride.pickup.name || ride.pickup.address}</Text>
                </View>
              </View>
              
              <View style={styles.locationDivider} />
              
              <View style={styles.locationItem}>
                <View style={styles.locationIconContainer}>
                  <Navigation size={20} color="#3B82F6" />
                </View>
                <View style={styles.locationTextContainer}>
                  <Text style={styles.locationLabel}>Destination</Text>
                  <Text style={styles.locationText}>{ride.destination.name || ride.destination.address}</Text>
                </View>
              </View>
            </View>
            
            {/* Date and Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoItem}>
                <Calendar size={18} color="#64748B" style={styles.infoIcon} />
                <Text style={styles.infoText}>
                  {formatDate(ride.created_at)}
                </Text>
              </View>
            </View>
            
            {/* Driver Info */}
            <View style={styles.driverContainer}>
              <View style={styles.driverInfo}>
                <View style={styles.driverImageContainer}>
                  <Image
                    source={require('../../assets/driver-placeholder.png')}
                    style={styles.driverImage}
                    defaultSource={require('../../assets/driver-placeholder.png')}
                  />
                </View>
                <View style={styles.driverDetails}>
                  <Text style={styles.driverName}>Santhosh</Text>
                </View>
              </View>
              
              <View style={styles.contactButtons}>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={handleCallManager}
                >
                  <PhoneCall size={20} color="#3B82F6" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.contactButton}
                  onPress={handleMessageManager}
                >
                  <MessageSquare size={20} color="#3B82F6" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Price Info */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceLabel}>Total Fare</Text>
              <View style={styles.priceValueContainer}>
                <IndianRupee size={18} color="#0F172A" />
                <Text style={styles.priceValue}>{ride.price}</Text>
              </View>
            </View>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            {/* Payment Button - show only if status is 'confirmed' */}
            {ride.status === 'confirmed' && (
              <TouchableOpacity 
                style={styles.paymentButton}
                onPress={handlePayment}
                disabled={processingPayment}
              >
                {processingPayment ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <CreditCard size={20} color="#FFFFFF" style={styles.buttonIcon} />
                    <Text style={styles.paymentButtonText}>Pay Now</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            
            {/* Share Ride Button */}
            <TouchableOpacity 
              style={styles.shareButton}
              onPress={handleShareRide}
            >
              <Share2 size={20} color="#3B82F6" style={styles.buttonIcon} />
              <Text style={styles.shareButtonText}>Share Ride</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        <View style={styles.errorContainer}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={styles.errorText}>No ride data available</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Go Back</Text>
          </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  placeholder: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  statusText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 16,
  },
  locationContainer: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 8,
  },
  locationIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 15,
    color: '#0F172A',
    fontWeight: '500',
  },
  locationDivider: {
    height: 20,
    width: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#64748B',
  },
  driverContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  driverImageContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    overflow: 'hidden',
    marginRight: 12,
  },
  driverImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  driverDetails: {
    justifyContent: 'center',
  },
  driverName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
    marginBottom: 4,
  },
  driverVehicle: {
    fontSize: 14,
    color: '#64748B',
  },
  contactButtons: {
    flexDirection: 'row',
  },
  contactButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  priceLabel: {
    fontSize: 16,
    color: '#64748B',
  },
  priceValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priceValue: {
    marginLeft: 4,
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionButtonsContainer: {
    marginVertical: 16,
  },
  paymentButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonIcon: {
    marginRight: 8,
  },
  paymentButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  shareButton: {
    flexDirection: 'row',
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareButtonText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '500',
  },
});