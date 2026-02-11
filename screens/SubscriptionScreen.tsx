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
import { Crown, Sparkles, CheckCircle, ArrowLeft } from 'lucide-react-native';
import { PurchasesPackage } from 'react-native-purchases';
import Button from '../components/Button';
import { getOfferings, purchasePackage, restorePurchases, isProMember } from '../lib/revenuecat';
import { PRO_SUBSCRIPTION_FEATURES } from '../lib/featureGating';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [isPro, setIsPro] = useState(false);
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
      const proStatus = await isProMember();
      setIsPro(proStatus);
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
        Alert.alert('Success', 'Welcome to Pro!');
        setIsPro(true);
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
      setIsPro(true);
    } else {
      Alert.alert('Notice', 'No active subscriptions found to restore.');
    }
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
          <Text style={styles.pageTitle}>Go Pro</Text>
          <Text style={styles.subtitle}>Unlock the full experience</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header / Current Status */}
        <View style={styles.promoCard}>
          <Sparkles size={32} color="#ffffff" />
          <Text style={styles.promoTitle}>
            {isPro ? 'You are a Pro Member!' : 'Unlock Premium Features'}
          </Text>
          <Text style={styles.promoText}>
            {isPro 
              ? 'Thank you for your support. Enjoy unlimited games and advanced stats.'
              : 'Get access to advanced stats, unlimited games, and game boosting.'}
          </Text>
        </View>

        {/* Features List */}
        <View style={styles.featuresContainer}>
          <Text style={styles.sectionTitle}>What's Included:</Text>
          {PRO_SUBSCRIPTION_FEATURES.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {/* Purchase Options */}
        {!isPro && (
          <View style={styles.packagesContainer}>
            <Text style={styles.sectionTitle}>Choose your plan:</Text>
            {packages.length > 0 ? (
              packages.map((pack) => (
                <View key={pack.identifier} style={styles.packageCard}>
                  <View>
                    <Text style={styles.packageTitle}>{pack.product.title}</Text>
                    <Text style={styles.packagePrice}>{pack.product.priceString}</Text>
                  </View>
                  <Button
                    onPress={() => handlePurchase(pack)}
                    title={purchasing === pack.identifier ? '...' : 'Subscribe'}
                    style={styles.subscribeButton}
                    disabled={purchasing !== null}
                  />
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                No packages found. Please check your configuration.
              </Text>
            )}
          </View>
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
    marginBottom: 24,
  },
  promoTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  promoText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  featuresContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#374151',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    color: '#d1d5db',
    marginLeft: 12,
    fontSize: 15,
  },
  packagesContainer: {
    gap: 12,
  },
  packageCard: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#374151',
  },
  packageTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  packagePrice: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '700',
  },
  subscribeButton: {
    minWidth: 100,
  },
  emptyText: {
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 10,
  },
  restoreButton: {
    alignItems: 'center',
    padding: 16,
    marginTop: 24,
  },
  restoreButtonText: {
    color: '#9ca3af',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});