import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { PressableScale } from '@/components/motion/PressableScale';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import { addDays, formatShortDate, parseDateInput, relativeDay, toDateInput } from '@/utils/dates';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/* ============================================================
   FIELD SHELL — label, required mark, hint / error
============================================================ */

export function FieldShell({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

/* ============================================================
   INPUT — icon, prefix/suffix (no focus ring)
============================================================ */

export function InputField({
  label,
  icon,
  required,
  hint,
  error,
  prefix,
  suffix,
  multiline,
  ...props
}: TextInputProps & {
  label: string;
  icon?: IconName;
  required?: boolean;
  hint?: string;
  error?: string;
  prefix?: string;
  suffix?: React.ReactNode;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  // No focus highlight (v1.4.2): the field looks the same while typing;
  // only an error turns the border red.
  const borderColor = error ? theme.colors.danger : theme.colors.border;

  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <Animated.View style={[styles.inputWrap, multiline && styles.inputWrapMultiline, { borderColor }]}>
        {icon ? <Ionicons name={icon} size={18} color={error ? theme.colors.danger : theme.colors.textMuted} /> : null}
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          {...props}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          style={[styles.input, multiline && styles.inputMultiline]}
          placeholderTextColor={theme.colors.textFaint}
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          onFocus={props.onFocus}
          onBlur={props.onBlur}
        />
        {suffix}
      </Animated.View>
    </FieldShell>
  );
}

/* ============================================================
   CHOICE CHIPS — single or multi select
============================================================ */

export interface ChoiceOption<V extends string> {
  value: V;
  label: string;
  icon?: IconName;
  color?: string;
  description?: string;
}

export function ChoiceField<V extends string>({
  label,
  options,
  value,
  onChange,
  required,
  hint,
  error,
  columns,
}: {
  label: string;
  options: ChoiceOption<V>[];
  value: V | null;
  onChange: (value: V) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  /** Show as an even grid of cards instead of wrapping chips. */
  columns?: number;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map(option => {
          const selected = option.value === value;
          const tint = option.color ?? theme.colors.primary;
          return (
            <PressableScale
              key={option.value}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={option.label}
              accessibilityHint={option.description}
              style={[
                styles.chip,
                columns ? { width: `${100 / columns - 3}%` as `${number}%` } : null,
                selected && { borderColor: tint, backgroundColor: theme.isDark ? theme.colors.surfaceAlt : `${tint}14` },
              ]}
            >
              {option.icon ? <Ionicons name={option.icon} size={16} color={selected ? tint : theme.colors.textMuted} /> : null}
              <Text style={[styles.chipText, selected && { color: tint, fontWeight: '800' }]} numberOfLines={1}>
                {option.label}
              </Text>
            </PressableScale>
          );
        })}
      </View>
    </FieldShell>
  );
}

/* ============================================================
   PICKER — searchable bottom sheet (users, customers, invoices)
============================================================ */

export interface PickerItem {
  id: string;
  title: string;
  subtitle?: string;
}

export function PickerField({
  label,
  placeholder = 'Select…',
  items,
  value,
  onChange,
  required,
  hint,
  error,
  icon = 'search',
  allowClear,
  disabled,
  loading,
}: {
  label: string;
  placeholder?: string;
  items: PickerItem[];
  value: string | null;
  onChange: (id: string | null) => void;
  required?: boolean;
  hint?: string;
  error?: string;
  icon?: IconName;
  allowClear?: boolean;
  disabled?: boolean;
  loading?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = items.find(item => item.id === value) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item => `${item.title} ${item.subtitle ?? ''}`.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <FieldShell label={label} required={required} hint={hint} error={error}>
      <PressableScale
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.title ?? 'not selected'}`}
        style={[styles.inputWrap, error ? { borderColor: theme.colors.danger } : null]}
      >
        <Ionicons name={icon} size={18} color={theme.colors.textMuted} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.pickerValue, !selected && { color: theme.colors.textFaint }]} numberOfLines={1}>
            {loading ? 'Loading…' : selected?.title ?? placeholder}
          </Text>
          {selected?.subtitle ? (
            <Text style={styles.pickerSub} numberOfLines={1}>
              {selected.subtitle}
            </Text>
          ) : null}
        </View>
        {allowClear && selected && !disabled ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={18} color={theme.colors.textFaint} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={theme.colors.textMuted} />
        )}
      </PressableScale>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <View style={[styles.inputWrap, { marginBottom: 10 }]}>
            <Ionicons name="search" size={18} color={theme.colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search"
              placeholderTextColor={theme.colors.textFaint}
              style={styles.input}
              autoFocus
              accessibilityLabel={`Search ${label}`}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: 380 }}
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
            renderItem={({ item }) => {
              const isSelected = item.id === value;
              return (
                <Pressable
                  onPress={() => {
                    onChange(item.id);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={({ pressed }) => [styles.option, pressed && { backgroundColor: theme.colors.surfaceAlt }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.title.slice(0, 1).toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.optionTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.subtitle ? (
                      <Text style={styles.optionSub} numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            }}
          />
        </View>
      </Modal>
    </FieldShell>
  );
}

/* ============================================================
   DATE — quick choices + exact date (YYYY-MM-DD) and time
============================================================ */

export function DateField({
  label,
  value,
  onChange,
  withTime,
  quickDays = [0, 1, 3, 7, 30],
  required,
  hint,
  error,
  allowClear,
}: {
  label: string;
  /** Local date, or null when empty. */
  value: Date | null;
  onChange: (value: Date | null) => void;
  withTime?: boolean;
  quickDays?: number[];
  required?: boolean;
  hint?: string;
  error?: string;
  allowClear?: boolean;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [dateText, setDateText] = useState(value ? toDateInput(value) : '');
  const [timeText, setTimeText] = useState(
    value ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}` : '10:00',
  );
  const [localError, setLocalError] = useState<string | undefined>();

  useEffect(() => {
    if (value) setDateText(toDateInput(value));
  }, [value]);

  const commit = (date: string, time: string) => {
    if (!date.trim()) {
      setLocalError(undefined);
      onChange(null);
      return;
    }
    const parsed = parseDateInput(date, withTime ? time : '09:00');
    if (!parsed) {
      setLocalError(withTime ? 'Use YYYY-MM-DD and HH:MM' : 'Use YYYY-MM-DD');
      return;
    }
    setLocalError(undefined);
    onChange(parsed);
  };

  const pickQuick = (days: number) => {
    const base = addDays(new Date(), days);
    const date = toDateInput(base);
    setDateText(date);
    commit(date, timeText);
  };

  return (
    <FieldShell
      label={label}
      required={required}
      error={error ?? localError}
      hint={value ? `${formatShortDate(value)} · ${relativeDay(value)}` : hint}
    >
      <View style={styles.chips}>
        {quickDays.map(days => {
          const active = value ? toDateInput(value) === toDateInput(addDays(new Date(), days)) : false;
          return (
            <PressableScale
              key={days}
              onPress={() => pickQuick(days)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.chip, active && { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight }]}
            >
              <Text style={[styles.chipText, active && { color: theme.colors.primary, fontWeight: '800' }]}>
                {days === 0
                  ? 'Today'
                  : days === 1
                    ? 'Tomorrow'
                    : days === -1
                      ? 'Yesterday'
                      : days === 7
                        ? 'Next week'
                        : days === 30
                          ? 'In a month'
                          : days < 0
                            ? `${-days} days ago`
                            : `+${days} days`}
              </Text>
            </PressableScale>
          );
        })}
        {allowClear && value ? (
          <PressableScale
            onPress={() => {
              setDateText('');
              commit('', timeText);
            }}
            accessibilityRole="button"
            accessibilityLabel={`Clear ${label}`}
            style={styles.chip}
          >
            <Text style={styles.chipText}>Clear</Text>
          </PressableScale>
        ) : null}
      </View>

      <View style={[styles.row, { marginTop: 8 }]}>
        <View style={[styles.inputWrap, { flex: 2 }]}>
          <Ionicons name="calendar-outline" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={dateText}
            onChangeText={text => setDateText(text)}
            onBlur={() => commit(dateText, timeText)}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.colors.textFaint}
            style={styles.input}
            maxLength={10}
            accessibilityLabel={`${label} date`}
          />
        </View>
        {withTime ? (
          <View style={[styles.inputWrap, { flex: 1 }]}>
            <Ionicons name="time-outline" size={18} color={theme.colors.textMuted} />
            <TextInput
              value={timeText}
              onChangeText={setTimeText}
              onBlur={() => commit(dateText, timeText)}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.textFaint}
              style={styles.input}
              maxLength={5}
              accessibilityLabel={`${label} time`}
            />
          </View>
        ) : null}
      </View>
    </FieldShell>
  );
}

