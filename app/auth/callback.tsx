import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase/client';

export default function AuthCallback() {
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Extract token from URL params
        const { access_token, refresh_token } = params;

        if (access_token && refresh_token) {
          // Set the session with the tokens from the email link
          const { error } = await supabase.auth.setSession({
            access_token: access_token as string,
            refresh_token: refresh_token as string,
          });

          if (error) {
            console.error('Error setting session:', error);
            router.replace('/');
            return;
          }

          // Successfully authenticated - redirect to dashboard
          router.replace('/(tabs)');
        } else {
          // No tokens found, redirect to home
          router.replace('/');
        }
      } catch (error) {
        console.error('Callback error:', error);
        router.replace('/');
      }
    };

    handleCallback();
  }, [params]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#192B47" />
      <Text style={styles.text}>Verifying your email...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
  },
});
