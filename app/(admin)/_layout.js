import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right'
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="login" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="AdminProfileScreen" />
      <Stack.Screen name="AdminLoginScreen" />
      <Stack.Screen name="RideDetails" />
    </Stack>
  );
}