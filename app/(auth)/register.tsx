import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ActivityIndicator, Alert,ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { UserPlus } from 'lucide-react-native';
import { signUp } from '@/lib/auth';

export default function RegisterScreen() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async () => {
    // Basic validation
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }
    
    if (!email.trim()) {
      setError('Please enter your email');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    // Validate phone number format - only allow digits
    if (!/^\d+$/.test(phoneNumber)) {
      setError('Phone number must contain only digits');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log("Starting signup process with:", { email, name, phoneNumber });
      
      // Pass phone number as an additional parameter to the signUp function
      const result = await signUp({
        email, 
        password, 
        fullName: name, 
        phoneNumber: phoneNumber
      });
      
      console.log("Signup result:", result);
      
      // Check the result to see if it was successful
      if (result && result.user) {
        setSuccess(true);
        Alert.alert(
          "Account Created Successfully!",
          "Please check your email for a confirmation link to verify your account.",
          [{ text: "OK", onPress: () => router.push('/login') }]
        );
      } else {
        // If we don't have a result.user but also no error was thrown
        setError('Account created but verification is required. Please check your email.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
     <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.container}>
        <View style={styles.header}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&auto=format&fit=crop&q=80' }}
          style={styles.headerImage}
        />
        <View style={styles.overlay} />
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Join TravZy</Text>
        <Text style={styles.subtitle}>Create your account</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              Account created! Please check your email for verification instructions.
            </Text>
          </View>
        )}
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          editable={!loading && !success}
        />
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          editable={!loading && !success}
        />
        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          editable={!loading && !success}
        />
          <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading && !success}
         />
        <TouchableOpacity 
          style={[
            styles.button, 
            (loading || success) && styles.buttonDisabled
          ]}
          onPress={handleSignUp}
          disabled={loading || success}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <UserPlus color="white" size={20} style={styles.buttonIcon} />
              <Text style={styles.buttonText}>
                {success ? 'Account Created' : 'Create Account'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Link href="/login" asChild>
          <TouchableOpacity style={styles.linkButton}>
            <Text style={styles.linkText}>
              {success 
                ? 'Go to Sign In'
                : 'Already have an account? Sign in'}
            </Text>
          </TouchableOpacity>
        </Link>
      </View>
    </View>
    </ScrollView>
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
  backButton: {
    position: 'absolute',
    top: 48,
    left: 24,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
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
  successContainer: {
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  successText: {
    color: '#166534',
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
});