import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { Platform } from 'react-native';

const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '';

export const FREE_LESSON_LIMIT = 5;

const PRO_ENTITLEMENT_ID = 'pro';

/**
 * Configure RevenueCat SDK with the current Supabase user ID.
 * Call once after the user signs in.
 */
export async function initRevenueCat(userId: string) {
  const apiKey = Platform.OS === 'ios' ? IOS_KEY : ANDROID_KEY;
  console.log('RevenueCat: Configuring with key prefix:', apiKey?.substring(0, 8) + '...');
  if (!apiKey) {
    console.warn('RevenueCat: No API key configured for', Platform.OS);
    return;
  }

  Purchases.configure({ apiKey, appUserID: userId });
  console.log('RevenueCat: Configured for user', userId);
}

/**
 * Fetch the current offering's available packages (monthly + annual).
 */
export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  console.log('RevenueCat all offerings:', Object.keys(offerings.all));
  console.log('RevenueCat current offering:', offerings.current?.identifier);
  // Fall back to 'podium_premium' if no current offering is set
  return offerings.current ?? offerings.all['podium_premium'] ?? null;
}

/**
 * Execute an in-app purchase for a given package.
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

/**
 * Restore previously purchased subscriptions.
 */
export async function restorePurchases(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.restorePurchases();
  return customerInfo;
}

/**
 * Get the latest customer info (entitlements, subscriptions).
 */
export async function getCustomerInfo(): Promise<CustomerInfo> {
  const customerInfo = await Purchases.getCustomerInfo();
  return customerInfo;
}

/**
 * Check whether the customer has an active "pro" entitlement.
 */
export function isPremiumFromInfo(info: CustomerInfo): boolean {
  return info.entitlements.active[PRO_ENTITLEMENT_ID] !== undefined;
}

/**
 * Log out the current RevenueCat user (call on sign-out).
 */
export async function logOutRevenueCat() {
  try {
    await Purchases.logOut();
  } catch {
    // Ignore — user may not have been configured yet
  }
}
