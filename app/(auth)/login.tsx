import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { LogIn } from 'lucide-react-native';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User, UserCredential, AuthError } from 'firebase/auth';
import { app } from '../../firebase/Config'; // Import the Firebase app from your config file

// Initialize Firebase Auth
const auth = getAuth(app);

// These functions replace the Supabase auth methods
const signIn = async (email: string, password: string): Promise<User> => {
  try {
    const userCredential: UserCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: unknown) {
    console.error("Firebase sign-in error:", error);
    
    // Providing typeguard to narrow down the error type
    const authError = error as AuthError;

    // Provide user-friendly error messages
    if (authError.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    } else if (authError.code === 'auth/user-not-found') {
      throw new Error('No account found with this email');
    } else if (authError.code === 'auth/wrong-password') {
      throw new Error('Incorrect password');
    } else if (authError.code === 'auth/too-many-requests') {
      throw new Error('Too many failed login attempts. Please try again later');
    } else {
      throw new Error('Login failed. Please check your credentials and try again');
    }
  }
};

const getCurrentUser = (): Promise<User | null> => {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, 
      (user) => {
        unsubscribe(); // Stop listening after first response
        resolve(user);
      },
      (error) => {
        unsubscribe();
        reject(error);
      }
    );
  });
};

export default function LoginScreen(): JSX.Element {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in
  useEffect(() => {
    const checkCurrentUser = async (): Promise<void> => {
      try {
        setLoading(true);
        const user = await getCurrentUser();
        if (user) {
          // User is already logged in, redirect to home
          console.log("User already logged in:", user);
          router.replace('/mode_selection'); // Navigate to mode selection.
        }
      } catch (err) {
        console.error("Error checking current user:", err);
      } finally {
        setLoading(false);
      }
    };
    
    checkCurrentUser();
  }, []);

  const handleSignIn = async (): Promise<void> => {
    // Basic validation
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Attempting to sign in with:", email);
      const userData = await signIn(email, password);
      console.log("Sign in successful:", userData);
      
      // If we get here, sign in was successful
      Alert.alert(
        "Login Successful",
        "Welcome back to TravZy!",
        [{ 
          text: "Continue", 
          onPress: () => {
            // Navigate to the main app screen
            router.replace('/mode_selection'); // or your main screen path
          }
        }]
      );
    } catch (err: unknown) {
      console.error("Login error:", err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80' }}
          style={styles.headerImage}
        />
        <View style={styles.overlay} />
        <Text style={styles.title}>TravZy</Text>
        <Text style={styles.subtitle}>Travel with Ease!!</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />

        <TouchableOpacity 
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <LogIn color="white" size={20} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>Sign In</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.forgotPasswordButton}
          onPress={() => router.push('/forgot-password')}
        >
          <Text style={styles.forgotPasswordText}>Forgot password?</Text>
        </TouchableOpacity>

        <Link href="/register" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </Link>
        <View style={styles.adminLinkContainer}>
           <Text style={styles.adminLinkText}>Are you an administrator?</Text>
            <TouchableOpacity onPress={() => router.push('/(admin)/login')}>
             <Text style={styles.adminLink}>Admin Login</Text>
          </TouchableOpacity>
        </View>
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    height: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 32,
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  form: {
    flex: 1,
    padding: 24,
    marginTop: -24,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontFamily: 'Inter-Medium',
    fontSize: 14,
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginBottom: 16,
    backgroundColor: '#F8FAFC',
  },
  button: {
    height: 52,
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#3B82F6',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  forgotPasswordButton: {
    marginTop: 12,
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: '#64748B',
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  adminLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  adminLinkText: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  adminLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
  },
});