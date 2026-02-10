import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import {
  LayoutDashboard,
  Users,
  Trophy,
  CreditCard,
  LogOut,
  Shield,
} from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { label: 'Users', path: '/admin/users', icon: Users },
  { label: 'Games', path: '/admin/games', icon: Trophy },
  { label: 'Subscriptions', path: '/admin/subscriptions', icon: CreditCard },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { signOut } = useAuth();

  const isActive = (path: string) => {
    if (path === '/admin') return pathname === '/admin' || pathname === '/admin/';
    return pathname.startsWith(path);
  };

  return (
    <View style={styles.container}>
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Shield size={24} color="#10b981" />
        </View>
        <Text style={styles.brandText}>Admin Panel</Text>
      </View>

      <View style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <TouchableOpacity
              key={item.path}
              style={[styles.navItem, active && styles.navItemActive]}
              onPress={() => router.replace(item.path as any)}
              activeOpacity={0.7}
            >
              {active && <View style={styles.activeIndicator} />}
              <item.icon size={20} color={active ? '#10b981' : '#64748b'} />
              <Text style={[styles.navLabel, active && styles.navLabelActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <LogOut size={20} color="#ef4444" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 260,
    backgroundColor: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#1e293b',
    paddingVertical: 24,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 12,
  },
  brandIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  nav: {
    flex: 1,
    gap: 4,
    paddingHorizontal: 12,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
    backgroundColor: '#10b981',
  },
  navLabel: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '500',
  },
  navLabelActive: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  footer: {
    paddingHorizontal: 12,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 12,
  },
  signOutText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '500',
  },
});
