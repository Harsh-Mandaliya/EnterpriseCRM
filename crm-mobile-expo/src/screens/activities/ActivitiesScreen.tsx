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
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import {
  useAppDispatch,
  useAppSelector,
} from '@/hooks/useRedux';

import {
  fetchActivities,
  markActivityComplete,
  addActivity,
} from '@/redux/slices/activitiesSlice';

import {
  updateActivity,
  deleteActivity,
} from '@/api/activities.api';

import { colors } from '@/theme/colors';

import type {
  Activity,
  ActivityType,
} from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   TYPES
============================================================ */

type StatusFilter =
  | 'ALL'
  | 'PENDING'
  | 'OVERDUE'
  | 'COMPLETED';

type TypeFilter =
  | 'ALL'
  | ActivityType;

/* ============================================================
   CONSTANTS
============================================================ */

const ACTIVITY_TYPES: ActivityType[] = [
  'TASK',
  'CALL',
  'EMAIL',
  'MEETING',
  'NOTE',
];

/* ============================================================
   HELPERS
============================================================ */

function getTypeLabel(
  type: ActivityType,
): string {
  switch (type) {
    case 'TASK':
      return 'Task';

    case 'CALL':
      return 'Call';

    case 'EMAIL':
      return 'Email';

    case 'MEETING':
      return 'Meeting';

    case 'NOTE':
      return 'Note';

    default:
      return type;
  }
}

function getTypeIcon(
  type: ActivityType,
): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'TASK':
      return 'checkbox-outline';

    case 'CALL':
      return 'call-outline';

    case 'EMAIL':
      return 'mail-outline';

    case 'MEETING':
      return 'calendar-outline';

    case 'NOTE':
      return 'document-text-outline';

    default:
      return 'ellipse-outline';
  }
}

function getTypeColor(
  type: ActivityType,
): string {
  switch (type) {
    case 'TASK':
      return colors.primary;

    case 'CALL':
      return colors.success;

    case 'EMAIL':
      return colors.status.qualified;

    case 'MEETING':
      return colors.status.contacted;

    case 'NOTE':
      return colors.textMuted;

    default:
      return colors.primary;
  }
}

function isCompleted(
  activity: Activity,
): boolean {
  return activity.status === 'COMPLETED';
}

function isOverdue(
  activity: Activity,
): boolean {
  if (activity.status !== 'PENDING') {
    return false;
  }

  if (!activity.dueAt) {
    return false;
  }

  const timestamp = new Date(
    activity.dueAt,
  ).getTime();

  if (Number.isNaN(timestamp)) {
    return false;
  }

  return timestamp < Date.now();
}

/*
 * IMPORTANT:
 * dueAt in your project is:
 * string | null
 *
 * Therefore these helpers accept null.
 */

function formatDate(
  dateString: string | null | undefined,
): string {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString(
    'en-IN',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  );
}

function formatTime(
  dateString: string | null | undefined,
): string {
  if (!dateString) {
    return '';
  }

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleTimeString(
    'en-IN',
    {
      hour: 'numeric',
      minute: '2-digit',
    },
  );
}

function getDueText(
  activity: Activity,
): string {
  if (isOverdue(activity)) {
    return `Overdue · ${formatDate(
      activity.dueAt,
    )}`;
  }

  if (activity.status !== 'PENDING') {
    return 'Completed';
  }

  if (!activity.dueAt) {
    return 'No due date';
  }

  const date = formatDate(
    activity.dueAt,
  );

  const time = formatTime(
    activity.dueAt,
  );

  if (time) {
    return `${date} · ${time}`;
  }

  return date;
}

/* ============================================================
   FILTER CHIP
============================================================ */

