import { useEffect } from 'react';
import { router } from 'expo-router';
import { View, StyleSheet, Image } from 'react-native';
import { useAuth } from '@/contexts/auth-context';

export default function Index() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Auth loading is done, route based on auth state
      if (user) {
        // User is authenticated, go to main app
        router.replace('/(tabs)');
      } else {
        // User is not authenticated, show onboarding first
        router.replace('/onboarding');
      }
    }
  }, [user, loading]);

  // Show splash screen while checking auth
  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/logos/FounderGroundworksTransparentWhite.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#192B47',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 280,
    height: 200,
  },
});
