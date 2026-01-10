import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { useFonts } from 'expo-font';
import 'react-native-reanimated';
import "../global.css";

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider, useAuth } from '@/contexts/auth-context';
import { ThemeProvider } from '@/contexts/theme-context';
import { checkAndUnlockIfEligible } from '@/lib/lesson-unlocks';
import { setupPushNotifications, configureAndroidChannel } from '@/lib/push-notifications';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  initialRouteName: 'index',
};

/**
 * Component to handle app initialization that requires auth context
 */
function AppInitializer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    // Configure Android notification channel
    configureAndroidChannel();
  }, []);

  useEffect(() => {
    if (user) {
      // Setup push notifications when user is authenticated
      setupPushNotifications(user.id);

      // Check for daily unlock eligibility
      checkAndUnlockIfEligible(user.id);
    }
  }, [user]);

  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'Playfair-Regular': require('../assets/fonts/Playfair/Playfair_144pt-Regular.ttf'),
    'Playfair-SemiBold': require('../assets/fonts/Playfair/Playfair_144pt-SemiBold.ttf'),
    'Playfair-Bold': require('../assets/fonts/Playfair/Playfair_144pt-Bold.ttf'),
    'Playfair-Italic': require('../assets/fonts/Playfair/Playfair_144pt-Italic.ttf'),
    'HostGrotesk-Regular': require('../assets/fonts/Host_Grotesk/HostGrotesk-Regular.ttf'),
    'HostGrotesk-Medium': require('../assets/fonts/Host_Grotesk/HostGrotesk-Medium.ttf'),
    'HostGrotesk-SemiBold': require('../assets/fonts/Host_Grotesk/HostGrotesk-SemiBold.ttf'),
    'HostGrotesk-Bold': require('../assets/fonts/Host_Grotesk/HostGrotesk-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInitializer>
          <NavigationThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="index" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="login" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="test-intro" options={{ headerShown: false }} />
              <Stack.Screen name="test/[questionId]" options={{ headerShown: false }} />
              <Stack.Screen name="user-info" options={{ headerShown: false }} />
              <Stack.Screen name="results" options={{ headerShown: false }} />
              <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
              <Stack.Screen name="lesson/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
              <Stack.Screen name="change-password" options={{ headerShown: false }} />
              <Stack.Screen name="assessment-details" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </NavigationThemeProvider>
        </AppInitializer>
      </ThemeProvider>
    </AuthProvider>
  );
}
