import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/Config'; // Adjust this import path to match your Firebase config location

export default function BookingsScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const bookingsRef = collection(db, 'bookings');
      const q = query(bookingsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const bookingsData = [];
      querySnapshot.forEach((doc) => {
        bookingsData.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      setBookings(bookingsData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.bookingCard}>
      <View style={styles.bookingHeader}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color="#64748B" />
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={[
          styles.statusBadge, 
          item.status === 'Upcoming' ? styles.upcomingBadge : styles.completedBadge
        ]}>
          <Text style={[
            styles.statusText,
            item.status === 'Upcoming' ? styles.upcomingText : styles.completedText
          ]}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.locationContainer}>
        <View style={styles.locationItem}>
          <View style={styles.locationDot} />
          <Text style={styles.locationText}>{item.pickup}</Text>
        </View>
        <View style={styles.locationLine} />
        <View style={styles.locationItem}>
          <View style={[styles.locationDot, styles.destinationDot]} />
          <Text style={styles.locationText}>{item.destination}</Text>
        </View>
      </View>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.priceText}>{item.price}</Text>
        <TouchableOpacity style={styles.detailsButton}>
          <Text style={styles.detailsButtonText}>View Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchBookings}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (bookings.length === 0) {
      return (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No bookings found</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={bookings}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        refreshing={loading}
        onRefresh={fetchBookings}
      />
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      {renderContent()}
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
  listContainer: {
    padding: 16,
  },
  bookingCard: {
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
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#64748B',
    fontFamily: 'Inter-Medium',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingBadge: {
    backgroundColor: '#DBEAFE',
  },
  completedBadge: {
    backgroundColor: '#DCFCE7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  upcomingText: {
    color: '#2563EB',
  },
  completedText: {
    color: '#16A34A',
  },
  locationContainer: {
    marginBottom: 16,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
  },
  locationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginRight: 12,
  },
  destinationDot: {
    backgroundColor: '#EF4444',
  },
  locationText: {
    fontSize: 14,
    color: '#0F172A',
    fontFamily: 'Inter-Regular',
  },
  locationLine: {
    width: 1,
    height: 20,
    backgroundColor: '#E2E8F0',
    marginLeft: 5,
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  priceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0F172A',
    fontFamily: 'Inter-Bold',
  },
  detailsButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  detailsButtonText: {
    fontSize: 14,
    color: '#3B82F6',
    fontFamily: 'Inter-Medium',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    fontFamily: 'Inter-Regular',
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#3B82F6',
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Inter-Medium',
  },
});