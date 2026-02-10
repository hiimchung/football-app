import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Sparkles, TrendingUp, CheckCircle, ArrowLeft } from 'lucide-react-native';
import Button from '../components/Button';
import { subscribeToPlan, getUserSubscriptions, isProPlayer, isOrganizerPro } from '../lib/paypal';
import { SUBSCRIPTION_PRICES } from '../lib/featureGating';
import { Subscription } from '../types';

export default function SubscriptionScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [hasProPlayer, setHasProPlayer] = useState(false);
  const [hasOrganizerPro, setHasOrganizerPro] = useState(false);
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const [subsResult, proPlayerStatus, organizerProStatus] = await Promise.all([
        getUserSubscriptions(),
        isProPlayer(),
        isOrganizerPro(),
      ]);

      if (subsResult.data) {
        setSubscriptions(subsResult.data);
      }

      setHasProPlayer(proPlayerStatus);
      setHasOrganizerPro(organizerProStatus);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: 'pro_player' | 'organizer_pro') => {
    try {
      setSubscribing(plan);
      setError('');

      const result = await subscribeToPlan(plan);

      if (result.success) {
        loadSubscriptions();
      } else {
        setError(result.error || 'Failed to start subscription');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setSubscribing(null);
    }
  };

  const renderPlanCard = (
    plan: 'pro_player' | 'organizer_pro',
    IconComponent: any,
    isActive: boolean
  ) => {
    const planInfo = SUBSCRIPTION_PRICES[plan];

    return (
      <View style={[styles.planCard, isActive && styles.planCardActive]} key={plan}>
        <View style={styles.planHeader}>
          <View style={styles.planIconWrap}>
            <IconComponent size={24} color="#FFFFFF" />
          </View>
          <View style={styles.planHeaderText}>
            <Text style={styles.planName}>{planInfo.name}</Text>
            {isActive && (
              <View style={styles.activeBadgeRow}>
                <CheckCircle size={14} color="#10b981" />
                <Text style={styles.activeBadgeText}>Active</Text>
              </View>
            )}
          </View>
          <View style={styles.priceWrap}>
            <Text style={styles.priceAmount}>${planInfo.price}</Text>
            <Text style={styles.pricePeriod}>/mo</Text>
          </View>
        </View>

        <Text style={styles.planDescription}>{planInfo.description}</Text>

        <View style={styles.featureList}>
          {planInfo.features.map((feature, index) => (
            <View key={index} style={styles.featureRow}>
              <CheckCircle size={16} color="#10b981" />
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        {!isActive && (
          <Button
            onPress={() => handleSubscribe(plan)}
            title={subscribing === plan ? 'Processing...' : 'Subscribe Now'}
            disabled={subscribing !== null}
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
        {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

        <View style={styles.promoCard}>
          <Sparkles size={32} color="#ffffff" />
          <Text style={styles.promoTitle}>Unlock Premium Features</Text>
          <Text style={styles.promoText}>
            Get access to advanced stats, unlimited games, and more with our subscription plans.
          </Text>
        </View>

        {renderPlanCard('pro_player', Crown, hasProPlayer)}
        {renderPlanCard('organizer_pro', TrendingUp, hasOrganizerPro)}

        {subscriptions.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.historyTitle}>Subscription History</Text>
            {subscriptions.map((sub) => (
              <View key={sub.id} style={styles.historyItem}>
                <View style={styles.historyRow}>
                  <Text style={styles.historyPlanName}>
                    {SUBSCRIPTION_PRICES[sub.plan as keyof typeof SUBSCRIPTION_PRICES]?.name ||
                      sub.plan}
                  </Text>
                  <Text
                    style={[
                      styles.historyStatus,
                      sub.status === 'active' && { color: '#10b981' },
                      sub.status === 'completed' && { color: '#3b82f6' },
                    ]}
                  >
                    {sub.status}
                  </Text>
                </View>
                <View style={styles.historyRow}>
                  <Text style={styles.historyDate}>
                    {new Date(sub.created_at).toLocaleDateString()}
                  </Text>
                  <Text style={styles.historyAmount}>
                    ${sub.amount} {sub.currency}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
  errorBanner: {
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '500',
    overflow: 'hidden',
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
    fontSize: 28,
    fontWeight: '700',
  },
  pricePeriod: {
    color: '#9ca3af',
    fontSize: 14,
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
  historySection: {
    marginTop: 8,
    marginBottom: 24,
  },
  historyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  historyItem: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#374151',
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  historyPlanName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 15,
  },
  historyStatus: {
    color: '#9ca3af',
    fontWeight: '600',
    fontSize: 14,
    textTransform: 'capitalize',
  },
  historyDate: {
    color: '#9ca3af',
    fontSize: 13,
  },
  historyAmount: {
    color: '#ffffff',
    fontSize: 14,
  },
});
