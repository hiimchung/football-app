import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Target } from 'lucide-react-native';
import Input from '../components/Input';
import Button from '../components/Button';
import SkillLevelPicker from '../components/SkillLevelPicker';
import { SkillLevel } from '../types';
import { supabase } from '../lib/supabase';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [skillLevel, setSkillLevel] = useState<SkillLevel>('Beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    try {
      console.log('Starting signup process...');

      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            username: name,
            skill_level: skillLevel.toLowerCase(),
          },
        },
      });

      if (authError) {
        throw authError;
      }

      console.log('Signup successful:', data);
      setSuccess(true);

      setTimeout(() => {
        router.replace('/(tabs)' as any);
      }, 1000);
    } catch (error: any) {
      console.error('Signup error:', error);
      setError(error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Target size={50} color="#10b981" strokeWidth={2.5} />
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the pickup game community</Text>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>Account created successfully!</Text> : null}
          <Input
            value={name}
            onChangeText={setName}
            placeholder="Full Name"
            label="Name"
          />
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            label="Email"
            keyboardType="email-address"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            label="Password"
            secureTextEntry
          />
          <SkillLevelPicker selected={skillLevel} onSelect={setSkillLevel} />
        </View>

        <Button onPress={handleSignup} title="Sign Up" style={styles.button} disabled={loading} />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111827',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 16,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 16,
    marginTop: 8,
  },
  form: {
    marginBottom: 24,
  },
  button: {
    marginBottom: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#9ca3af',
  },
  link: {
    color: '#10b981',
    fontWeight: '600',
  },
  errorText: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#10b981',
    marginBottom: 16,
    textAlign: 'center',
  },
});
