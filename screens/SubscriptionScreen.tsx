import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Sparkles, TrendingUp, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { PurchasesPackage } from 'react-native-purchases';
import Button from '../components/Button';
import { getOfferings, purchasePackage, restorePurchases, checkProStatus } from '../lib/revenuecat';
import { SUBSCRIPTION_PRICES } from '../lib/featureGating';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const offerings = await getOfferings();
      if (offerings && offerings.availablePackages) {
        setPackages(offerings.availablePackages);
      }

      const status = await checkProStatus();
      setIsPro(status.isPro);
      setIsOrganizer(status.isOrganizer);
    } catch (err) {
      console.error('Error loading subscription data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pack: PurchasesPackage) => {
    setPurchasing(pack.identifier);
    try {
      const success = await purchasePackage(pack);
      if (success) {
        Alert.alert('Success', 'Subscription activated!');
        loadData();
      }
    } catch (e) {
      Alert.alert('Error', 'Purchase failed. Please try again.');
    } finally {
      setPurchasing(null);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    const success = await restorePurchases();
    setLoading(false);
    if (success) {
      Alert.alert('Success', 'Purchases restored!');
      loadData();
    } else {
      Alert.alert('Notice', 'No active subscriptions found to restore.');
    }
  };

  const renderPackageCard = (pack: PurchasesPackage) => {
    // Determine type based on your RevenueCat product identifier conventions
    // Example: 'pro_monthly' vs 'organizer_monthly'
    const isOrganizerPackage = pack.product.identifier.includes('organizer');
    const type = isOrganizerPackage ? 'organizer_pro' : 'pro_player';
    
    // Check if this plan is currently active
    const isActive = isOrganizerPackage ? isOrganizer : isPro;
    
    const IconComponent = isOrganizerPackage ? TrendingUp : Crown;
    const staticInfo = SUBSCRIPTION_PRICES[type];

    return (
      <View style={[styles.planCard, isActive && styles.planCardActive]} key={pack.identifier}>
        <View style={styles.planHeader}>
          <View style={styles.planIconWrap}>
            <IconComponent size={24} color="#FFFFFF" />
          </View>
          <View style={styles.planHeaderText}>
            <Text style={styles.planName}>{pack.product.title}</Text>
            {isActive && (
              <View style={styles.activeBadgeRow}>
                <CheckCircle size={14} color="#10b981" />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <View style={styles.priceWrap}>
            <Text style={styles.priceAmount}>{pack.product.priceString}</Text>
          </View>
        </View>

        <Text style={styles.planDescription}>{pack.product.description}</Text>

        {/* Static features list from featureGating file for display purposes */}
        <View style={styles.featureList}>
          {staticInfo.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {!isActive && (
          <Button
            onPress={() => handlePurchase(pack)}
            title={purchasing === pack.identifier ? 'Processing...' : 'Subscribe Now'}
            disabled={purchasing !== null}
          />
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color="#ffffff" />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle}>Subscriptions</Text>
          <Text style={styles.subtitle}>Upgrade your experience</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.promoCard}>
          <Sparkles size={32} color="#ffffff" />
          <Text style={styles.promoTitle}>Unlock Premium Features</Text>
          <Text style={styles.promoText}>
            Get access to advanced stats, unlimited games, and more.
          </Text>
        </View>

        {packages.length > 0 ? (
          packages.map(renderPackageCard)
        ) : (
          <Text style={styles.emptyText}>No packages available.</Text>
        )}

        <TouchableOpacity style={styles.restoreButton} onPress={handleRestore}>
          <Text style={styles.restoreButtonText}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBar: {
    paddingHorizontal: 24,
    paddingTop: 52,
    paddingBottom: 16,
    backgroundColor: '#1f2937',
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  pageTitle: {
    color: '#ffffff',
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  promoCard: {
    backgroundColor: '#059669',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  promoText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    lineHeight: 22,
  },
  planCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#374151',
  },
  planCardActive: {
    borderColor: '#10b981',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIconWrap: {
    width: 48,
    height: 48,
    backgroundColor: '#10b981',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  planHeaderText: {
    flex: 1,
  },
  planName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
  },
  activeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  activeBadgeText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  priceWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
  },
  planDescription: {
    color: '#9ca3af',
    fontSize: 15,
    marginBottom: 16,
    lineHeight: 22,
  },
  featureList: {
    marginBottom: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    color: '#d1d5db',
    marginLeft: 10,
    fontSize: 15,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 16,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 8,
  },
  restoreButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});