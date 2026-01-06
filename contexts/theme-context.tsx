import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeColors {
  primary: string;
  background: string;
  card: string;
  cardBorder: string;
  text: string;
  textSecondary: string;
  buttonPrimary: string;
  buttonPrimaryText: string;
  buttonSecondary: string;
  buttonSecondaryText: string;
  border: string;
  success: string;
  error: string;
  inputBackground: string;
  inputBorder: string;
}

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
  isDark: boolean;
}

const lightColors: ThemeColors = {
  primary: '#192B47',
  background: '#F9FAFB',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  buttonPrimary: '#192B47',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#F3F4F6',
  buttonSecondaryText: '#192B47',
  border: '#E5E7EB',
  success: '#10B981',
  error: '#EF4444',
  inputBackground: '#FFFFFF',
  inputBorder: '#D1D5DB',
};

const darkColors: ThemeColors = {
  primary: '#192B47',
  background: '#192B47',
  card: 'rgba(255, 255, 255, 0.1)',
  cardBorder: 'rgba(255, 255, 255, 0.3)',
  text: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  buttonPrimary: '#FFFFFF',
  buttonPrimaryText: '#192B47',
  buttonSecondary: 'rgba(255, 255, 255, 0.2)',
  buttonSecondaryText: '#FFFFFF',
  border: 'rgba(255, 255, 255, 0.3)',
  success: '#10B981',
  error: '#EF4444',
  inputBackground: 'rgba(255, 255, 255, 0.1)',
  inputBorder: 'rgba(255, 255, 255, 0.3)',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedMode = await AsyncStorage.getItem('theme_mode');
      if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
        setModeState(savedMode);
      }
    } catch (error) {
      console.error('Failed to load theme:', error);
    } finally {
      setMounted(true);
    }
  };

  const setMode = async (newMode: ThemeMode) => {
    try {
      await AsyncStorage.setItem('theme_mode', newMode);
      setModeState(newMode);
    } catch (error) {
      console.error('Failed to save theme:', error);
    }
  };

  const getEffectiveTheme = (): 'light' | 'dark' => {
    if (mode === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return mode;
  };

  const effectiveTheme = getEffectiveTheme();
  const colors = effectiveTheme === 'dark' ? darkColors : lightColors;
  const isDark = effectiveTheme === 'dark';

  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
