import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, RefreshControl, Modal, Image } from 'react-native';
import { Edit2, Trash2, Users, Clock, MapPin, Check, X, DollarSign } from 'lucide-react-native';
import { router } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, orderBy, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { app } from '../../firebase/Config'; // Import the Firebase app from your config file
import QRCode from 'react-native-qrcode-svg'; // You'll need to install this package

// Initialize Firebase Auth and Firestore
const auth = getAuth(app);
const db = getFirestore(app);

// Define Ride type for TypeScript
interface Ride {
  id: string;
  driver_id: string;
  pickup_location: string;
  dropoff_location: string;
  departure_time: string;
  available_seats: number;
  price: number;
  status: 'active' | 'completed' | 'cancelled';
  vehicle_name?: string;
}

// Define Passenger Request type
interface PassengerRequest {
  id: string;
  ride_id: string;
  passenger_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'paid';
  seats_requested: number;
  passenger_name?: string;
  passenger_phone?: string;
}

export default function RidesScreen(): JSX.Element {
  const [userRides, setUserRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [passengerRequests, setPassengerRequests] = useState<Record<string, PassengerRequest[]>>({});
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState<boolean>(false);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerRequest | null>(null);

  useEffect(() => {
    getUserSession();
  }, []);

  const getUserSession = async (): Promise<void> => {
    try {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          setUserId(user.uid);
          fetchUserRides(user.uid);
        } else {
          setLoading(false);
          Alert.alert('Not logged in', 'Please login to view your rides');
        }
      });

      // Clean up subscription
      return () => unsubscribe();
    } catch (error) {
      console.error('Error getting user session:', error);
      setLoading(false);
    }
  };

  const fetchUserRides = async (uid: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Create query for rides collection
      const ridesQuery = query(
        collection(db, 'rides'),
        where('driver_id', '==', uid),
        orderBy('departure_time', 'asc')
      );
      
      // Get documents
      const querySnapshot = await getDocs(ridesQuery);
      
      // Process results
      const rides: Ride[] = [];
      querySnapshot.forEach((doc) => {
        rides.push({
          id: doc.id,
          ...doc.data()
        } as Ride);
      });
      
      setUserRides(rides);
      
      // Fetch passenger requests for each ride
      const requestsMap: Record<string, PassengerRequest[]> = {};
      await Promise.all(rides.map(async (ride) => {
        const requests = await fetchPassengerRequests(ride.id);
        requestsMap[ride.id] = requests;
      }));
      
      setPassengerRequests(requestsMap);
    } catch (error) {
      console.error('Error fetching user rides:', error);
      Alert.alert('Error', 'Failed to load your rides');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchPassengerRequests = async (rideId: string): Promise<PassengerRequest[]> => {
    try {
      const requestsQuery = query(
        collection(db, 'ride_requests'),
        where('ride_id', '==', rideId)
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      
      if (requestsSnapshot.empty) {
        return [];
      }
      
      const requests: PassengerRequest[] = [];
      
      for (const doc of requestsSnapshot.docs) {
        const requestData = doc.data() as PassengerRequest;
        
        // Fetch passenger profile to get name and phone
        if (requestData.passenger_id) {
          try {
            const profileQuery = query(
              collection(db, 'profiles'),
              where('user_id', '==', requestData.passenger_id)
            );
            
            const profileSnapshot = await getDocs(profileQuery);
            
            if (!profileSnapshot.empty) {
              const profileData = profileSnapshot.docs[0].data();
              requestData.passenger_name = profileData.fullName || 'Unknown';
              requestData.passenger_phone = profileData.phoneNumber || 'N/A';
            }
          } catch (err) {
            console.error('Error fetching passenger profile:', err);
          }
        }
        
        requests.push({
          id: doc.id,
          ...requestData
        });
      }
      
      return requests;
    } catch (error) {
      console.error('Error fetching passenger requests:', error);
      return [];
    }
  };

  const onRefresh = (): void => {
    setRefreshing(true);
    if (userId) {
      fetchUserRides(userId);
    } else {
      setRefreshing(false);
    }
  };

  const handleUpdateSeats = (ride: Ride): void => {
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
          onPress: (seats) => updateRideSeats(ride.id, parseInt(seats || '0')),
        },
      ],
      'plain-text',
      ride.available_seats.toString()
    );
  };

  const updateRideSeats = async (rideId: string, seats: number): Promise<void> => {
    try {
      if (isNaN(seats) || seats < 0) {
        Alert.alert('Invalid input', 'Please enter a valid number of seats');
        return;
      }

      setLoading(true);
      
      // Update document in Firestore
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        available_seats: seats
      });
      
      Alert.alert('Success', 'Seats updated successfully');
      if (userId) {
        fetchUserRides(userId);
      }
    } catch (error) {
      console.error('Error updating seats:', error);
      Alert.alert('Error', 'Failed to update seats');
      setLoading(false);
    }
  };

  const handleCancelRide = (rideId: string): void => {
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

  const cancelRide = async (rideId: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Update document status in Firestore
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'cancelled'
      });
      
      // Also update any associated ride requests to rejected
      const requests = passengerRequests[rideId] || [];
      await Promise.all(requests.map(async (request) => {
        const requestRef = doc(db, 'ride_requests', request.id);
        await updateDoc(requestRef, {
          status: 'rejected'
        });
      }));
      
      Alert.alert('Success', 'Ride cancelled successfully');
      if (userId) {
        fetchUserRides(userId);
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      Alert.alert('Error', 'Failed to cancel ride');
      setLoading(false);
    }
  };

  const handleCompleteRide = (ride: Ride): void => {
    setSelectedRide(ride);
    
    // Get accepted requests for this ride
    const requests = (passengerRequests[ride.id] || [])
      .filter(req => req.status === 'accepted');
    
    if (requests.length === 0) {
      Alert.alert(
        'Complete Ride',
        'No passengers have been accepted for this ride. Do you still want to mark it as completed?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Complete Ride', 
            onPress: () => completeRide(ride.id)
          }
        ]
      );
    } else {
      Alert.alert(
        'Complete Ride',
        `You have ${requests.length} accepted passenger(s). Mark this ride as completed?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Complete Ride', 
            onPress: () => completeRide(ride.id)
          }
        ]
      );
    }
  };

  const completeRide = async (rideId: string): Promise<void> => {
    try {
      setLoading(true);
      
      // Update ride status
      const rideRef = doc(db, 'rides', rideId);
      await updateDoc(rideRef, {
        status: 'completed'
      });
      
      // Update all accepted requests to completed status
      const requests = (passengerRequests[rideId] || [])
        .filter(req => req.status === 'accepted');
      
      await Promise.all(requests.map(async (request) => {
        const requestRef = doc(db, 'ride_requests', request.id);
        await updateDoc(requestRef, {
          status: 'completed'
        });
      }));
      
      Alert.alert('Success', 'Ride marked as completed successfully');
      if (userId) {
        fetchUserRides(userId);
      }
    } catch (error) {
      console.error('Error completing ride:', error);
      Alert.alert('Error', 'Failed to complete ride');
      setLoading(false);
    }
  };

  const generatePaymentQR = (ride: Ride, passenger: PassengerRequest) => {
    setSelectedRide(ride);
    setSelectedPassenger(passenger);
    setQrModalVisible(true);
  };

  const markAsPaid = async (passengerId: string, rideId: string, requestId: string) => {
    try {
      // Update the ride request status to paid
      const requestRef = doc(db, 'ride_requests', requestId);
      await updateDoc(requestRef, {
        status: 'paid'
      });
      
      Alert.alert('Success', 'Passenger marked as paid');
      setQrModalVisible(false);
      
      if (userId) {
        fetchUserRides(userId);
      }
    } catch (error) {
      console.error('Error marking as paid:', error);
      Alert.alert('Error', 'Failed to update payment status');
    }
  };

  const createPaymentData = (ride: Ride, passenger: PassengerRequest) => {
    const totalAmount = ride.price * passenger.seats_requested;
    
    // Create payment data object
    const paymentData = {
      rideId: ride.id,
      passengerId: passenger.passenger_id,
      requestId: passenger.id,
      amount: totalAmount,
      driverId: ride.driver_id,
      timestamp: new Date().toISOString(),
      pickup: ride.pickup_location,
      dropoff: ride.dropoff_location
    };
    
    return JSON.stringify(paymentData);
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
              onPress={() => router.push('/components/offer-ride')}
            >
              <Text style={styles.offerButtonText}>Offer a Ride</Text>
            </TouchableOpacity>
          </View>
        ) : (
          userRides.map((ride) => (
            <View key={ride.id} style={styles.rideCard}>
              <View style={styles.cardHeader}>
                <Text style={[
                  styles.rideStatus,
                  ride.status === 'active' ? styles.statusActive :
                  ride.status === 'completed' ? styles.statusCompleted :
                  styles.statusCancelled
                ]}>
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
              
              {/* Show passenger requests for active or completed rides */}
              {(ride.status === 'active' || ride.status === 'completed') && 
                passengerRequests[ride.id] && 
                passengerRequests[ride.id].length > 0 && (
                <View style={styles.passengersSection}>
                  <Text style={styles.passengersSectionTitle}>Passengers</Text>
                  
                  {passengerRequests[ride.id]
                    .filter(req => ['accepted', 'completed', 'paid'].includes(req.status))
                    .map(request => (
                    <View key={request.id} style={styles.passengerItem}>
                      <View style={styles.passengerInfo}>
                        <Text style={styles.passengerName}>{request.passenger_name}</Text>
                        <Text style={styles.passengerSeats}>{request.seats_requested} seat(s)</Text>
                        <Text style={styles.passengerPhone}>{request.passenger_phone}</Text>
                      </View>
                      
                      <View style={styles.passengerActions}>
                        {ride.status === 'completed' && request.status !== 'paid' && (
                          <TouchableOpacity 
                            style={styles.qrButton}
                            onPress={() => generatePaymentQR(ride, request)}
                          >
                            <DollarSign size={16} color="#3B82F6" />
                            <Text style={styles.qrButtonText}>Payment QR</Text>
                          </TouchableOpacity>
                        )}
                        
                        {request.status === 'paid' && (
                          <View style={styles.paidBadge}>
                            <Check size={16} color="#fff" />
                            <Text style={styles.paidBadgeText}>Paid</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
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
                    style={[styles.actionButton, styles.completeButton]}
                    onPress={() => handleCompleteRide(ride)}
                  >
                    <Check size={16} color="#10B981" />
                    <Text style={styles.completeText}>Complete</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => handleCancelRide(ride.id)}
                  >
                    <Trash2 size={16} color="#EF4444" />
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
      
      {/* Payment QR Code Modal */}
      <Modal
        visible={qrModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContent}>
            <Text style={styles.qrModalTitle}>Payment QR Code</Text>
            
            {selectedRide && selectedPassenger && (
              <>
                <View style={styles.qrInfo}>
                  <Text style={styles.qrPassengerName}>Passenger: {selectedPassenger.passenger_name}</Text>
                  <Text style={styles.qrAmount}>
                    Amount: ${selectedRide.price * selectedPassenger.seats_requested}
                  </Text>
                  <Text style={styles.qrSeats}>{selectedPassenger.seats_requested} seat(s)</Text>
                </View>
                
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={createPaymentData(selectedRide, selectedPassenger)}
                    size={200}
                    color="#1E293B"
                    backgroundColor="#fff"
                  />
                </View>
                
                <Text style={styles.qrInstructions}>
                  Ask the passenger to scan this QR code to complete payment.
                </Text>
                
                <View style={styles.qrButtons}>
                  <TouchableOpacity
                    style={styles.qrCloseButton}
                    onPress={() => setQrModalVisible(false)}
                  >
                    <Text style={styles.qrCloseButtonText}>Close</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.markPaidButton}
                    onPress={() => markAsPaid(
                      selectedPassenger.passenger_id,
                      selectedRide.id,
                      selectedPassenger.id
                    )}
                  >
                    <Text style={styles.markPaidButtonText}>Mark as Paid</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  statusActive: {
    color: '#16A34A',
  },
  statusCompleted: {
    color: '#3B82F6',
  },
  statusCancelled: {
    color: '#DC2626',
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
  passengersSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  passengersSectionTitle: {
    fontSize: 16,
    color: '#1E293B',
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  passengerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  passengerInfo: {
    flex: 1,
  },
  passengerName: {
    fontSize: 14,
    color: '#1E293B',
    fontFamily: 'Inter-Medium',
  },
  passengerSeats: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  passengerPhone: {
    fontSize: 13,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  passengerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qrButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  qrButtonText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  paidBadgeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#fff',
    fontFamily: 'Inter-Medium',
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
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    flex: 1,
    marginRight: 8,
  },
  actionText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
  completeButton: {
    backgroundColor: '#DCFCE7',
    marginRight: 8,
  },
  completeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#10B981',
    fontFamily: 'Inter-Medium',
  },
  cancelButton: {
    backgroundColor: '#FEE2E2',
    marginRight: 0,
  },
  cancelText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#EF4444',
    fontFamily: 'Inter-Medium',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  qrModalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1E293B',
    marginBottom: 16,
  },
  qrInfo: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrPassengerName: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    marginBottom: 4,
  },
  qrAmount: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  qrSeats: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  qrCodeContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  qrInstructions: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  qrButtons: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  qrCloseButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: 'center',
  },
  qrCloseButtonText: {
    color: '#64748B',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  markPaidButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#10B981',
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  markPaidButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});