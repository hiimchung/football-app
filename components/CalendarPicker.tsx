import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';

interface CalendarPickerProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  label?: string;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function getTodayString(): string {
  const t = new Date();
  return toDateString(t.getFullYear(), t.getMonth(), t.getDate());
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

export default function CalendarPicker({ selectedDate, onSelectDate, label }: CalendarPickerProps) {
  const today = new Date();
  const todayStr = getTodayString();
  const [open, setOpen] = useState(false);

  const initialYear = selectedDate
    ? parseInt(selectedDate.split('-')[0])
    : today.getFullYear();
  const initialMonth = selectedDate
    ? parseInt(selectedDate.split('-')[1]) - 1
    : today.getMonth();

  const [viewYear, setViewYear] = useState(initialYear);
  const [viewMonth, setViewMonth] = useState(initialMonth);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const days: { day: number; month: number; year: number; isCurrentMonth: boolean }[] = [];

    for (let i = firstDay - 1; i >= 0; i--) {
      const prevMonth = viewMonth === 0 ? 11 : viewMonth - 1;
      const prevYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      days.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true });
    }

    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const nextMonth = viewMonth === 11 ? 0 : viewMonth + 1;
      const nextYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({ day: d, month: nextMonth, year: nextYear, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth]);

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(viewYear - 1);
    } else {
      setViewMonth(viewMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(viewYear + 1);
    } else {
      setViewMonth(viewMonth + 1);
    }
  };

  const isPastDate = (year: number, month: number, day: number): boolean => {
    const dateStr = toDateString(year, month, day);
    return dateStr < todayStr;
  };

  const canGoPrev = !(viewYear === today.getFullYear() && viewMonth === today.getMonth());

  const handleSelectDate = (dateStr: string) => {
    onSelectDate(dateStr);
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
        <Calendar size={18} color="#9ca3af" />
        <Text style={[styles.triggerText, !selectedDate && styles.triggerPlaceholder]}>
          {selectedDate ? formatDisplayDate(selectedDate) : 'Select a date'}
        </Text>
        {open ? (
          <ChevronUp size={18} color="#9ca3af" />
        ) : (
          <ChevronDown size={18} color="#9ca3af" />
        )}
      </TouchableOpacity>

      {!open ? null : (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goToPrevMonth}
            style={[styles.navButton, !canGoPrev && styles.navButtonDisabled]}
            disabled={!canGoPrev}
            activeOpacity={0.6}
          >
            <ChevronLeft size={20} color={canGoPrev ? '#ffffff' : '#4b5563'} />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {MONTH_NAMES[viewMonth]} {viewYear}
          </Text>
          <TouchableOpacity onPress={goToNextMonth} style={styles.navButton} activeOpacity={0.6}>
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {DAYS_OF_WEEK.map((d) => (
            <View key={d} style={styles.weekDayCell}>
              <Text style={styles.weekDayText}>{d}</Text>
            </View>
          ))}
        </View>

        <View style={styles.daysGrid}>
          {calendarDays.map((item, idx) => {
            const dateStr = toDateString(item.year, item.month, item.day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const isPast = isPastDate(item.year, item.month, item.day);
            const isDisabled = isPast || !item.isCurrentMonth;

            return (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.dayCell,
                  isSelected && styles.dayCellSelected,
                  isToday && !isSelected && styles.dayCellToday,
                ]}
                onPress={() => {
                  if (!isDisabled) handleSelectDate(dateStr);
                }}
                disabled={isDisabled}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.dayText,
                    !item.isCurrentMonth && styles.dayTextOutside,
                    isPast && item.isCurrentMonth && styles.dayTextPast,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}
                >
                  {item.day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
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
  container: {
    backgroundColor: '#1f2937',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#10b981',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  monthTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekDayText: {
    color: '#6b7280',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  dayCellSelected: {
    backgroundColor: '#10b981',
  },
  dayCellToday: {
    borderWidth: 1,
    borderColor: '#10b981',
  },
  dayText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextOutside: {
    color: '#374151',
  },
  dayTextPast: {
    color: '#4b5563',
  },
  dayTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: '#10b981',
    fontWeight: '700',
  },
});
