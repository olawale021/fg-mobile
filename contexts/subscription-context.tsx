import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import Purchases, { CustomerInfo } from 'react-native-purchases';
import { useAuth } from '@/contexts/auth-context';
import { initRevenueCat, isPremiumFromInfo, getCustomerInfo, logOutRevenueCat } from '@/lib/revenucat';

interface SubscriptionContextType {
  isPremium: boolean;
  loading: boolean;
  refreshPremiumStatus: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType>({
  isPremium: false,
  loading: true,
  refreshPremiumStatus: async () => {},
});

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  const refreshPremiumStatus = useCallback(async () => {
    try {
      const info = await getCustomerInfo();
      setIsPremium(isPremiumFromInfo(info));
    } catch {
      // SDK not configured yet or network error — keep current state
    }
  }, []);

  // Initialize RevenueCat when user signs in, reset on sign-out
  useEffect(() => {
    if (user) {
      (async () => {
        setLoading(true);
        try {
          await initRevenueCat(user.id);
          const info = await getCustomerInfo();
          setIsPremium(isPremiumFromInfo(info));
        } catch {
          setIsPremium(false);
        } finally {
          setLoading(false);
        }
      })();
    } else {
      // User signed out
      setIsPremium(false);
      setLoading(false);
      logOutRevenueCat();
    }
  }, [user]);

  // Listen for real-time entitlement changes
  useEffect(() => {
    const listener = (info: CustomerInfo) => {
      setIsPremium(isPremiumFromInfo(info));
    };

    Purchases.addCustomerInfoUpdateListener(listener);

    return () => {
      Purchases.removeCustomerInfoUpdateListener(listener);
    };
  }, []);

  return (
    <SubscriptionContext.Provider value={{ isPremium, loading, refreshPremiumStatus }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (!context) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}