/* ============================================================
   STEPPER — integer/decimal quantity with − / +
============================================================ */

export function StepperField({
  label,
  value,
  onChange,
  min = 0,
  step = 1,
  error,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
  error?: string;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  return (
    <FieldShell label={label} error={error}>
      <View style={styles.stepper}>
        <PressableScale
          onPress={() => onChange(Math.max(min, +(value - step).toFixed(2)))}
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          style={styles.stepButton}
        >
          <Ionicons name="remove" size={18} color={theme.colors.primary} />
        </PressableScale>
        <TextInput
          value={text}
          onChangeText={setText}
          onBlur={() => {
            const parsed = Number(text.replace(',', '.'));
            onChange(Number.isFinite(parsed) && parsed >= min ? parsed : value);
          }}
          keyboardType="decimal-pad"
          style={styles.stepInput}
          accessibilityLabel={label}
        />
        <PressableScale
          onPress={() => onChange(+(value + step).toFixed(2))}
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          style={styles.stepButton}
        >
          <Ionicons name="add" size={18} color={theme.colors.primary} />
        </PressableScale>
      </View>
    </FieldShell>
  );
}

/* ============================================================
   SWITCH ROW
============================================================ */

export function SwitchField({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.switchRow}>
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={styles.switchLabel}>{label}</Text>
        {description ? <Text style={styles.hint}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
        accessibilityLabel={label}
      />
    </View>
  );
}

/** Read-only info line, e.g. "Assigned to you" for reps. */
export function InfoRow({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={theme.colors.info} />
      <Text style={styles.infoText}>{text}</Text>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    field: { marginBottom: theme.spacing.md },
    label: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 6 },
    required: { color: theme.colors.danger },
    hint: { color: theme.colors.textFaint, fontSize: 12, marginTop: 5, lineHeight: 16 },
    error: { color: theme.colors.danger, fontSize: 12, marginTop: 5, fontWeight: '600' },
    row: { flexDirection: 'row', gap: 8 },
    inputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      minHeight: 50,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      paddingHorizontal: 14,
      backgroundColor: theme.colors.surface,
    },
    inputWrapMultiline: { alignItems: 'flex-start', paddingTop: 12 },
    input: { flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: 10, minWidth: 0 },
    inputMultiline: { minHeight: 90, paddingTop: 0 },
    prefix: { color: theme.colors.textMuted, fontSize: 16, fontWeight: '700' },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      minHeight: 40,
      borderRadius: 999,
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '600' },
    pickerValue: { color: theme.colors.text, fontSize: 15 },
    pickerSub: { color: theme.colors.textMuted, fontSize: 12, marginTop: 1 },
    backdrop: { flex: 1, backgroundColor: theme.colors.overlay },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      padding: theme.spacing.md,
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: theme.colors.borderStrong,
      marginBottom: 12,
    },
    sheetTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '800', marginBottom: 12 },
    option: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 6, borderRadius: 12 },
    avatar: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    avatarText: { color: theme.colors.primary, fontWeight: '800' },
    optionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    optionSub: { color: theme.colors.textMuted, fontSize: 12 },
    empty: { color: theme.colors.textMuted, textAlign: 'center', padding: 20 },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    stepButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.primaryLight,
    },
    stepInput: {
      minWidth: 70,
      height: 44,
      textAlign: 'center',
      borderWidth: 1.5,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: theme.spacing.sm },
    switchLabel: { color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: theme.colors.infoSoft,
      borderRadius: theme.radius.md,
      padding: 12,
      marginBottom: theme.spacing.md,
    },
    infoText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13 },
  });
}
