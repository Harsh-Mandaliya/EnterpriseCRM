import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';

import {
  listEvents,
  createEvent,
} from '@/api/calendar.api';

import { TextField } from '@/components/common/TextField';
import { Button } from '@/components/common/Button';

import { colors } from '@/theme/colors';

import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type {
  CalendarEvent,
  CalendarEventType,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   CONSTANTS
============================================================ */

const TYPES: CalendarEventType[] = [
  'MEETING',
  'CALL',
  'FOLLOW_UP',
  'DEADLINE',
  'OTHER',
];

/* ============================================================
   HELPERS
============================================================ */

function typeIcon(
  type: CalendarEventType,
): string {
  switch (type) {
    case 'MEETING':
      return '◷';

    case 'CALL':
      return '☎';

    case 'FOLLOW_UP':
      return '↗';

    case 'DEADLINE':
      return '!';

    case 'OTHER':
      return '•';

    default:
      return '•';
  }
}

function typeLabel(
  type: CalendarEventType,
): string {
  switch (type) {
    case 'FOLLOW_UP':
      return 'Follow up';

    case 'MEETING':
      return 'Meeting';

    case 'CALL':
      return 'Call';

    case 'DEADLINE':
      return 'Deadline';

    case 'OTHER':
      return 'Other';

    default:
      return type;
  }
}

function typeColor(
  type: CalendarEventType,
): string {
  switch (type) {
    case 'MEETING':
      return colors.primary;

    case 'CALL':
      return colors.success;

    case 'FOLLOW_UP':
      return colors.status.qualified;

    case 'DEADLINE':
      return colors.danger;

    case 'OTHER':
      return colors.textMuted;

    default:
      return colors.primary;
  }
}

function parseDateTime(value: string): Date {
  /*
   * Converts:
   * 2026-09-01 14:00
   *
   * into:
   * 2026-09-01T14:00:00
   *
   * This avoids inconsistent parsing on Android.
   */

  const normalized = value.trim().replace(' ', 'T');

  return new Date(normalized);
}

function formatDay(dateString: string): string {
  return new Date(dateString).getDate().toString();
}

function formatMonth(dateString: string): string {
  return new Date(dateString).toLocaleDateString(
    'en-US',
    {
      month: 'short',
    },
  );
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString(
    'en-IN',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function formatFullDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

/* ============================================================
   SCREEN
============================================================ */

export function CalendarScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [items, setItems] = useState<CalendarEvent[]>(
    [],
  );

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [title, setTitle] = useState('');

  const [type, setType] =
    useState<CalendarEventType>('MEETING');

  const [startAt, setStartAt] = useState('');

  const [durationMins, setDurationMins] =
    useState('30');

  const [creating, setCreating] = useState(false);

  const [formError, setFormError] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD EVENTS
  ========================================================== */

  const load = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await listEvents();

        const sorted = [...data].sort(
          (a, b) =>
            new Date(a.startAt).getTime() -
            new Date(b.startAt).getTime(),
        );

        setItems(sorted);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ??
            "Couldn't load calendar events.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => load());

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await load(false);
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     RESET FORM
  ========================================================== */

  function resetForm() {
    setTitle('');
    setType('MEETING');
    setStartAt('');
    setDurationMins('30');
    setFormError(null);
  }

  /* ==========================================================
     CLOSE MODAL
  ========================================================== */

  function closeModal() {
    if (creating) {
      return;
    }

    resetForm();
    setModalVisible(false);
  }

  /* ==========================================================
     CREATE EVENT
  ========================================================== */

/* ==========================================================
     UPCOMING EVENTS
  ========================================================== */

  const upcomingCount = useMemo(() => {
    const now = Date.now();

    return items.filter(
      item =>
        new Date(item.startAt).getTime() >= now,
    ).length;
  }, [items]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading calendar...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <View style={styles.container}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>
            SCHEDULE
          </Text>

          <Text style={styles.title}>
            Calendar
          </Text>

          <Text style={styles.subtitle}>
            Manage meetings and upcoming activities
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            ◷
          </Text>

          {upcomingCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>
                {upcomingCount > 99
                  ? '99+'
                  : upcomingCount}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Text style={styles.summaryIconText}>
            ◷
          </Text>
        </View>

        <View style={styles.summaryContent}>
          <Text style={styles.summaryLabel}>
            Upcoming events
          </Text>

          <Text style={styles.summaryValue}>
            {upcomingCount}
          </Text>
        </View>

        <Pressable
          style={styles.todayButton}
          onPress={() => {
            const today = new Date();

            const todayEvents = items.filter(
              item => {
                const date = new Date(
                  item.startAt,
                );

                return (
                  date.getDate() ===
                    today.getDate() &&
                  date.getMonth() ===
                    today.getMonth() &&
                  date.getFullYear() ===
                    today.getFullYear()
                );
              },
            );

            if (todayEvents.length === 0) {
              setError(
                "You don't have any events scheduled for today.",
              );
            }
          }}
        >
          <Text style={styles.todayText}>
            Today
          </Text>
        </Pressable>
      </View>

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error ? (
        <View style={styles.errorBanner}>
          <Text
            style={styles.errorBannerText}
            numberOfLines={2}
          >
            {error}
          </Text>

          <Pressable
            onPress={() => setError(null)}
            style={styles.errorClose}
          >
            <Text style={styles.errorCloseText}>
              ×
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* ======================================================
          EVENT LIST
      ====================================================== */}

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Upcoming schedule
              </Text>

              <Text style={styles.listCount}>
                {items.length}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ◷
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No events scheduled
            </Text>

            <Text style={styles.emptyText}>
              Add meetings, calls, follow-ups and
              deadlines to keep your business organized.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const color = typeColor(item.type);

          return (
            <View style={styles.eventCard}>
              {/* ==================================================
                  DATE
              ================================================== */}

              <View
                style={[
                  styles.dateBox,
                  {
                    backgroundColor:
                      color + '10',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    {
                      color,
                    },
                  ]}
                >
                  {formatDay(item.startAt)}
                </Text>

                <Text
                  style={[
                    styles.dateMonth,
                    {
                      color,
                    },
                  ]}
                >
                  {formatMonth(item.startAt)}
                </Text>
              </View>

              {/* ==================================================
                  CONTENT
              ================================================== */}

              <View style={styles.eventContent}>
                <View style={styles.eventTopRow}>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor:
                          color + '10',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typeBadgeText,
                        {
                          color,
                        },
                      ]}
                    >
                      {typeIcon(item.type)}{' '}
                      {typeLabel(item.type)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={styles.eventTitle}
                  numberOfLines={2}
                >
                  {item.title}
                </Text>

                <View style={styles.eventMetaRow}>
                  <Text style={styles.eventTime}>
                    {formatTime(item.startAt)}
                  </Text>

                  <View
                    style={styles.metaDot}
                  />

                  <Text style={styles.eventDate}>
                    {formatFullDate(
                      item.startAt,
                    )}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ======================================================
          FLOATING ADD BUTTON
      ====================================================== */}

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate('EventForm')}
        accessibilityRole="button"
        accessibilityLabel="Add event"
      >
        <Text style={styles.fabText}>
          +
        </Text>
      </Pressable>

      {/* ======================================================
          CREATE EVENT MODAL
      ====================================================== */}

      {/* Creation moved to its own screen (TaskForm / ProductForm). */}
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({
  /* ==========================================================
     BASE
  ========================================================== */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 30,
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 3,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },

  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
    position: 'relative',
  },

  headerIconText: {
    color: colors.textInverse,
    fontSize: 23,
    fontWeight: '800',
  },

  headerBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },

  headerBadgeText: {
    color: colors.textInverse,
    fontSize: 8,
    fontWeight: '800',
  },

  /* ==========================================================
     SUMMARY
  ========================================================== */

  summaryCard: {
    minHeight: 68,
    marginHorizontal: spacing.md,
    marginTop: 4,
    marginBottom: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: 10,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
  },

  summaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },

  summaryIconText: {
    color: colors.primary,
    fontSize: 17,
    fontWeight: '800',
  },

  summaryContent: {
    flex: 1,
    minWidth: 0,
  },

  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },

  summaryValue: {
    fontSize: 18,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '700',
    marginTop: 1,
  },

  todayButton: {
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: colors.primaryLight,
  },

  todayText: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorBanner: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.danger + '08',
    borderWidth: 1,
    borderColor: colors.danger + '25',
    flexDirection: 'row',
    alignItems: 'center',
  },

  errorBannerText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: colors.danger,
  },

  errorClose: {
    paddingLeft: 8,
  },

  errorCloseText: {
    fontSize: 19,
    color: colors.danger,
    fontWeight: '600',
  },

  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    paddingHorizontal: spacing.md,
    paddingTop: 2,
    paddingBottom: spacing.xl * 2,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 3,
    marginBottom: spacing.sm,
  },

  listTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },

  listCount: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },

  /* ==========================================================
     EVENT CARD
  ========================================================== */

  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 11,
    marginBottom: 8,
  },

  /* ==========================================================
     DATE
  ========================================================== */

  dateBox: {
    width: 48,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  dateDay: {
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '800',
  },

  dateMonth: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 1,
  },

  /* ==========================================================
     EVENT CONTENT
  ========================================================== */

  eventContent: {
    flex: 1,
    minWidth: 0,
  },

  eventTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },

  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },

  typeBadgeText: {
    fontSize: 8,
    lineHeight: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  eventTitle: {
    ...typography.bodyBold,
    color: colors.text,
    marginTop: 2,
  },

  eventMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },

  eventTime: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '700',
  },

  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 6,
  },

  eventDate: {
    fontSize: 10,
    color: colors.textMuted,
  },

  /* ==========================================================
     EMPTY
  ========================================================== */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 55,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  emptyIconText: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: '800',
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 285,
  },

  /* ==========================================================
     FAB
  ========================================================== */

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  fabText: {
    color: colors.textInverse,
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '400',
  },

  /* ==========================================================
     MODAL
  ========================================================== */

  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor:
      'rgba(15, 23, 42, 0.4)',
  },

  modalCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },

  modalEyebrow: {
    fontSize: 9,
    lineHeight: 12,
    color: colors.primary,
    fontWeight: '800',
    letterSpacing: 1,
  },

  modalTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },

  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },

  closeButtonText: {
    fontSize: 23,
    lineHeight: 25,
    color: colors.textMuted,
    fontWeight: '400',
  },

  /* ==========================================================
     TYPE SELECTOR
  ========================================================== */

  typeLabel: {
    fontSize: 12,
    lineHeight: 16,
    color: colors.text,
    fontWeight: '600',
    marginBottom: 7,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: spacing.md,
  },

  typeOption: {
    minWidth: '30%',
    flexGrow: 1,
    flexBasis: '30%',
    minHeight: 42,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  typeOptionIcon: {
    fontSize: 14,
    fontWeight: '800',
    marginRight: 5,
  },

  typeOptionText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
  },

  /* ==========================================================
     FORM ERROR
  ========================================================== */

  formErrorBox: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: colors.danger + '08',
    borderWidth: 1,
    borderColor: colors.danger + '25',
    marginBottom: spacing.md,
  },

  formErrorText: {
    fontSize: 11,
    lineHeight: 16,
    color: colors.danger,
  },

  /* ==========================================================
     BUTTONS
  ========================================================== */

  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },

  modalButton: {
    flex: 1,
  },
}));