import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ActivityIndicator, Alert, ScrollView, Image } from 'react-native';

const faqIcon = require('../assets/images/faq.png');
const newIcon = require('../assets/images/new.png');
const unlockIcon = require('../assets/images/unlock.png');
const highIcon = require('../assets/images/high.png');
import { PurchasesPackage } from 'react-native-purchases';
import * as WebBrowser from 'expo-web-browser';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/revenucat';
import { useSubscription } from '@/contexts/subscription-context';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
}

export function PaywallModal({ visible, onClose }: PaywallModalProps) {
  const { refreshPremiumStatus } = useSubscription();
  const [selectedPlan, setSelectedPlan] = useState<'annual' | 'monthly'>('monthly');
  const [monthlyPackage, setMonthlyPackage] = useState<PurchasesPackage | null>(null);
  const [annualPackage, setAnnualPackage] = useState<PurchasesPackage | null>(null);
  const [loadingOfferings, setLoadingOfferings] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (visible) {
      loadOfferings();
    }
  }, [visible]);

  const loadOfferings = async () => {
    setLoadingOfferings(true);
    try {
      const offering = await getOfferings();
      console.log('RevenueCat offering:', JSON.stringify(offering, null, 2));
      if (offering) {
        // Try standard identifiers first, then fall back to available packages
        const allPackages = offering.availablePackages ?? [];
        console.log('Available packages:', allPackages.map(p => `${p.identifier} - ${p.product.priceString}`));

        const monthly = offering.monthly ?? allPackages.find(p => p.packageType === 'MONTHLY') ?? null;
        const annual = offering.annual ?? allPackages.find(p => p.packageType === 'ANNUAL') ?? null;

        console.log('Monthly:', monthly?.identifier, monthly?.product.priceString);
        console.log('Annual:', annual?.identifier, annual?.product.priceString);

        setMonthlyPackage(monthly);
        setAnnualPackage(annual);
        setSelectedPlan(annual ? 'annual' : 'monthly');
      } else {
        console.warn('RevenueCat: No current offering found');
      }
    } catch (error) {
      console.error('Error loading offerings:', error);
    } finally {
      setLoadingOfferings(false);
    }
  };

  const getMonthlyPrice = () => {
    if (!monthlyPackage) return '';
    return monthlyPackage.product.priceString;
  };

  const getAnnualPrice = () => {
    if (!annualPackage) return '';
    return annualPackage.product.priceString;
  };

  const getAnnualMonthlyEquivalent = () => {
    if (!annualPackage) return '';
    const price = annualPackage.product.price / 12;
    const currencyCode = annualPackage.product.currencyCode;
    return `${currencyCode} ${price.toFixed(2)}`;
  };

  const getSavingsPercent = () => {
    if (!monthlyPackage || !annualPackage) return 0;
    const monthlyAnnualized = monthlyPackage.product.price * 12;
    const annualPrice = annualPackage.product.price;
    return Math.round(((monthlyAnnualized - annualPrice) / monthlyAnnualized) * 100);
  };

  const handlePurchase = async () => {
    const pkg = selectedPlan === 'annual' ? annualPackage : monthlyPackage;
    if (!pkg) {
      Alert.alert('Not Available', 'No subscription packages found. Please check your RevenueCat configuration.');
      return;
    }

    setPurchasing(true);
    try {
      await purchasePackage(pkg);
      await refreshPremiumStatus();
      onClose();
    } catch (error: any) {
      if (error.userCancelled) {
        // User cancelled — do nothing
        return;
      }
      Alert.alert('Purchase Failed', error.message || 'Something went wrong. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      await restorePurchases();
      await refreshPremiumStatus();
      Alert.alert('Restored', 'Your purchases have been restored.');
      onClose();
    } catch (error: any) {
      Alert.alert('Restore Failed', error.message || 'Could not restore purchases. Please try again.');
    } finally {
      setRestoring(false);
    }
  };

  const FEATURES = [
    { image: faqIcon, label: 'Unlimited Q&A' },
    { image: unlockIcon, label: 'All lessons unlocked' },
    { image: highIcon, label: 'Priority lesson generation' },
    { image: newIcon, label: 'Early access to new features' },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayDismiss} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {/* Header */}
            <View style={styles.headerSection}>
              <Text style={styles.title}>Upgrade to Premium</Text>
              <Text style={styles.subtitle}>
                Unlock the full Podium experience
              </Text>
            </View>

            {/* Features */}
            <View style={styles.featuresSection}>
              {FEATURES.map((feature, i) => (
                <View key={i} style={styles.featureRow}>
                  <Image source={feature.image} style={styles.featureIcon} />
                  <Text style={styles.featureLabel}>{feature.label}</Text>
                </View>
              ))}
            </View>

            {loadingOfferings ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#01B2FE" />
              </View>
            ) : (
              <>
                {/* Plan toggle */}
                <View style={styles.plansSection}>
                  {/* Annual */}
                  {annualPackage && (
                    <Pressable
                      style={[styles.planCard, selectedPlan === 'annual' && styles.planCardSelected]}
                      onPress={() => setSelectedPlan('annual')}
                    >
                      <View style={styles.planHeader}>
                        <View style={[styles.radioOuter, selectedPlan === 'annual' && styles.radioOuterSelected]}>
                          {selectedPlan === 'annual' && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.planInfo}>
                          <View style={styles.planTitleRow}>
                            <Text style={[styles.planName, selectedPlan === 'annual' && styles.planNameSelected]}>Annual</Text>
                            {getSavingsPercent() > 0 && (
                              <View style={styles.savingsBadge}>
                                <Text style={styles.savingsBadgeText}>Save {getSavingsPercent()}%</Text>
                              </View>
                            )}
                          </View>
                          <Text style={styles.planPrice}>{getAnnualPrice()}/year</Text>
                          <Text style={styles.planEquiv}>{getAnnualMonthlyEquivalent()}/mo</Text>
                        </View>
                      </View>
                    </Pressable>
                  )}

                  {/* Monthly */}
                  {monthlyPackage && (
                    <Pressable
                      style={[styles.planCard, selectedPlan === 'monthly' && styles.planCardSelected]}
                      onPress={() => setSelectedPlan('monthly')}
                    >
                      <View style={styles.planHeader}>
                        <View style={[styles.radioOuter, selectedPlan === 'monthly' && styles.radioOuterSelected]}>
                          {selectedPlan === 'monthly' && <View style={styles.radioInner} />}
                        </View>
                        <View style={styles.planInfo}>
                          <Text style={[styles.planName, selectedPlan === 'monthly' && styles.planNameSelected]}>Monthly</Text>
                          <Text style={styles.planPrice}>{getMonthlyPrice()}/month</Text>
                        </View>
                      </View>
                    </Pressable>
                  )}
                </View>

                {/* Subscribe button */}
                <Pressable
                  style={[styles.subscribeButton, (purchasing || restoring) && styles.subscribeButtonDisabled]}
                  onPress={handlePurchase}
                  disabled={purchasing || restoring}
                >
                  {purchasing ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.subscribeButtonText}>Subscribe Now</Text>
                  )}
                </Pressable>

                {/* Restore */}
                <Pressable style={styles.restoreButton} onPress={handleRestore} disabled={purchasing || restoring}>
                  {restoring ? (
                    <ActivityIndicator size="small" color="#6B7280" />
                  ) : (
                    <Text style={styles.restoreButtonText}>Restore Purchases</Text>
                  )}
                </Pressable>
              </>
            )}

            {/* Legal links */}
            <View style={styles.legalSection}>
              <Pressable onPress={() => WebBrowser.openBrowserAsync('https://foundergroundworks.com/terms')}>
                <Text style={styles.legalLink}>Terms of Service</Text>
              </Pressable>
              <Text style={styles.legalDot}> · </Text>
              <Pressable onPress={() => WebBrowser.openBrowserAsync('https://foundergroundworks.com/privacy')}>
                <Text style={styles.legalLink}>Privacy Policy</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  overlayDismiss: {
    flex: 1,
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
    maxHeight: '85%',
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontFamily: 'HostGrotesk-Bold',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
  },
  featuresSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  featureIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
    marginRight: 14,
  },
  featureLabel: {
    fontSize: 16,
    fontFamily: 'HostGrotesk-Medium',
    color: '#111827',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  plansSection: {
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 20,
  },
  planCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 16,
  },
  planCardSelected: {
    borderColor: '#01B2FE',
    backgroundColor: '#F0F9FF',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  radioOuterSelected: {
    borderColor: '#01B2FE',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#01B2FE',
  },
  planInfo: {
    flex: 1,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  planName: {
    fontSize: 17,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#374151',
  },
  planNameSelected: {
    color: '#111827',
  },
  savingsBadge: {
    backgroundColor: '#FF7A1A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  savingsBadgeText: {
    fontSize: 11,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  planPrice: {
    fontSize: 15,
    fontFamily: 'HostGrotesk-Medium',
    color: '#374151',
    marginTop: 2,
  },
  planEquiv: {
    fontSize: 13,
    fontFamily: 'HostGrotesk-Regular',
    color: '#6B7280',
    marginTop: 1,
  },
  subscribeButton: {
    backgroundColor: '#01B2FE',
    marginHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  subscribeButtonDisabled: {
    opacity: 0.6,
  },
  subscribeButtonText: {
    fontSize: 17,
    fontFamily: 'HostGrotesk-SemiBold',
    color: '#FFFFFF',
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 16,
  },
  restoreButtonText: {
    fontSize: 14,
    fontFamily: 'HostGrotesk-Medium',
    color: '#6B7280',
  },
  legalSection: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 8,
  },
  legalLink: {
    fontSize: 12,
    fontFamily: 'HostGrotesk-Regular',
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
  legalDot: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