function FilterChip({
  label,
  count,
  active,
  icon,
  onPress,
  danger,
}: {
  label: string;
  count?: number;
  active: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        active &&
          styles.filterChipActive,
        danger &&
          !active &&
          styles.filterChipDanger,
        pressed &&
          styles.pressed,
      ]}
    >
      <Ionicons
        name={icon}
        size={16}
        color={
          active
            ? colors.textInverse
            : danger
              ? colors.danger
              : colors.textMuted
        }
      />

      <Text
        numberOfLines={1}
        style={[
          styles.filterChipText,
          active &&
            styles.filterChipTextActive,
          danger &&
            !active &&
            styles.filterChipTextDanger,
        ]}
      >
        {label}
      </Text>

      {typeof count === 'number' && (
        <View
          style={[
            styles.filterCount,
            active &&
              styles.filterCountActive,
          ]}
        >
          <Text
            style={[
              styles.filterCountText,
              active &&
                styles.filterCountTextActive,
            ]}
          >
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/* ============================================================
   STAT CARD
============================================================ */

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.statCard}>
      <View
        style={[
          styles.statIcon,
          {
            backgroundColor:
              `${color}12`,
          },
        ]}
      >
        <Ionicons
          name={icon}
          size={20}
          color={color}
        />
      </View>

      <View
        style={styles.statContent}
      >
        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text
          style={[
            styles.statValue,
            {
              color,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

/* ============================================================
   ACTIVITY CARD
============================================================ */

function ActivityCard({
  activity,
  completing,
  canManage,
  onComplete,
  onEdit,
  onDelete,
}: {
  activity: Activity;
  completing: boolean;
  canManage: boolean;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const completed =
    isCompleted(activity);

  const overdue =
    isOverdue(activity);

  const typeColor =
    getTypeColor(activity.type);

  return (
    <View
      style={[
        styles.activityCard,
        completed &&
          styles.activityCardCompleted,
        overdue &&
          styles.activityCardOverdue,
      ]}
    >
      <View
        style={styles.activityCardTop}
      >
        {canManage && (
          <View style={styles.activityActions}>
            <Pressable
              onPress={onEdit}
              hitSlop={6}
              style={({ pressed }) => [
                styles.activityActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="create-outline"
                size={17}
                color={colors.primary}
              />
            </Pressable>

            <Pressable
              onPress={onDelete}
              hitSlop={6}
              style={({ pressed }) => [
                styles.activityActionButton,
                styles.deleteActionButton,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={colors.danger}
              />
            </Pressable>
          </View>
        )}

        {/* CHECKBOX */}

        <Pressable
          disabled={
            completed ||
            completing
          }
          onPress={onComplete}
          style={({ pressed }) => [
            styles.checkbox,
            completed &&
              styles.checkboxCompleted,
            overdue &&
              styles.checkboxOverdue,
            pressed &&
              styles.pressed,
          ]}
        >
          {completing ? (
            <ActivityIndicator
              size="small"
              color={colors.primary}
            />
          ) : completed ? (
            <Ionicons
              name="checkmark"
              size={18}
              color={
                colors.textInverse
              }
            />
          ) : null}
        </Pressable>

        {/* CONTENT */}

        <View
          style={styles.activityMain}
        >
          {/* META */}

          <View
            style={styles.activityMetaRow}
          >
            <View
              style={[
                styles.typeBadge,
                {
                  backgroundColor:
                    `${typeColor}12`,
                },
              ]}
            >
              <Ionicons
                name={getTypeIcon(
                  activity.type,
                )}
                size={14}
                color={typeColor}
              />

              <Text
                style={[
                  styles.typeBadgeText,
                  {
                    color: typeColor,
                  },
                ]}
              >
                {getTypeLabel(
                  activity.type,
                ).toUpperCase()}
              </Text>
            </View>

            {overdue && (
              <View
                style={
                  styles.overdueBadge
                }
              >
                <Ionicons
                  name="alert-circle"
                  size={13}
                  color={
                    colors.danger
                  }
                />

                <Text
                  style={
                    styles.overdueBadgeText
                  }
                >
                  OVERDUE
                </Text>
              </View>
            )}
          </View>

          {/* SUMMARY */}

          <Text
            numberOfLines={3}
            style={[
              styles.activityTitle,
              completed &&
                styles.activityTitleCompleted,
            ]}
          >
            {activity.summary}
          </Text>

          {completed && (
            <View style={styles.completedInfo}>
              <View style={styles.completedInfoRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={15}
                  color={colors.textMuted}
                />
                <Text style={styles.completedInfoText}>
                  Completed by: {String(
                    (activity as Activity & {
                      completedBy?: { name?: string } | null;
                    }).completedBy?.name ?? 'Current user'
                  )}
                </Text>
              </View>

              {activity.completedAt && (
                <View style={styles.completedInfoRow}>
                  <Ionicons
                    name="time-outline"
                    size={15}
                    color={colors.textMuted}
                  />
                  <Text style={styles.completedInfoText}>
                    Completed at: {formatDate(activity.completedAt)} · {formatTime(activity.completedAt)}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* FOOTER */}

          <View
            style={
              styles.activityFooter
            }
          >
            <View
              style={styles.dueRow}
            >
              <Ionicons
                name={
                  overdue
                    ? 'alert-circle-outline'
                    : completed
                      ? 'checkmark-circle-outline'
                      : 'calendar-outline'
                }
                size={16}
                color={
                  overdue
                    ? colors.danger
                    : completed
                      ? colors.success
                      : colors.textMuted
                }
              />

              <Text
                style={[
                  styles.dueText,
                  overdue &&
                    styles.dueTextOverdue,
                  completed &&
                    styles.dueTextCompleted,
                ]}
                numberOfLines={1}
              >
                {getDueText(activity)}
              </Text>
            </View>

            <Ionicons
              name={
                completed
                  ? 'checkmark-circle'
                  : 'chevron-forward'
              }
              size={20}
              color={
                completed
                  ? colors.success
                  : colors.primary
              }
            />
          </View>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   EMPTY STATE
============================================================ */

function EmptyState({
  searching,
  onCreate,
}: {
  searching: boolean;
  onCreate: () => void;
}) {
  return (
    <View
      style={styles.emptyState}
    >
      <View
        style={styles.emptyIcon}
      >
        <Ionicons
          name={
            searching
              ? 'search-outline'
              : 'checkmark-done-outline'
          }
          size={34}
          color={colors.primary}
        />
      </View>

      <Text
        style={styles.emptyTitle}
      >
        {searching
          ? 'No activities found'
          : 'No activities yet'}
      </Text>

      <Text
        style={
          styles.emptyDescription
        }
      >
        {searching
          ? 'Try changing your search or filters.'
          : 'Create your first activity to start managing your workflow.'}
      </Text>

      {!searching && (
        <Pressable
          onPress={onCreate}
          style={({ pressed }) => [
            styles.emptyButton,
            pressed &&
              styles.pressed,
          ]}
        >
          <Ionicons
            name="add"
            size={18}
            color={
              colors.textInverse
            }
          />

          <Text
            style={
              styles.emptyButtonText
            }
          >
            Create activity
          </Text>
        </Pressable>
      )}
    </View>
  );
}

/* ============================================================
   SCREEN
============================================================ */

export function ActivitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const dispatch =
    useAppDispatch();

  const {
    items,
    status,
    error,
  } = useAppSelector(
    state => state.activities,
  );

  const { width } =
    useWindowDimensions();

const userRole = String(
  useAppSelector(
    state => state.auth.user?.role ?? '',
  ),
).toUpperCase();

const canManageActivities =
  userRole === 'OWNER' ||
  userRole === 'ADMIN';

  /* ==========================================================
     RESPONSIVE
  ========================================================== */

  const isWeb = width >= 900;

  const isTablet = width >= 600;

  const horizontalPadding = isWeb
    ? 32
    : isTablet
      ? 24
      : 18;

  const contentMaxWidth = isWeb
    ? 1180
    : 900;

  /* ==========================================================
     LOCAL STATE
  ========================================================== */

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState<StatusFilter>(
    'ALL',
  );

  const [
    typeFilter,
    setTypeFilter,
  ] = useState<TypeFilter>(
    'ALL',
  );

  const [
    filterModalVisible,
    setFilterModalVisible,
  ] = useState(false);

  const [
    createModalVisible,
    setCreateModalVisible,
  ] = useState(false);

  const [
    summary,
    setSummary,
  ] = useState('');

  const [
    activityType,
    setActivityType,
  ] = useState<ActivityType>(
    'TASK',
  );

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    completingId,
    setCompletingId,
  ] = useState<string | null>(
    null,
  );

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState<string | null>(
    null,
  );

  const [editModalVisible, setEditModalVisible] =
    useState(false);

  const [editingActivity, setEditingActivity] =
    useState<Activity | null>(null);

  const [editSummary, setEditSummary] =
    useState('');

  const [editType, setEditType] =
    useState<ActivityType>('TASK');

  const [savingEdit, setSavingEdit] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  /* ==========================================================
     LOAD
  ========================================================== */

  const load =
    useCallback(async () => {
      await dispatch(
        fetchActivities(undefined),
      );
    }, [dispatch]);

  useEffect(() => {
    load();
  }, [load]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => load());

  /* ==========================================================
     COUNTS
  ========================================================== */

  const totalCount =
    items.length;

  const pendingCount =
    useMemo(
      () =>
        items.filter(
          item =>
            item.status ===
            'PENDING',
        ).length,
      [items],
    );

  const completedCount =
    useMemo(
      () =>
        items.filter(
          item =>
            item.status ===
            'COMPLETED',
        ).length,
      [items],
    );

  const overdueCount =
    useMemo(
      () =>
        items.filter(
          item =>
            isOverdue(item),
        ).length,
      [items],
    );

  /* ==========================================================
     TYPE COUNTS
  ========================================================== */

  const typeCounts =
    useMemo(() => {
      return ACTIVITY_TYPES.reduce(
        (
          accumulator,
          currentType,
        ) => {
          accumulator[
            currentType
          ] = items.filter(
            item =>
              item.type ===
              currentType,
          ).length;

          return accumulator;
        },
        {} as Record<
          ActivityType,
          number
        >,
      );
    }, [items]);

  /* ==========================================================
     FILTER
  ========================================================== */

  const filteredItems =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return items
        .filter(activity => {
          if (
            statusFilter ===
            'PENDING'
          ) {
            return (
              activity.status ===
              'PENDING'
            );
          }

          if (
            statusFilter ===
            'COMPLETED'
          ) {
            return isCompleted(
              activity,
            );
          }

          if (
            statusFilter ===
            'OVERDUE'
          ) {
            return isOverdue(
              activity,
            );
          }

          return true;
        })
        .filter(activity => {
          if (
            typeFilter ===
            'ALL'
          ) {
            return true;
          }

          return (
            activity.type ===
            typeFilter
          );
        })
        .filter(activity => {
          if (!query) {
            return true;
          }

          return (
            activity.summary
              ?.toLowerCase()
              .includes(query) ||
            activity.type
              ?.toLowerCase()
              .includes(query)
          );
        })
        .sort((a, b) => {
          const aOverdue =
            isOverdue(a);

          const bOverdue =
            isOverdue(b);

          if (
            aOverdue &&
            !bOverdue
          ) {
            return -1;
          }

          if (
            !aOverdue &&
            bOverdue
          ) {
            return 1;
          }

          if (
            a.status ===
              'PENDING' &&
            b.status !==
              'PENDING'
          ) {
            return -1;
          }

          if (
            a.status !==
              'PENDING' &&
            b.status ===
              'PENDING'
          ) {
            return 1;
          }

          return 0;
        });
    }, [
      items,
      search,
      statusFilter,
      typeFilter,
    ]);

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh =
    useCallback(async () => {
      setRefreshing(true);

      try {
        await load();
      } finally {
        setRefreshing(false);
      }
    }, [load]);

  /* ==========================================================
     COMPLETE
  ========================================================== */

  const handleComplete =
    useCallback(
      async (id: string) => {
        if (completingId) {
          return;
        }

        setCompletingId(id);

        try {
          await dispatch(
            markActivityComplete(
              id,
            ),
          ).unwrap();
        } finally {
          setCompletingId(null);
        }
      },
      [
        completingId,
        dispatch,
      ],
    );

  /* ==========================================================
     EDIT / DELETE
  ========================================================== */

  const openEditModal = useCallback((activity: Activity) => {
    setEditingActivity(activity);
    setEditSummary(activity.summary ?? '');
    setEditType(activity.type);
    setFormError(null);
    setEditModalVisible(true);
  }, []);

  const closeEditModal = useCallback(() => {
    if (savingEdit) return;
    setEditModalVisible(false);
    setEditingActivity(null);
    setEditSummary('');
    setEditType('TASK');
    setFormError(null);
  }, [savingEdit]);

  const handleSaveEdit = useCallback(async () => {
    if (!editingActivity) return;

    const trimmed = editSummary.trim();

    if (trimmed.length < 2) {
      setFormError('Enter at least 2 characters.');
      return;
    }

    setSavingEdit(true);
    setFormError(null);

    try {
      await updateActivity(String(editingActivity.id), {
        summary: trimmed,
        type: editType,
      });

      closeEditModal();
      await load();
    } catch (err: any) {
      setFormError(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          err?.message ??
          "Couldn't update the activity.",
      );
    } finally {
      setSavingEdit(false);
    }
  }, [
    editingActivity,
    editSummary,
    editType,
    closeEditModal,
    load,
  ]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (deletingId) return;

      const confirmed =
        Platform.OS === 'web'
          ? window.confirm(
              'Delete this activity? This action cannot be undone.',
            )
          : true;

      if (!confirmed) return;

      setDeletingId(id);

      try {
        await deleteActivity(id);
        await load();
      } catch (err: any) {
        console.error(
          'Delete activity error:',
          err?.response?.data ?? err,
        );
      } finally {
        setDeletingId(null);
      }
    },
    [deletingId, load],
  );

  /* ==========================================================
     RESET CREATE FORM
  ========================================================== */

  const resetCreateForm =
    useCallback(() => {
      setSummary('');
      setActivityType(
        'TASK',
      );
      setFormError(null);
    }, []);

  /* ==========================================================
     CLOSE CREATE MODAL
  ========================================================== */


  /* ==========================================================
     CREATE ACTIVITY
  ========================================================== */


  /* ==========================================================
     INITIAL LOADING
  ========================================================== */

  if (
    status === 'loading' &&
    items.length === 0
  ) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <View
          style={
            styles.loadingLogo
          }
        >
          <Ionicons
            name="checkmark-done"
            size={30}
            color={
              colors.primary
            }
          />
        </View>

        <Text
          style={
            styles.loadingTitle
          }
        >
          Activities
        </Text>

        <Text
          style={
            styles.loadingSubtitle
          }
        >
          Loading your workflow...
        </Text>

        <ActivityIndicator
          size="small"
          color={
            colors.primary
          }
          style={{
            marginTop: 20,
          }}
        />
      </View>
    );
  }

  /* ==========================================================
     MAIN UI
  ========================================================== */

  return (
    <View
      style={styles.container}
    >
      <FlatList
        data={filteredItems}
        keyExtractor={item =>
          String(item.id)
        }
        showsVerticalScrollIndicator={
          false
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingHorizontal:
              horizontalPadding,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={
              handleRefresh
            }
            tintColor={
              colors.primary
            }
            colors={[
              colors.primary,
            ]}
          />
        }
        ListHeaderComponent={
          <View
            style={[
              styles.content,
              {
                maxWidth:
                  contentMaxWidth,
              },
            ]}
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <View
              style={
                styles.topHeader
              }
            >
              <View
                style={
                  styles.headerLeft
                }
              >
                <View
                  style={
                    styles.headerIcon
                  }
                >
                  <Ionicons
                    name="checkmark-done"
                    size={21}
                    color={
                      colors.textInverse
                    }
                  />
                </View>

                <View>
                  <Text
                    style={
                      styles.headerTitle
                    }
                  >
                    Activities
                  </Text>

                  <Text
                    style={
                      styles.headerSubtitle
                    }
                  >
                    Manage your daily
                    workflow
                  </Text>
                </View>
              </View>

              <Pressable
                onPress={() =>
                  navigation.navigate('TaskForm')
                }
                style={({ pressed }) => [
                  styles.headerAddButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Ionicons
                  name="add"
                  size={22}
                  color={
                    colors.textInverse
                  }
                />
              </Pressable>
            </View>

            {/* ==================================================
                HERO
            ================================================== */}

            <View
              style={styles.hero}
            >
              <Text
                style={
                  styles.eyebrow
                }
              >
                WORKFLOW
              </Text>

              <Text
                style={
                  styles.pageTitle
                }
              >
                Stay on top of every
                follow-up.
              </Text>

              <Text
                style={
                  styles.pageSubtitle
                }
              >
                Manage tasks, calls,
                emails and meetings
                from one place.
              </Text>
            </View>

            {/* ==================================================
                STATS
            ================================================== */}

            <View
              style={
                styles.statsGrid
              }
            >
              <View
                style={
                  styles.statWrapperLarge
                }
              >
                <StatCard
                  label="Total"
                  value={
                    totalCount
                  }
                  icon="layers-outline"
                  color={
                    colors.primary
                  }
                />
              </View>

              <View
                style={
                  styles.statWrapper
                }
              >
                <StatCard
                  label="Pending"
                  value={
                    pendingCount
                  }
                  icon="time-outline"
                  color={
                    colors.primary
                  }
                />
              </View>

              <View
                style={
                  styles.statWrapper
                }
              >
                <StatCard
                  label="Overdue"
                  value={
                    overdueCount
                  }
                  icon="alert-circle-outline"
                  color={
                    overdueCount >
                    0
                      ? colors.danger
                      : colors.textMuted
                  }
                />
              </View>

              <View
                style={
                  styles.statWrapper
                }
              >
                <StatCard
                  label="Done"
                  value={
                    completedCount
                  }
                  icon="checkmark-circle-outline"
                  color={
                    colors.success
                  }
                />
              </View>
            </View>

            {/* ==================================================
                SEARCH
            ================================================== */}

            <View
              style={
                styles.searchContainer
              }
            >
              <Ionicons
                name="search-outline"
                size={20}
                color={
                  colors.textMuted
                }
              />

              <TextInput
                value={search}
                onChangeText={
                  setSearch
                }
                placeholder="Search activities..."
                placeholderTextColor={
                  colors.textMuted
                }
                style={
                  styles.searchInput
                }
                returnKeyType="search"
              />

              {search.length >
                0 && (
                <Pressable
                  onPress={() =>
                    setSearch('')
                  }
                >
                  <Ionicons
                    name="close-circle"
                    size={20}
                    color={
                      colors.textMuted
                    }
                  />
                </Pressable>
              )}
            </View>

            {/* ==================================================
                STATUS FILTERS
            ================================================== */}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
              contentContainerStyle={
                styles.filterRow
              }
            >
              <FilterChip
                label="All"
                count={
                  totalCount
                }
                icon="grid-outline"
                active={
                  statusFilter ===
                  'ALL'
                }
                onPress={() =>
                  setStatusFilter(
                    'ALL',
                  )
                }
              />

              <FilterChip
                label="Pending"
                count={
                  pendingCount
                }
                icon="time-outline"
                active={
                  statusFilter ===
                  'PENDING'
                }
                onPress={() =>
                  setStatusFilter(
                    'PENDING',
                  )
                }
              />

              <FilterChip
                label="Overdue"
                count={
                  overdueCount
                }
                icon="alert-circle-outline"
                danger
                active={
                  statusFilter ===
                  'OVERDUE'
                }
                onPress={() =>
                  setStatusFilter(
                    'OVERDUE',
                  )
                }
              />

              <FilterChip
                label="Completed"
                count={
                  completedCount
                }
                icon="checkmark-circle-outline"
                active={
                  statusFilter ===
                  'COMPLETED'
                }
                onPress={() =>
                  setStatusFilter(
                    'COMPLETED',
                  )
                }
              />
            </ScrollView>

            {/* ==================================================
                LIST HEADER
            ================================================== */}

            <View
              style={
                styles.listHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.listTitle
                  }
                >
                  Activity list
                </Text>

                <Text
                  style={
                    styles.listSubtitle
                  }
                >
                  {filteredItems.length}{' '}
                  {filteredItems.length ===
                  1
                    ? 'activity'
                    : 'activities'}
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setFilterModalVisible(
                    true,
                  )
                }
                style={({ pressed }) => [
                  styles.filterButton,
                  pressed &&
                    styles.pressed,
                ]}
              >
                <Ionicons
                  name="options-outline"
                  size={19}
                  color={
                    colors.text
                  }
                />

                {(typeFilter !==
                  'ALL' ||
                  statusFilter !==
                    'ALL') && (
                  <View
                    style={
                      styles.filterDot
                    }
                  />
                )}
              </Pressable>
            </View>

            {/* ==================================================
                ERROR
            ================================================== */}

            {error && (
              <View
                style={
                  styles.errorBanner
                }
              >
                <Ionicons
                  name="alert-circle"
                  size={20}
                  color={
                    colors.danger
                  }
                />

                <View
                  style={
                    styles.errorContent
                  }
                >
                  <Text
                    style={
                      styles.errorTitle
                    }
                  >
                    Couldn't load activities
                  </Text>

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {String(error)}
                  </Text>
                </View>

                <Pressable
                  onPress={load}
                >
                  <Text
                    style={
                      styles.retryText
                    }
                  >
                    Retry
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.content,
              {
                maxWidth:
                  contentMaxWidth,
              },
            ]}
          >
            <ActivityCard
              activity={item}
              completing={
                completingId ===
                String(item.id)
              }
              canManage={canManageActivities}
              onComplete={() =>
                handleComplete(
                  String(item.id),
                )
              }
              onEdit={() =>
                openEditModal(item)
              }
              onDelete={() =>
                handleDelete(String(item.id))
              }
            />
          </View>
        )}
        ListEmptyComponent={
          <View
            style={[
              styles.content,
              {
                maxWidth:
                  contentMaxWidth,
              },
            ]}
          >
            <EmptyState
              searching={
                Boolean(
                  search.trim(),
                ) ||
                statusFilter !==
                  'ALL' ||
                typeFilter !==
                  'ALL'
              }
              onCreate={() =>
                navigation.navigate('TaskForm')
              }
            />
          </View>
        }
        ListFooterComponent={
          <View
            style={{
              height: 120,
            }}
          />
        }
      />

      {/* ========================================================
          FLOATING BUTTON
      ======================================================== */}

      <Pressable
        onPress={() =>
          navigation.navigate('TaskForm')
        }
        style={({ pressed }) => [
          styles.fab,
          pressed &&
            styles.fabPressed,
        ]}
      >
        <Ionicons
          name="add"
          size={28}
          color={
            colors.textInverse
          }
        />
      </Pressable>

      {/* ========================================================
          FILTER MODAL
      ======================================================== */}

      <Modal
        visible={
          filterModalVisible
        }
        transparent
        animationType="slide"
        onRequestClose={() =>
          setFilterModalVisible(
            false,
          )
        }
      >
        <View
          style={
            styles.modalOverlay
          }
        >
          {/* FIXED:
              Do NOT use
              StyleSheet.absoluteFillObject
          */}

          <View
            style={
              styles.modalBackdrop
            }
          />

          <Pressable
            style={
              styles.modalDismissArea
            }
            onPress={() =>
              setFilterModalVisible(
                false,
              )
            }
          />

          <View
            style={
              styles.filterSheet
            }
          >
            <View
              style={
                styles.sheetHandle
              }
            />

            <View
              style={
                styles.sheetHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sheetEyebrow
                  }
                >
                  FILTERS
                </Text>

                <Text
                  style={
                    styles.sheetTitle
                  }
                >
                  Activity filters
                </Text>
              </View>

              <Pressable
                onPress={() =>
                  setFilterModalVisible(
                    false,
                  )
                }
                style={
                  styles.sheetClose
                }
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    colors.text
                  }
                />
              </Pressable>
            </View>

            {/* STATUS */}

            <Text
              style={
                styles.filterSectionTitle
              }
            >
              Status
            </Text>

            <View
              style={
                styles.optionGrid
              }
            >
              {[
                {
                  key: 'ALL' as StatusFilter,
                  label: 'All',
                  icon: 'grid-outline' as const,
                },
                {
                  key: 'PENDING' as StatusFilter,
                  label: 'Pending',
                  icon: 'time-outline' as const,
                },
                {
                  key: 'OVERDUE' as StatusFilter,
                  label: 'Overdue',
                  icon: 'alert-circle-outline' as const,
                },
                {
                  key: 'COMPLETED' as StatusFilter,
                  label: 'Completed',
                  icon: 'checkmark-circle-outline' as const,
                },
              ].map(option => {
                const active =
                  statusFilter ===
                  option.key;

                return (
                  <Pressable
                    key={
                      option.key
                    }
                    onPress={() =>
                      setStatusFilter(
                        option.key,
                      )
                    }
                    style={[
                      styles.optionCard,
                      active &&
                        styles.optionCardActive,
                    ]}
                  >
                    <Ionicons
                      name={
                        option.icon
                      }
                      size={20}
                      color={
                        active
                          ? colors.primary
                          : colors.textMuted
                      }
                    />

                    <Text
                      style={[
                        styles.optionText,
                        active &&
                          styles.optionTextActive,
                      ]}
                    >
                      {
                        option.label
                      }
                    </Text>

                    {active && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={
                          colors.primary
                        }
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* TYPE */}

            <Text
              style={[
                styles.filterSectionTitle,
                {
                  marginTop: 24,
                },
              ]}
            >
              Activity type
            </Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={
                false
              }
            >
              <View
                style={
                  styles.typeFilterRow
                }
              >
                <Pressable
                  onPress={() =>
                    setTypeFilter(
                      'ALL',
                    )
                  }
                  style={[
                    styles.typeFilterChip,
                    typeFilter ===
                      'ALL' &&
                      styles.typeFilterChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeFilterText,
                      typeFilter ===
                        'ALL' &&
                        styles.typeFilterTextActive,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>

                {ACTIVITY_TYPES.map(
                  item => {
                    const active =
                      typeFilter ===
                      item;

                    const color =
                      getTypeColor(
                        item,
                      );

                    return (
                      <Pressable
                        key={item}
                        onPress={() =>
                          setTypeFilter(
                            item,
                          )
                        }
                        style={[
                          styles.typeFilterChip,
                          active && {
                            backgroundColor:
                              `${color}12`,
                            borderColor:
                              color,
                          },
                        ]}
                      >
                        <Ionicons
                          name={getTypeIcon(
                            item,
                          )}
                          size={15}
                          color={
                            active
                              ? color
                              : colors.textMuted
                          }
                        />

                        <Text
                          style={[
                            styles.typeFilterText,
                            active && {
                              color,
                              fontWeight:
                                '700',
                            },
                          ]}
                        >
                          {
                            getTypeLabel(
                              item,
                            )
                          }
                        </Text>

                        <Text
                          style={[
                            styles.typeCount,
                            active && {
                              color,
                            },
                          ]}
                        >
                          {
                            typeCounts[
                              item
                            ]
                          }
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </ScrollView>

            {/* RESET */}

            <Pressable
              onPress={() => {
                setStatusFilter(
                  'ALL',
                );

                setTypeFilter(
                  'ALL',
                );
              }}
              style={
                styles.resetButton
              }
            >
              <Ionicons
                name="refresh-outline"
                size={18}
                color={
                  colors.primary
                }
              />

              <Text
                style={
                  styles.resetButtonText
                }
              >
                Reset filters
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          CREATE MODAL
      ======================================================== */}

      {/* Creation moved to its own screen (TaskForm / ProductForm). */}

      {/* ========================================================
          EDIT MODAL
      ======================================================== */}

      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : undefined
          }
          style={styles.modalOverlay}
        >
          <View style={styles.modalBackdrop} />

          <Pressable
            style={styles.modalDismissArea}
            onPress={closeEditModal}
          />

          <View style={styles.createSheet}>
            <View style={styles.sheetHandle} />

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.createContent}
            >
              <View style={styles.createHeader}>
                <View>
                  <Text style={styles.sheetEyebrow}>
                    WORKFLOW
                  </Text>

                  <Text style={styles.createTitle}>
                    Edit activity
                  </Text>

                  <Text style={styles.createSubtitle}>
                    Update the activity details.
                  </Text>
                </View>

                <Pressable
                  onPress={closeEditModal}
                  disabled={savingEdit}
                  style={styles.sheetClose}
                >
                  <Ionicons
                    name="close"
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
              </View>

              <Text style={styles.inputLabel}>
                Activity
              </Text>

              <TextInput
                value={editSummary}
                onChangeText={setEditSummary}
                placeholder="Activity summary"
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.activityInput}
              />

              <Text
                style={[
                  styles.inputLabel,
                  { marginTop: 20 },
                ]}
              >
                Activity type
              </Text>

              <View style={styles.createTypeGrid}>
                {ACTIVITY_TYPES.map(item => {
                  const active =
                    editType === item;

                  const color =
                    getTypeColor(item);

                  return (
                    <Pressable
                      key={item}
                      onPress={() =>
                        setEditType(item)
                      }
                      style={[
                        styles.createTypeCard,
                        active && {
                          backgroundColor:
                            `${color}10`,
                          borderColor:
                            color,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.createTypeIcon,
                          {
                            backgroundColor:
                              `${color}12`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={getTypeIcon(item)}
                          size={20}
                          color={color}
                        />
                      </View>

                      <Text
                        style={[
                          styles.createTypeText,
                          active && {
                            color,
                            fontWeight: '700',
                          },
                        ]}
                      >
                        {getTypeLabel(item)}
                      </Text>

                      {active && (
                        <View
                          style={[
                            styles.selectedCheck,
                            {
                              backgroundColor:
                                color,
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={12}
                            color={
                              colors.textInverse
                            }
                          />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {formError && (
                <View style={styles.formError}>
                  <Ionicons
                    name="alert-circle"
                    size={18}
                    color={colors.danger}
                  />

                  <Text style={styles.formErrorText}>
                    {formError}
                  </Text>
                </View>
              )}

              <View style={styles.createActions}>
                <Pressable
                  disabled={savingEdit}
                  onPress={closeEditModal}
                  style={({ pressed }) => [
                    styles.cancelButton,
                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={
                      styles.cancelButtonText
                    }
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={savingEdit}
                  onPress={handleSaveEdit}
                  style={({ pressed }) => [
                    styles.createButton,
                    pressed &&
                      styles.createButtonPressed,
                    savingEdit &&
                      styles.createButtonDisabled,
                  ]}
                >
                  {savingEdit ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        colors.textInverse
                      }
                    />
                  ) : (
                    <>
                      <Ionicons
                        name="save-outline"
                        size={18}
                        color={
                          colors.textInverse
                        }
                      />

                      <Text
                        style={
                          styles.createButtonText
                        }
                      >
                        Save changes
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({
  /* ==========================================================
     ROOT
  ========================================================== */

  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  listContent: {
    paddingTop: 0,
  },

  content: {
    width: '100%',
    alignSelf: 'center',
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  topHeader: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 11,
  },

  headerTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    color: colors.text,
  },

  headerSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 2,
  },

  headerAddButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  /* ==========================================================
     HERO
  ========================================================== */

  hero: {
    paddingTop: 22,
    paddingBottom: 22,
  },

  eyebrow: {
    fontSize: 11,
    lineHeight: 15,
    letterSpacing: 1.6,
    fontWeight: '800',
    color: colors.primary,
    marginBottom: 7,
  },

  pageTitle: {
    fontSize: 31,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.7,
    color: colors.text,
  },

  pageSubtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginTop: 6,
  },

  /* ==========================================================
     STATS
  ========================================================== */

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginBottom: 19,
  },

  statWrapperLarge: {
    flex: 1.3,
    minWidth: 150,
  },

  statWrapper: {
    flex: 1,
    minWidth: 115,
  },

  statCard: {
    minHeight: 88,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 17,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
  },

  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 9,
  },

  statContent: {
    flex: 1,
    minWidth: 0,
  },

  statLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '700',
    textTransform:
      'uppercase',
    letterSpacing: 0.5,
    color: colors.textMuted,
  },

  statValue: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '800',
    marginTop: 2,
  },

  /* ==========================================================
     SEARCH
  ========================================================== */

  searchContainer: {
    height: 53,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    minWidth: 0,
    height: 51,
    marginLeft: 9,
    color: colors.text,
    fontSize: 14,
  },

  /* ==========================================================
     FILTERS
  ========================================================== */

  filterRow: {
    gap: 8,
    paddingBottom: 4,
  },

  filterChip: {
    height: 41,
    paddingHorizontal: 12,
    borderRadius: 13,
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  filterChipActive: {
    backgroundColor:
      colors.primary,
    borderColor:
      colors.primary,
  },

  filterChipDanger: {
    borderColor:
      `${colors.danger}35`,
    backgroundColor:
      `${colors.danger}06`,
  },

  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  filterChipTextActive: {
    color:
      colors.textInverse,
  },

  filterChipTextDanger: {
    color: colors.danger,
  },

  filterCount: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  filterCountActive: {
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  filterCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },

  filterCountTextActive: {
    color:
      colors.textInverse,
  },

  /* ==========================================================
     LIST HEADER
  ========================================================== */

  listHeader: {
    marginTop: 23,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  listTitle: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: colors.text,
  },

  listSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    marginTop: 2,
  },

  filterButton: {
    width: 43,
    height: 43,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      colors.primary,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorBanner: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      `${colors.danger}25`,
    backgroundColor:
      `${colors.danger}08`,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 13,
  },

  errorContent: {
    flex: 1,
    marginHorizontal: 9,
  },

  errorTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },

  errorText: {
    fontSize: 11,
    lineHeight: 15,
    color: colors.textMuted,
    marginTop: 2,
  },

  retryText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },

  /* ==========================================================
     ACTIVITY CARD
  ========================================================== */

  activityActions: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  activityActionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteActionButton: {
    backgroundColor: `${colors.danger}08`,
    borderColor: `${colors.danger}20`,
  },

  completedInfo: {
    marginTop: 10,
    padding: 10,
    borderRadius: 11,
    backgroundColor: `${colors.success}08`,
    borderWidth: 1,
    borderColor: `${colors.success}18`,
    gap: 6,
  },

  completedInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  completedInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.textMuted,
    fontWeight: '600',
  },

  activityCard: {
    backgroundColor:
      colors.surface,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 17,
    padding: 15,
    marginBottom: 10,
  },

  activityCardCompleted: {
    opacity: 0.72,
  },

  activityCardOverdue: {
    borderColor:
      `${colors.danger}35`,
    backgroundColor:
      colors.dangerSoft,
  },

  activityCardTop: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  checkbox: {
    width: 27,
    height: 27,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    alignItems: 'center',
    justifyContent:
      'center',
    marginTop: 2,
    marginRight: 12,
  },

  checkboxCompleted: {
    backgroundColor:
      colors.success,
    borderColor:
      colors.success,
  },

  checkboxOverdue: {
    borderColor:
      colors.danger,
  },

  activityMain: {
    flex: 1,
    paddingRight: 72,
    minWidth: 0,
  },

  activityMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },

  typeBadge: {
    minHeight: 27,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  typeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  overdueBadge: {
    height: 27,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor:
      `${colors.danger}10`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  overdueBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.4,
  },

  activityTitle: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    color: colors.text,
  },

  activityTitleCompleted: {
    textDecorationLine:
      'line-through',
    color: colors.textMuted,
  },

  activityFooter: {
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor:
      colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
  },

  dueRow: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dueText: {
    flex: 1,
    fontSize: 11,
    color: colors.textMuted,
  },

  dueTextOverdue: {
    color: colors.danger,
    fontWeight: '700',
  },

  dueTextCompleted: {
    color: colors.success,
    fontWeight: '700',
  },

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyState: {
    backgroundColor:
      colors.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor:
      colors.border,
    alignItems: 'center',
    justifyContent:
      'center',
    paddingHorizontal: 24,
    paddingVertical: 52,
    marginTop: 5,
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 21,
    backgroundColor:
      `${colors.primary}10`,
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 17,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },

  emptyDescription: {
    maxWidth: 310,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 6,
  },

  emptyButton: {
    height: 43,
    borderRadius: 12,
    backgroundColor:
      colors.primary,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 19,
  },

  emptyButtonText: {
    color:
      colors.textInverse,
    fontSize: 13,
    fontWeight: '700',
  },

  /* ==========================================================
     FAB
  ========================================================== */

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 28,
    width: 57,
    height: 57,
    borderRadius: 18,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    elevation: 7,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },

  fabPressed: {
    transform: [
      {
        scale: 0.94,
      },
    ],
  },

  /* ==========================================================
     MODAL
  ========================================================== */

  modalOverlay: {
    flex: 1,
    justifyContent:
      'flex-end',
  },

  /*
   * FIX FOR:
   *
   * Property 'absoluteFillObject'
   * does not exist on type 'typeof StyleSheet'
   *
   * We explicitly position the backdrop instead.
   */

  modalBackdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor:
      'rgba(15,23,42,0.48)',
  },

  modalDismissArea: {
    flex: 1,
  },

  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 4,
    backgroundColor:
      colors.border,
    marginTop: 10,
    marginBottom: 16,
  },

  /* ==========================================================
     FILTER SHEET
  ========================================================== */

  filterSheet: {
    maxHeight: '82%',
    backgroundColor:
      colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
  },

  sheetEyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    color: colors.primary,
    marginBottom: 5,
  },

  sheetTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: colors.text,
  },

  sheetClose: {
    width: 41,
    height: 41,
    borderRadius: 13,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 9,
  },

  optionGrid: {
    gap: 8,
  },

  optionCard: {
    minHeight: 51,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor:
      colors.surface,
  },

  optionCardActive: {
    backgroundColor:
      `${colors.primary}08`,
    borderColor:
      `${colors.primary}55`,
  },

  optionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },

  optionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  typeFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 5,
  },

  typeFilterChip: {
    height: 40,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  typeFilterChipActive: {
    borderColor:
      colors.primary,
    backgroundColor:
      `${colors.primary}10`,
  },

  typeFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  typeFilterTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },

  typeCount: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },

  resetButton: {
    height: 45,
    borderRadius: 13,
    borderWidth: 1,
    borderColor:
      `${colors.primary}35`,
    backgroundColor:
      `${colors.primary}06`,
    marginTop: 20,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection: 'row',
    gap: 7,
  },

  resetButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },

  /* ==========================================================
     CREATE SHEET
  ========================================================== */

  createSheet: {
    maxHeight: '91%',
    backgroundColor:
      colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },

  createContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },

  createHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent:
      'space-between',
    marginBottom: 22,
  },

  createTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: colors.text,
  },

  createSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 4,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
  },

  activityInput: {
    minHeight: 88,
    maxHeight: 130,
    borderWidth: 1,
    borderColor:
      colors.border,
    borderRadius: 15,
    backgroundColor:
      colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 14,
    lineHeight: 21,
    color: colors.text,
    textAlignVertical:
      'top',
  },

  createTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },

  createTypeCard: {
    width: '48.5%',
    minHeight: 64,
    borderRadius: 15,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },

  createTypeIcon: {
    width: 37,
    height: 37,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent:
      'center',
    marginRight: 8,
  },

  createTypeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },

  selectedCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  infoCard: {
    marginTop: 18,
    borderRadius: 14,
    backgroundColor:
      `${colors.primary}07`,
    borderWidth: 1,
    borderColor:
      `${colors.primary}15`,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },

  infoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textMuted,
  },

  formError: {
    marginTop: 13,
    padding: 12,
    borderRadius: 13,
    backgroundColor:
      `${colors.danger}08`,
    borderWidth: 1,
    borderColor:
      `${colors.danger}20`,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  formErrorText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
    fontWeight: '600',
  },

  createActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },

  cancelButton: {
    flex: 0.8,
    height: 51,
    borderRadius: 14,
    borderWidth: 1,
    borderColor:
      colors.border,
    backgroundColor:
      colors.surface,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  cancelButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },

  createButton: {
    flex: 1.4,
    height: 51,
    borderRadius: 14,
    backgroundColor:
      colors.primary,
    alignItems: 'center',
    justifyContent:
      'center',
    flexDirection: 'row',
    gap: 7,
  },

  createButtonPressed: {
    opacity: 0.85,
  },

  createButtonDisabled: {
    opacity: 0.6,
  },

  createButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color:
      colors.textInverse,
  },

  /* ==========================================================
     LOADING
  ========================================================== */

  loadingScreen: {
    flex: 1,
    backgroundColor:
      colors.background,
    alignItems: 'center',
    justifyContent:
      'center',
  },

  loadingLogo: {
    width: 62,
    height: 62,
    borderRadius: 19,
    backgroundColor:
      `${colors.primary}12`,
    alignItems: 'center',
    justifyContent:
      'center',
    marginBottom: 14,
  },

  loadingTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },

  loadingSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
  },

  /* ==========================================================
     GENERAL
  ========================================================== */

  pressed: {
    opacity: 0.72,
  },
}));