import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SkillLevel } from '../types';

interface SkillLevelPickerProps {
  selected: SkillLevel;
  onSelect: (level: SkillLevel) => void;
  label?: string;
}

export default function SkillLevelPicker({
  selected,
  onSelect,
  label = 'Skill Level',
}: SkillLevelPickerProps) {
  const levels: SkillLevel[] = ['Beginner', 'Intermediate', 'Advanced'];

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.buttonContainer}>
        {levels.map((level) => (
          <TouchableOpacity
            key={level}
            onPress={() => onSelect(level)}
            style={[
              styles.button,
              selected === level ? styles.buttonSelected : styles.buttonUnselected,
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.buttonText,
                selected === level ? styles.textSelected : styles.textUnselected,
              ]}
            >
              {level}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    color: '#d1d5db',
    marginBottom: 8,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
  },
  buttonSelected: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  buttonUnselected: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  buttonText: {
    textAlign: 'center',
    fontWeight: '600',
  },
  textSelected: {
    color: '#ffffff',
  },
  textUnselected: {
    color: '#9ca3af',
  },
});
