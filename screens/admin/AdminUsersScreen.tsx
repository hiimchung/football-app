import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Search, ShieldBan, ShieldCheck } from 'lucide-react-native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface UserRow {
  id: string;
  username: string;
  skill_level: string;
  role: string;
  banned: boolean;
  created_at: string;
}

export default function AdminUsersScreen() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, skill_level, role, banned, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) setUsers(data);
    setLoading(false);
  };

  const toggleBan = async (userId: string, banned: boolean) => {
    if (userId === currentUser?.id) return;
    setActionLoading(userId);
    const { error } = await supabase
      .from('profiles')
      .update({ banned: !banned })
      .eq('id', userId);

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, banned: !banned } : u))
      );
    }
    setActionLoading(null);
  };

  const filtered = users.filter((u) =>
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Users</Text>
        <Text style={styles.pageSubtitle}>{users.length} total users</Text>
      </View>

      <View style={styles.searchWrap}>
        <Search size={18} color="#64748b" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search users..."
          placeholderTextColor="#475569"
        />
      </View>

      <ScrollView style={styles.tableScroll}>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, { flex: 2 }]}>User</Text>
          <Text style={[styles.th, { flex: 1 }]}>Skill</Text>
          <Text style={[styles.th, { flex: 1 }]}>Role</Text>
          <Text style={[styles.th, { flex: 1 }]}>Status</Text>
          <Text style={[styles.th, { width: 100 }]}>Actions</Text>
        </View>

        {filtered.map((u) => (
          <View key={u.id} style={styles.tableRow}>
            <Text style={[styles.td, { flex: 2 }]} numberOfLines={1}>
              {u.username}
            </Text>
            <Text style={[styles.td, styles.capitalize, { flex: 1 }]}>
              {u.skill_level}
            </Text>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View
                style={[
                  styles.badge,
                  u.role === 'admin' ? styles.badgeAdmin : styles.badgeUser,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    u.role === 'admin'
                      ? styles.badgeAdminText
                      : styles.badgeUserText,
                  ]}
                >
                  {u.role}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View
                style={[
                  styles.badge,
                  u.banned ? styles.badgeBanned : styles.badgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    u.banned ? styles.badgeBannedText : styles.badgeActiveText,
                  ]}
                >
                  {u.banned ? 'Banned' : 'Active'}
                </Text>
              </View>
            </View>
            <View style={{ width: 100, flexDirection: 'row' }}>
              {u.id !== currentUser?.id ? (
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    u.banned ? styles.actionUnban : styles.actionBan,
                  ]}
                  onPress={() => toggleBan(u.id, u.banned)}
                  disabled={actionLoading === u.id}
                  activeOpacity={0.7}
                >
                  {actionLoading === u.id ? (
                    <ActivityIndicator
                      size="small"
                      color={u.banned ? '#10b981' : '#ef4444'}
                    />
                  ) : u.banned ? (
                    <>
                      <ShieldCheck size={14} color="#10b981" />
                      <Text style={styles.actionUnbanText}>Unban</Text>
                    </>
                  ) : (
                    <>
                      <ShieldBan size={14} color="#ef4444" />
                      <Text style={styles.actionBanText}>Ban</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <Text style={styles.youLabel}>You</Text>
              )}
            </View>
          </View>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyRow}>
            <Text style={styles.emptyText}>
              {search ? 'No users match your search' : 'No users found'}
            </Text>
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
  loadingWrap: {
    flex: 1,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 32,
    paddingBottom: 0,
  },
  pageTitle: {
    color: '#f8fafc',
    fontSize: 28,
    fontWeight: '700',
  },
  pageSubtitle: {
    color: '#94a3b8',
    fontSize: 15,
    marginTop: 4,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    marginHorizontal: 32,
    marginTop: 24,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 15,
  },
  tableScroll: {
    flex: 1,
    marginHorizontal: 32,
    marginTop: 20,
    marginBottom: 32,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 8,
  },
  th: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  td: {
    color: '#e2e8f0',
    fontSize: 14,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badgeAdmin: { backgroundColor: 'rgba(59, 130, 246, 0.15)' },
  badgeAdminText: { color: '#3b82f6' },
  badgeUser: { backgroundColor: 'rgba(148, 163, 184, 0.1)' },
  badgeUserText: { color: '#94a3b8' },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
  badgeActiveText: { color: '#10b981' },
  badgeBanned: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },
  badgeBannedText: { color: '#ef4444' },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  actionBan: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
  },
  actionUnban: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  actionBanText: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '600',
  },
  actionUnbanText: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '600',
  },
  youLabel: {
    color: '#64748b',
    fontSize: 13,
    fontStyle: 'italic',
  },
  emptyRow: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 15,
  },
});
