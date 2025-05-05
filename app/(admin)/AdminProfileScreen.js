import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TextInput,
  ScrollView
} from 'react-native';
import {
  ArrowLeft,
  User,
  Search,
  Filter,
  LogOut,
  CheckCircle,
  AlertCircle,
  Clock,
  ChevronRight,
  Calendar,
  MapPin,
  Navigation
} from 'lucide-react-native';
import { signOut } from 'firebase/auth';
import { collection, query, getDocs, where, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { router } from 'expo-router';
import { AdminAuthWrapper } from './adminAuthCheck';
import { auth } from '../../firebase/Config';
import { db } from '../../firebase/Config';

function AdminProfileContent() {
  const [rides, setRides] = useState([]);
  const [filteredRides, setFilteredRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminInfo, setAdminInfo] = useState(null);

  // Fetch admin info
  useEffect(() => {
    const fetchAdminInfo = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          router.replace('/(admin)/login');
          return;
        }

        const adminDoc = await getDocs(query(
          collection(db, 'admins'),
          where('uid', '==', user.uid),
          limit(1)
        ));

        if (adminDoc.empty) {
          Alert.alert("Access Denied", "You do not have admin privileges.");
          router.replace('/(admin)/login');
          return;
        }

        setAdminInfo(adminDoc.docs[0].data());
      } catch (error) {
        console.error('Error fetching admin info:', error);
        Alert.alert("Error", "Failed to verify admin credentials.");
      }
    };

    fetchAdminInfo();
  }, []);

  // Fetch all rides
  useEffect(() => {
    fetchRides();
  }, []);

  // Filter rides based on search query and status filter
  useEffect(() => {
    filterRides();
  }, [rides, searchQuery, statusFilter]);

  const fetchRides = async () => {
    try {
      setLoading(true);
      
      // Create query based on timestamp (most recent first)
      const ridesQuery = query(
        collection(db, 'auto_rides'),
        orderBy('created_at', 'desc')
      );
      
      const ridesSnapshot = await getDocs(ridesQuery);
      
      const ridesData = ridesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at ? doc.data().created_at.toDate() : null,
        completed_at: doc.data().completed_at ? doc.data().completed_at.toDate() : null
      }));
      
      setRides(ridesData);
    } catch (error) {
      console.error('Error fetching rides:', error);
      Alert.alert("Error", "Failed to load ride bookings.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filterRides = () => {
    let filtered = [...rides];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(ride => ride.status === statusFilter);
    }
    
    // Apply search filter (search by pickup, destination, or student name)
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(ride => 
        (ride.pickup?.name?.toLowerCase().includes(query) || 
         ride.pickup?.address?.toLowerCase().includes(query) ||
         ride.destination?.name?.toLowerCase().includes(query) ||
         ride.destination?.address?.toLowerCase().includes(query) ||
         ride.student_name?.toLowerCase().includes(query) ||
         ride.student_id?.toLowerCase().includes(query))
      );
    }
    
    setFilteredRides(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/(auth)');
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert("Error", "Failed to sign out. Please try again.");
    }
  };

  // Handle marking a ride as completed
  const handleMarkCompleted = async (rideId) => {
    try {
      const rideRef = doc(db, 'auto_rides', rideId);
      
      // Update the ride status to 'completed' and add timestamp
      await updateDoc(rideRef, {
        status: 'completed',
        completed_at: new Date(),
        completed_by: auth.currentUser.uid,
        admin_name: adminInfo?.name || 'Admin'
      });
      
      // Update local state
      const updatedRides = rides.map(ride => {
        if (ride.id === rideId) {
          return {
            ...ride,
            status: 'completed',
            completed_at: new Date(),
            completed_by: auth.currentUser.uid,
            admin_name: adminInfo?.name || 'Admin'
          };
        }
        return ride;
      });
      
      setRides(updatedRides);
      
      Alert.alert("Success", "Ride marked as completed successfully.");
    } catch (error) {
      console.error('Error marking ride as completed:', error);
      Alert.alert("Error", "Failed to update ride status.");
    }
  };

  // Format date to readable string
  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    const options = { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    
    return date.toLocaleDateString('en-US', options);
  };

  // Get status badge info
  const getStatusInfo = (status) => {
    switch(status) {
      case 'confirmed':
        return {
          icon: <AlertCircle size={16} color="#F59E0B" />,
          text: 'Confirmed',
          color: '#F59E0B',
          bgColor: '#FEF3C7'
        };
      case 'completed':
        return {
          icon: <CheckCircle size={16} color="#10B981" />,
          text: 'Completed',
          color: '#10B981',
          bgColor: '#D1FAE5'
        };
      case 'paid':
        return {
          icon: <CheckCircle size={16} color="#10B981" />,
          text: 'Paid',
          color: '#10B981',
          bgColor: '#D1FAE5'
        };
      case 'cancelled':
        return {
          icon: <AlertCircle size={16} color="#EF4444" />,
          text: 'Cancelled',
          color: '#EF4444',
          bgColor: '#FEE2E2'
        };
      default:
        return {
          icon: <Clock size={16} color="#3B82F6" />,
          text: 'Processing',
          color: '#3B82F6',
          bgColor: '#DBEAFE'
        };
    }
  };

  // Render ride item
  const renderRideItem = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.rideCard}
        onPress={() => router.push('/(admin)/RideDetails')}
      >
        <View style={styles.rideHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            {statusInfo.icon}
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.text}
            </Text>
          </View>
          
          <Text style={styles.rideDate}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        
        <View style={styles.locationContainer}>
          <View style={styles.locationItem}>
            <MapPin size={16} color="#3B82F6" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.pickup?.name || item.pickup?.address || 'N/A'}
            </Text>
          </View>
          
          <View style={styles.locationItem}>
            <Navigation size={16} color="#3B82F6" style={styles.locationIcon} />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.destination?.name || item.destination?.address || 'N/A'}
            </Text>
          </View>
        </View>
        
        <View style={styles.rideFooter}>
          <View style={styles.studentInfo}>
            <User size={14} color="#64748B" style={styles.footerIcon} />
            <Text style={styles.studentName} numberOfLines={1}>
              {item.student_name || 'Anonymous'} {item.student_id ? `(${item.student_id})` : ''}
            </Text>
          </View>
          
          {/* Conditionally show the action button based on status */}
          {(item.status === 'confirmed' || item.status === 'paid') && (
            <TouchableOpacity 
              style={styles.completeButton}
              onPress={() => {
                Alert.alert(
                  "Mark as Completed",
                  "Have you arranged the auto and loaded students?",
                  [
                    {
                      text: "Cancel",
                      style: "cancel"
                    },
                    { 
                      text: "Yes, Complete", 
                      onPress: () => handleMarkCompleted(item.id)
                    }
                  ]
                );
              }}
            >
              <Text style={styles.completeButtonText}>Complete</Text>
            </TouchableOpacity>
          )}
          
          {(item.status !== 'confirmed' && item.status !== 'paid') && (
            <ChevronRight size={18} color="#94A3B8" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render filter tab
  const renderFilterTab = (name, value) => {
    const isActive = statusFilter === value;
    
    return (
      <TouchableOpacity 
        style={[styles.filterTab, isActive && styles.activeFilterTab]}
        onPress={() => setStatusFilter(value)}
      >
        <Text style={[styles.filterTabText, isActive && styles.activeFilterTabText]}>
          {name}
        </Text>
      </TouchableOpacity>
    );
  };

  // Empty list component
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <AlertCircle size={40} color="#94A3B8" />
      <Text style={styles.emptyText}>No rides found</Text>
      <Text style={styles.emptySubtext}>
        {searchQuery || statusFilter !== 'all' 
          ? 'Try changing your filters' 
          : 'Auto bookings will appear here'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Admin Dashboard</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleSignOut}
        >
          <LogOut size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>
      
      {/* Admin Info Card */}
      {adminInfo && (
        <View style={styles.adminCard}>
          <View style={styles.adminIconContainer}>
            <User size={24} color="#3B82F6" />
          </View>
          <View style={styles.adminInfo}>
            <Text style={styles.adminName}>{adminInfo.name}</Text>
            <Text style={styles.adminRole}>{adminInfo.role || 'Auto Manager'}</Text>
          </View>
        </View>
      )}
      
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by location or student"
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94A3B8"
          />
        </View>
      </View>
      
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {renderFilterTab('All', 'all')}
          {renderFilterTab('Confirmed', 'confirmed')}
          {renderFilterTab('Paid', 'paid')}
          {renderFilterTab('Completed', 'completed')}
          {renderFilterTab('Cancelled', 'cancelled')}
        </ScrollView>
      </View>
      
      {/* Ride List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading rides...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRides}
          renderItem={renderRideItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.rideList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#3B82F6"]}
            />
          }
          ListEmptyComponent={renderEmptyList}
        />
      )}
    </View>
  );
}

// Wrap the component with AdminAuthWrapper for authentication
export default function AdminProfileScreen() {
  return (
    <AdminAuthWrapper>
      <AdminProfileContent />
    </AdminAuthWrapper>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  adminIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 4,
  },
  adminRole: {
    fontSize: 14,
    color: '#64748B',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 15,
    color: '#0F172A',
  },
  filterContainer: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterScrollContent: {
    paddingHorizontal: 12,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginHorizontal: 4,
    backgroundColor: '#F1F5F9',
  },
  activeFilterTab: {
    backgroundColor: '#EFF6FF',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeFilterTabText: {
    color: '#3B82F6',
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
  rideList: {
    padding: 16,
  },
  rideCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: '500',
  },
  rideDate: {
    fontSize: 12,
    color: '#64748B',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationIcon: {
    marginRight: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  footerIcon: {
    marginRight: 6,
  },
  studentName: {
    fontSize: 13,
    color: '#64748B',
  },
  completeButton: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  completeButtonText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
  },
  emptySubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});