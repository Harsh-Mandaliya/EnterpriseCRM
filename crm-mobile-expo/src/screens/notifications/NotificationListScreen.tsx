import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notifications.api';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { MainStackParamList } from '@/navigation/OwnerNavigator';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { AppNotification, NotificationType } from '@/types';
import { relativeDay } from '@/utils/dates';

type Props = NativeStackScreenProps<MainStackParamList, 'NotificationList'>;

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function typeMeta(theme: Theme, type: NotificationType): { icon: IconName; color: string; label: string } {
  switch (type) {
    case 'TASK':
      return { icon: 'checkbox-outline', color: theme.colors.warning, label: 'Task' };
    case 'LEAD':
      return { icon: 'person-add-outline', color: theme.colors.primary, label: 'Lead' };
    case 'DEAL':
      return { icon: 'briefcase-outline', color: theme.colors.accent, label: 'Deal' };
    case 'INVOICE':
      return { icon: 'receipt-outline', color: theme.colors.info, label: 'Invoice' };
    case 'PAYMENT':
      return { icon: 'wallet-outline', color: theme.colors.success, label: 'Payment' };
    case 'MEETING':
      return { icon: 'calendar-outline', color: theme.colors.primary, label: 'Meeting' };
    default:
      return { icon: 'notifications-outline', color: theme.colors.textMuted, label: 'System' };
  }
}

/**
 * Alerts: the signed-in user's own notifications, grouped by day.
 * Tapping marks one read and opens the related record when this
 * role can open it.
 */
export function NotificationListScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setItems(await listNotifications());
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load alerts.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const unreadCount = items?.filter(n => !n.isRead).length ?? 0;

  const sections = useMemo(() => {
    const visible = (items ?? []).filter(n => filter === 'all' || !n.isRead);
    const groups = new Map<string, AppNotification[]>();
    for (const item of visible) {
      const label = relativeDay(new Date(item.createdAt));
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filter, items]);

  async function open(item: AppNotification) {
    if (!item.isRead) {
      setItems(current => current?.map(n => (n.id === item.id ? { ...n, isRead: true } : n)) ?? null);
      markNotificationRead(item.id).catch(() => load());
    }
    if (!item.relatedId) return;

    // Only navigate to screens this role's navigator actually has.
    const routes = navigation.getState().routeNames as string[];
    if (item.type === 'LEAD' && routes.includes('LeadDetail')) {
      navigation.navigate('LeadDetail', { leadId: item.relatedId, leadName: item.title });
    } else if (item.type === 'DEAL' && routes.includes('OpportunitiesBoard')) {
      navigation.navigate('OpportunitiesBoard');
    } else if ((item.type === 'INVOICE' || item.type === 'PAYMENT') && routes.includes('InvoiceList')) {
      navigation.navigate('InvoiceList');
    } else if ((item.type === 'MEETING') && routes.includes('Calendar')) {
      navigation.navigate('Calendar');
    } else if (item.type === 'TASK' && routes.includes('Activities')) {
      navigation.navigate('Activities');
    }
  }

  async function markAll() {
    setItems(current => current?.map(n => ({ ...n, isRead: true })) ?? null);
    try {
      await markAllNotificationsRead();
    } catch (err) {
      setError(getApiErrorMessage(err));
      load();
    }
  }

  const header = (
    <HeroHeader
      title="Alerts"
      subtitle={unreadCount > 0 ? `${unreadCount} unread` : 'You are all caught up'}
      icon="notifications-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        unreadCount > 0 ? (
          <PressableScale
            onPress={markAll}
            accessibilityRole="button"
            accessibilityLabel="Mark all as read"
            style={styles.markAll}
          >
            <Ionicons name="checkmark-done" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.markAllText, { color: theme.colors.onPrimary }]}>Mark all read</Text>
          </PressableScale>
        ) : undefined
      }
    />
  );

  if (items === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={1} />)}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <SectionList
        sections={sections}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
            tintColor={theme.colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.filter}>
            <SegmentedControl
              accessibilityLabel="Show"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: `All (${items.length})` },
                { value: 'unread', label: `Unread (${unreadCount})` },
              ]}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          <ScreenState
            kind="empty"
            title={filter === 'unread' ? 'No unread alerts' : 'No alerts yet'}
            message="New leads, tasks, deals, invoices and meetings assigned to you appear here."
          />
        }
        renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
        renderItem={({ item, index }) => {
          const meta = typeMeta(theme, item.type);
          return (
            <FadeInView index={index}>
              <PressableScale
                onPress={() => open(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.isRead ? '' : 'Unread. '}${meta.label}: ${item.title}. ${item.message}`}
                style={[styles.card, !item.isRead && { borderColor: meta.color }]}
              >
                <View style={[styles.icon, { backgroundColor: theme.isDark ? theme.colors.surfaceAlt : `${meta.color}1A` }]}>
                  <Ionicons name={meta.icon} size={20} color={meta.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.title, !item.isRead && { fontWeight: '800' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.time}>
                      {new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                  <Text style={styles.message} numberOfLines={2}>
                    {item.message}
                  </Text>
                </View>
                {!item.isRead ? <View style={[styles.dot, { backgroundColor: meta.color }]} /> : null}
              </PressableScale>
            </FadeInView>
          );
        }}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: theme.spacing.md, paddingBottom: 60, width: '100%', maxWidth: 720, alignSelf: 'center', flexGrow: 1 },
    filter: { marginBottom: theme.spacing.md, gap: 8 },
    error: { color: theme.colors.danger, fontSize: 13 },
    sectionTitle: {
      color: theme.colors.textMuted,
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginTop: 6,
      marginBottom: 8,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 10,
    },
    icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { flex: 1, color: theme.colors.text, fontSize: 15, fontWeight: '600' },
    time: { color: theme.colors.textFaint, fontSize: 11 },
    message: { color: theme.colors.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 },
    dot: { width: 9, height: 9, borderRadius: 5 },
    markAll: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    markAllText: { fontSize: 12, fontWeight: '800' },
  });
}
