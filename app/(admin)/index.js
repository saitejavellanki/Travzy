import { Redirect } from 'expo-router';

export default function AdminIndex() {
  // Redirect to the admin dashboard when accessing /admin directly
  return <Redirect href="/admin/dashboard" />;
}