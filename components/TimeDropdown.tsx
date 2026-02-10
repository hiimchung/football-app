import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Clock, ChevronDown, ChevronUp } from 'lucide-react-native';

interface TimeDropdownProps {
  selectedTime: string;
  onSelectTime: (time: string) => void;
  label?: string;
}

function generateTimeSlots(): { label: string; value: string }[] {
  const slots: { label: string; value: string }[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hour24 = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const period = h < 12 ? 'AM' : 'PM';
      const displayHour = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const label = `${displayHour}:${m.toString().padStart(2, '0')} ${period}`;
      slots.push({ label, value: hour24 });
    }
  }
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function getDisplayLabel(value: string): string {
  const slot = TIME_SLOTS.find((s) => s.value === value);
  return slot ? slot.label : value;
}

export default function TimeDropdown({ selectedTime, onSelectTime, label }: TimeDropdownProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (value: string) => {
    onSelectTime(value);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.7}
      >
        <Clock size={18} color="#9ca3af" />
        <Text style={[styles.triggerText, !selectedTime && styles.triggerPlaceholder]}>
          {selectedTime ? getDisplayLabel(selectedTime) : 'Select a time'}
        </Text>
        {open ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          <ScrollView style={styles.scrollArea} nestedScrollEnabled>
            {TIME_SLOTS.map((slot) => {
              const isSelected = slot.value === selectedTime;
              return (
                <TouchableOpacity
                  key={slot.value}
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(slot.value)}
                  activeOpacity={0.6}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
    zIndex: 10,
  },
  label: {
    color: '#d1d5db',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  trigger: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  triggerOpen: {
    borderColor: '#10b981',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  triggerText: {
    color: '#ffffff',
    fontSize: 16,
    flex: 1,
    marginLeft: 12,
  },
  triggerPlaceholder: {
    color: '#6b7280',
  },
  dropdown: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#10b981',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    overflow: 'hidden',
  },
  scrollArea: {
    maxHeight: 220,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d3748',
  },
  optionSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  optionText: {
    color: '#d1d5db',
    fontSize: 15,
  },
  optionTextSelected: {
    color: '#10b981',
    fontWeight: '600',
  },
});
