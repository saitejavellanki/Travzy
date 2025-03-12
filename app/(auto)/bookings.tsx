import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Calendar, Clock, MapPin } from 'lucide-react-native';

const bookingsData = [
  {
    id: '1',
    date: 'Today, 2:30 PM',
    pickup: '123 Main Street',
    destination: 'City Mall',
    status: 'Upcoming',
    price: '₹120',
  },
  {
    id: '2',
    date: 'Yesterday, 11:15 AM',
    pickup: 'Office Park',
    destination: 'Airport Terminal 2',
    status: 'Completed',
    price: '₹350',
  },
  {
    id: '3',
    date: 'Mar 11, 2025, 9:00 AM',
    pickup: 'Home',
    destination: 'Railway Station',
    status: 'Completed',
    price: '₹180',
  },
  {
    id: '4',
    date: 'Mar 08, 2025, 6:45 PM',
    pickup: 'Restaurant',
    destination: 'Home',
    status: 'Completed',
    price: '₹150',
  },
];

export default function BookingsScreen() {
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <FlatList
        data={bookingsData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
      />
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
});