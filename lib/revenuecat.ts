import { Platform } from 'react-native';
import Purchases, { PurchasesOffering, PurchasesPackage, CustomerInfo } from 'react-native-purchases';

// TODO: Replace with your actual RevenueCat API Keys
const API_KEYS = {
  apple: 'appl_your_apple_api_key',
  google: 'goog_your_google_api_key',
};

// We now only have one entitlement that unlocks everything
export const ENTITLEMENT_ID = 'PickupGames Pro'; 

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

// Returns true if the user has the 'pro' entitlement
export async function isProMember(): Promise<boolean> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return checkEntitlement(customerInfo);
  } catch (e) {
    return false;
  }
}

function checkEntitlement(customerInfo: CustomerInfo): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}