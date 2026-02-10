import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { Slot } from 'expo-router';
import { Shield } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from '../../components/admin/Sidebar';

type AdminState = 'loading' | 'unauthenticated' | 'denied' | 'admin';

export default function AdminLayout() {
  const { user, signOut } = useAuth();
  const [adminState, setAdminState] = useState<AdminState>('loading');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, [user]);

  const checkAdmin = async () => {
    if (!user) {
      setAdminState('unauthenticated');
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    setAdminState(data?.role === 'admin' ? 'admin' : 'denied');
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setLoginError('Please enter email and password');
      return;
    }
    setLoginError('');
    setLoginLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, banned')
        .eq('id', data.user.id)
        .maybeSingle();

      if (profile?.banned) {
        await supabase.auth.signOut();
        setLoginError('This account has been suspended.');
        return;
      }
      if (profile?.role !== 'admin') {
        await supabase.auth.signOut();
        setLoginError('Access denied. Admin privileges required.');
        return;
      }
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  if (adminState === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  if (adminState === 'unauthenticated') {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.loginBg}
      >
        <View style={styles.loginCard}>
          <View style={styles.loginIconWrap}>
            <Shield size={40} color="#10b981" />
          </View>
          <Text style={styles.loginTitle}>Admin Dashboard</Text>
          <Text style={styles.loginSubtitle}>
            Sign in to manage your platform
          </Text>

          {loginError ? (
            <View style={styles.loginErrorWrap}>
              <Text style={styles.loginErrorText}>{loginError}</Text>
            </View>
          ) : null}

          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="admin@example.com"
            placeholderTextColor="#475569"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#475569"
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.loginBtn, loginLoading && { opacity: 0.6 }]}
            onPress={handleLogin}
            disabled={loginLoading}
            activeOpacity={0.8}
          >
            {loginLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  if (adminState === 'denied') {
    return (
      <View style={styles.center}>
        <Shield size={48} color="#ef4444" />
        <Text style={styles.deniedTitle}>Access Denied</Text>
        <Text style={styles.deniedSub}>
          You do not have admin privileges.
        </Text>
        <TouchableOpacity
          style={styles.deniedBtn}
          onPress={signOut}
          activeOpacity={0.7}
        >
          <Text style={styles.deniedBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.dashboard}>
      <Sidebar />
      <View style={styles.content}>
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loginBg: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loginCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 40,
    borderWidth: 1,
    borderColor: '#334155',
  },
  loginIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    alignSelf: 'center',
  },
  loginTitle: {
    color: '#f8fafc',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 32,
  },
  loginErrorWrap: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  loginErrorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputLabel: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#f8fafc',
    fontSize: 15,
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deniedTitle: {
    color: '#f8fafc',
    fontSize: 22,
    fontWeight: '700',
  },
  deniedSub: {
    color: '#94a3b8',
    fontSize: 15,
  },
  deniedBtn: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  deniedBtnText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
  dashboard: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111827',
  },
  content: {
    flex: 1,
  },
});
