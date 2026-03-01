import React, { createContext, useContext } from 'react';

interface ThemeColors {
  primary: string;
  accent: string;
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
  colors: ThemeColors;
}

const colors: ThemeColors = {
  primary: '#01B2FE',
  accent: '#FF7A1A',
  background: '#01B2FE',
  card: '#FFFFFF',
  cardBorder: '#E5E7EB',
  text: '#111827',
  textSecondary: '#6B7280',
  buttonPrimary: '#01B2FE',
  buttonPrimaryText: '#FFFFFF',
  buttonSecondary: '#F3F4F6',
  buttonSecondaryText: '#111827',
  border: '#E5E7EB',
  success: '#FF7A1A',
  error: '#EF4444',
  inputBackground: '#FFFFFF',
  inputBorder: '#D1D5DB',
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeContext.Provider value={{ colors }}>
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
