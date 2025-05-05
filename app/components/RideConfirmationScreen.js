import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Check, MapPin, Navigation, Phone, ArrowLeft, Calendar, Clock } from 'lucide-react-native';
import { auth, db } from '../../firebase/Config';
import { doc, getDoc } from 'firebase/firestore';
import * as Linking from 'expo-linking';
export default function RideConfirmationScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);
  const [rideDetails, setRideDetails] = useState(null);
  const [error, setError] = useState(null);
  const managerNotified = params.manager_notified === 'true';
  

  useEffect(() => {
    const fetchRideDetails = async () => {
      try {
        setLoading(true);
        
        // Get the ride document from Firestore
        const rideDoc = await getDoc(doc(db, 'auto_rides', params.ride_id));
        
        if (!rideDoc.exists()) {
          throw new Error('Ride not found');
        }
        
        // Set the ride details
        setRideDetails({
          id: rideDoc.id,
          ...rideDoc.data(),
          // Add manager details
          manager: {
            name: 'Santhosh',
            contact: '7989781645'
          },
          // Calculate pickup time (10 minutes from ride creation)
          pickupTime: new Date(rideDoc.data().created_at.toDate().getTime() + 10 * 60000)
        });
        
      } catch (err) {
        console.error('Error fetching ride details:', err);
        setError('Failed to load ride details');
      } finally {
        setLoading(false);
      }
    };

    if (params.ride_id) {
      fetchRideDetails();
    } else {
      setError('No ride ID provided');
      setLoading(false);
    }
  }, [params.ride_id]);

  const formatDate = (date) => {
    if (!date) return '';
    
    const options = { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric'
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  const formatTime = (date) => {
    if (!date) return '';
    
    const options = { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleTimeString('en-US', options);
  };

  const handleGoToHome = () => {
    router.replace('/(auto)/');
  };

  const handleCallManager = () => {
    const phoneNumber = rideDetails?.manager?.contact;
    
    if (!phoneNumber) {
      Alert.alert('Error', 'Phone number not available');
      return;
    }
    
    // Open phone dialer with the manager's number
    const phoneUrl = `tel:${phoneNumber}`;
    
    Linking.canOpenURL(phoneUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          Alert.alert('Error', 'Phone dialer is not available');
        }
      })
      .catch((err) => {
        console.error('An error occurred', err);
        Alert.alert('Error', 'Could not open phone dialer');
      });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.goHomeButton} onPress={handleGoToHome}>
            <Text style={styles.goHomeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleGoToHome}>
            <ArrowLeft size={24} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ride Confirmed</Text>
        </View>

        <ScrollView 
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.successContainer}>
            <View style={styles.checkCircle}>
              <Check size={40} color="#10B981" />
            </View>
            <Text style={styles.successTitle}>Ride Confirmed!</Text>
            <Text style={styles.successMessage}>Your auto is on the way</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Ride Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ride ID</Text>
              <Text style={styles.infoValue}>{params.ride_id.substring(0, 8).toUpperCase()}</Text>
            </View>
            
            <View style={styles.locationInfo}>
              <View style={styles.locationIconContainer}>
                <MapPin size={20} color="#3B82F6" />
                <View style={styles.locationConnector}></View>
                <Navigation size={20} color="#3B82F6" />
              </View>
              
              <View style={styles.locationsTextContainer}>
                <View style={styles.locationTextGroup}>
                  <Text style={styles.locationLabel}>Pick-up</Text>
                  <Text style={styles.locationValue}>
                    {rideDetails?.pickup?.name === 'VIT-AP University' ? 'Main Gate, VIT-AP' : rideDetails?.pickup?.name}
                  </Text>
                </View>
                
                <View style={styles.locationTextGroup}>
                  <Text style={styles.locationLabel}>Destination</Text>
                  <Text style={styles.locationValue}>{rideDetails?.destination?.name}</Text>
                </View>
              </View>
            </View>
            
            <View style={styles.timeInfo}>
              <View style={styles.timeRow}>
                <Calendar size={16} color="#64748B" />
                <Text style={styles.timeText}>{formatDate(rideDetails?.pickupTime)}</Text>
              </View>
              <View style={styles.timeRow}>
                <Clock size={16} color="#64748B" />
                <Text style={styles.timeText}>{formatTime(rideDetails?.pickupTime)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.notificationContainer}>
  {managerNotified ? (
    <Text style={styles.notificationSuccess}>
      The manager has been notified and will arrange an auto for you shortly.
    </Text>
  ) : (
    <Text style={styles.notificationWarning}>
      We couldn't notify the manager automatically. Please contact them directly.
    </Text>
  )}
</View>

          <View style={styles.managerCard}>
            <Text style={styles.cardTitle}>Manager Details</Text>
            
            <View style={styles.managerInfo}>
              <View style={styles.managerAvatarContainer}>
                <Image 
                  source={{uri: 'https://randomuser.me/api/portraits/men/32.jpg'}} 
                  style={styles.managerAvatar} 
                />
              </View>
              
              <View style={styles.managerDetails}>
                <Text style={styles.managerName}>{rideDetails?.manager?.name}</Text>
                <Text style={styles.managerRole}>Ride Manager</Text>
              </View>
              
              <TouchableOpacity style={styles.callButton} onPress={handleCallManager}>
                <Phone size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>We'll notify you when your auto is about to arrive</Text>
          </View>
          
          {/* Add padding at the bottom for the fixed button */}
          <View style={styles.bottomPadding} />
        </ScrollView>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.homeButton} onPress={handleGoToHome}>
            <Text style={styles.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 60,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },
  successContainer: {
    alignItems: 'center',
    marginVertical: 24,
  },
  checkCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10B981',
    marginBottom: 8,
    fontFamily: 'Inter-Bold',
  },
  successMessage: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  infoCard: {
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
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 16,
    fontFamily: 'Inter-SemiBold',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  locationInfo: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  locationIconContainer: {
    alignItems: 'center',
    marginRight: 12,
  },
  locationConnector: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  locationsTextContainer: {
    flex: 1,
  },
  locationTextGroup: {
    marginBottom: 16,
  },
  locationLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
    fontFamily: 'Inter-Regular',
  },
  locationValue: {
    fontSize: 16,
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  timeInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    padding: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter-Medium',
  },
  managerCard: {
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
  managerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  managerAvatarContainer: {
    marginRight: 16,
  },
  managerAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  managerDetails: {
    flex: 1,
  },
  managerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
    fontFamily: 'Inter-SemiBold',
  },
  managerRole: {
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  notificationContainer: {
    padding: 16,
    marginVertical: 16,
    borderRadius: 8,
    backgroundColor: '#F0F9FF',
    borderLeftWidth: 4,
  },
  notificationSuccess: {
    color: '#0369A1',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  notificationWarning: {
    color: '#B45309',
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  messageText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontFamily: 'Inter-Regular',
  },
  bottomPadding: {
    height: 80, // Ensure enough space for the fixed button
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  homeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  homeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
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
    backgroundColor: '#F8FAFC',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'Inter-Regular',
  },
  goHomeButton: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  goHomeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Inter-SemiBold',
  },
});