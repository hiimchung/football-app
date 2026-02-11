import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// TODO: Replace with your actual RevenueCat API Keys
const API_KEYS = {
  apple: 'test_PhSbQdtgNwQelPHgcNeglwNslME',
  google: 'test_PhSbQdtgNwQelPHgcNeglwNslME',
};

export const ENTITLEMENT_IDS = {
  PRO_PLAYER: 'pro_player',     // Must match your RevenueCat Entitlement ID
  ORGANIZER_PRO: 'organizer_pro', // Must match your RevenueCat Entitlement ID
};

export async function initRevenueCat() {
  if (Platform.OS === 'ios') {
    await Purchases.configure({ apiKey: API_KEYS.apple });
  } else if (Platform.OS === 'android') {
    await Purchases.configure({ apiKey: API_KEYS.google });
  }
}

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (e) {
    console.error('Error fetching offerings:', e);
    return null;
  }
}

export async function purchasePackage(pack: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pack);
    return checkEntitlement(customerInfo);
  } catch (e: any) {
    if (!e.userCancelled) {
      console.error('Purchase error:', e);
    }
    return false;
  }
}

export async function restorePurchases(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    return checkEntitlement(customerInfo);
  } catch (e) {
    console.error('Restore error:', e);
    return false;
  }
}

export async function checkProStatus(): Promise<{ isPro: boolean; isOrganizer: boolean }> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return {
      isPro: customerInfo.entitlements.active[ENTITLEMENT_IDS.PRO_PLAYER] !== undefined,
      isOrganizer: customerInfo.entitlements.active[ENTITLEMENT_IDS.ORGANIZER_PRO] !== undefined,
    };
  } catch (e) {
    return { isPro: false, isOrganizer: false };
  }
}

// Helper to check if any relevant entitlement is active
function checkEntitlement(customerInfo: CustomerInfo): boolean {
  return (
    customerInfo.entitlements.active[ENTITLEMENT_IDS.PRO_PLAYER] !== undefined ||
    customerInfo.entitlements.active[ENTITLEMENT_IDS.ORGANIZER_PRO] !== undefined
  );
}