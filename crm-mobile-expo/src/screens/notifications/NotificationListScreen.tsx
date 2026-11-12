import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, SectionList, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import { getAttention, type AttentionItem } from '@/api/insights.api';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '@/api/notifications.api';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { AppNotification, NotificationType } from '@/types';
import { relativeDay } from '@/utils/dates';

type Props = NativeStackScreenProps<AppStackParamList, 'NotificationList'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];
type View_ = 'attention' | 'inbox';

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

const KIND_ICON: Record<AttentionItem['kind'], IconName> = {
  TASK_OVERDUE: 'alarm-outline',
  TASK_DUE_TODAY: 'today-outline',
  INVOICE_OVERDUE: 'receipt-outline',
  DEAL_OVERDUE: 'git-branch-outline',
  LEAD_STALE: 'snow-outline',
  EVENT_SOON: 'calendar-outline',
};

const KIND_LABEL: Record<AttentionItem['kind'], string> = {
  TASK_OVERDUE: 'Overdue task',
  TASK_DUE_TODAY: 'Due today',
  INVOICE_OVERDUE: 'Unpaid invoice',
  DEAL_OVERDUE: 'Deal past close date',
  LEAD_STALE: 'Lead going cold',
  EVENT_SOON: 'Coming up',
};

/**
 * Alerts.
 *  - "Needs attention": computed from live data for the user's scope
 *    (own / team / company) — overdue tasks and invoices, deals past
 *    their close date, leads nobody touched for a week and meetings in
 *    the next 48 h — each with the reason it matters.
 *  - "Inbox": notifications sent to this user (assignments etc.).
 */
export function NotificationListScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [view, setView] = useState<View_>('attention');
  const [items, setItems] = useState<AppNotification[] | null>(null);
  const [attention, setAttention] = useState<AttentionItem[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [n, a] = await Promise.all([listNotifications(), getAttention().catch(() => ({ items: [] as AttentionItem[], counts: {} }))]);
      setItems(n);
      setAttention(a.items);
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
  const highCount = attention?.filter(a => a.severity === 'high').length ?? 0;

  const sections = useMemo(() => {
    const visible = (items ?? []).filter(n => filter === 'all' || !n.isRead);
    const groups = new Map<string, AppNotification[]>();
    for (const item of visible) {
      const label = relativeDay(new Date(item.createdAt));
      groups.set(label, [...(groups.get(label) ?? []), item]);
    }
    return [...groups.entries()].map(([title, data]) => ({ title, data }));
  }, [filter, items]);

  const routes = () => navigation.getState().routeNames as string[];

  async function open(item: AppNotification) {
    if (!item.isRead) {
      setItems(current => current?.map(n => (n.id === item.id ? { ...n, isRead: true } : n)) ?? null);
      markNotificationRead(item.id).catch(() => load());
    }
    if (!item.relatedId) return;
    const r = routes();
    if (item.type === 'LEAD' && r.includes('LeadDetail')) navigation.navigate('LeadDetail', { leadId: item.relatedId, leadName: item.title });
    else if (item.type === 'DEAL' && r.includes('Pipeline')) navigation.navigate('Pipeline');
    else if (item.type === 'INVOICE' && r.includes('InvoiceDetail')) navigation.navigate('InvoiceDetail', { invoiceId: item.relatedId });
    else if (item.type === 'PAYMENT' && r.includes('PaymentList')) navigation.navigate('PaymentList');
    else if (item.type === 'MEETING' && r.includes('Calendar')) navigation.navigate('Calendar');
    else if (item.type === 'TASK' && r.includes('Activities')) navigation.navigate('Activities');
  }

  function openAttention(item: AttentionItem) {
    const r = routes();
    if (item.relatedType === 'Invoice' && r.includes('InvoiceDetail')) navigation.navigate('InvoiceDetail', { invoiceId: item.relatedId });
    else if (item.relatedType === 'Lead' && r.includes('LeadDetail')) navigation.navigate('LeadDetail', { leadId: item.relatedId, leadName: item.title });
    else if (item.relatedType === 'Opportunity' && r.includes('Pipeline')) navigation.navigate('Pipeline');
    else if (item.relatedType === 'Activity' && r.includes('Activities')) navigation.navigate('Activities');
    else if (item.relatedType === 'CalendarEvent' && r.includes('Calendar')) navigation.navigate('Calendar');
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

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
      }}
      tintColor={theme.colors.primary}
    />
  );

  const header = (
    <HeroHeader
      title="Alerts"
      subtitle={
        highCount > 0
          ? `${highCount} need action now · ${unreadCount} unread`
          : unreadCount > 0
            ? `${unreadCount} unread`
            : 'You are all caught up'
      }
      icon="notifications-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        view === 'inbox' && unreadCount > 0 ? (
          <PressableScale onPress={markAll} accessibilityRole="button" accessibilityLabel="Mark all as read" style={styles.markAll}>
            <Ionicons name="checkmark-done" size={16} color={theme.colors.onPrimary} />
            <Text style={[styles.markAllText, { color: theme.colors.onPrimary }]}>Mark all read</Text>
          </PressableScale>
        ) : undefined
      }
    />
  );

  const switcher = (
    <View style={styles.filter}>
      <SegmentedControl<View_>
        accessibilityLabel="Alert view"
        value={view}
        onChange={setView}
        options={[
          { value: 'attention', label: `Needs attention (${attention?.length ?? 0})` },
          { value: 'inbox', label: `Inbox (${unreadCount})` },
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );

  if (items === null || attention === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2, 3].map(i => <SkeletonCard key={i} lines={1} />)}
        </View>
      </View>
    );
  }

  if (view === 'attention') {
    const groups: { key: AttentionItem['severity']; title: string; hint: string; color: string }[] = [
      { key: 'high', title: 'Act now', hint: 'Money or commitments at risk', color: theme.colors.danger },
      { key: 'medium', title: 'This week', hint: 'Keeps the pipeline healthy', color: theme.colors.warning },
      { key: 'info', title: 'Coming up', hint: 'Next 48 hours', color: theme.colors.info },
    ];
    return (
      <View style={styles.screen}>
        {header}
        <ScrollView contentContainerStyle={styles.content} refreshControl={refreshControl}>
          {switcher}
          <View style={styles.explain}>
            <Ionicons name="bulb-outline" size={18} color={theme.colors.primary} />
            <Text style={styles.explainText}>
              Alerts catch work that slips: unpaid bills, missed follow-ups, deals that stalled and leads going cold. Clearing them protects revenue and customer trust. Tap “Why it matters” for the reason, or the card to open the record.
            </Text>
          </View>
          {attention.length === 0 ? (
            <ScreenState kind="empty" title="Nothing needs attention" message="No overdue tasks or invoices, no stalled deals and no cold leads. Great work!" />
          ) : (
            groups.map(g => {
              const list = attention.filter(a => a.severity === g.key);
              if (list.length === 0) return null;
              return (
                <View key={g.key}>
                  <View style={styles.groupHead}>
                    <View style={[styles.groupDot, { backgroundColor: g.color }]} />
                    <Text style={styles.groupTitle}>
                      {g.title} · {list.length}
                    </Text>
                    <Text style={styles.groupHint}>{g.hint}</Text>
                  </View>
                  {list.map((a, i) => (
                    <FadeInView key={a.id} index={i}>
                      <PressableScale onPress={() => openAttention(a)} accessibilityRole="button" accessibilityLabel={`${KIND_LABEL[a.kind]}: ${a.title}. ${a.detail}`} style={[styles.card, { borderLeftWidth: 4, borderLeftColor: g.color }]}>
                        <View style={[styles.icon, { backgroundColor: `${g.color}1A` }]}>
                          <Ionicons name={KIND_ICON[a.kind]} size={20} color={g.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.kind, { color: g.color }]}>{KIND_LABEL[a.kind]}</Text>
                          <Text style={styles.title} numberOfLines={2}>
                            {a.title}
                          </Text>
                          <Text style={styles.message}>{a.detail}</Text>
                          {a.owner ? <Text style={styles.owner}>Owner: {a.owner}</Text> : null}
                          <PressableScale onPress={() => setExpanded(expanded === a.id ? null : a.id)} accessibilityRole="button" style={styles.whyBtn}>
                            <Ionicons name={expanded === a.id ? 'chevron-up' : 'help-circle-outline'} size={14} color={theme.colors.primary} />
                            <Text style={styles.whyLabel}>Why it matters</Text>
                          </PressableScale>
                          {expanded === a.id ? <Text style={styles.why}>{a.why}</Text> : null}
                        </View>
                      </PressableScale>
                    </FadeInView>
                  ))}
                </View>
              );
            })
          )}
        </ScrollView>
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
        refreshControl={refreshControl}
        ListHeaderComponent={
          <View>
            {switcher}
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
            </View>
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
                    <Text style={[styles.title, { flex: 1 }, !item.isRead && { fontWeight: '800' }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.time}>{new Date(item.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
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
    content: { padding: theme.spacing.md, paddingBottom: 60, width: '100%', maxWidth: 760, alignSelf: 'center', flexGrow: 1 },
    filter: { marginBottom: theme.spacing.md, gap: 8 },
    error: { color: theme.colors.danger, fontSize: 13 },
    explain: { flexDirection: 'row', gap: 10, backgroundColor: theme.colors.primaryLight, borderRadius: theme.radius.lg, padding: 12, marginBottom: 14 },
    explainText: { flex: 1, color: theme.colors.text, fontSize: 12.5, lineHeight: 18 },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, marginBottom: 8, flexWrap: 'wrap' },
    groupDot: { width: 10, height: 10, borderRadius: 5 },
    groupTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
    groupHint: { color: theme.colors.textMuted, fontSize: 12 },
    sectionTitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 6, marginBottom: 8 },
    card: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 14,
      marginBottom: 10,
    },
    icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    kind: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 1 },
    time: { color: theme.colors.textFaint, fontSize: 11 },
    message: { color: theme.colors.textMuted, fontSize: 13, marginTop: 3, lineHeight: 18 },
    owner: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 3, fontWeight: '600' },
    whyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, alignSelf: 'flex-start' },
    whyLabel: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    why: { color: theme.colors.textSecondary, fontSize: 12.5, lineHeight: 18, marginTop: 6, backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10 },
    dot: { width: 9, height: 9, borderRadius: 5, marginTop: 6 },
    markAll: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8 },
    markAllText: { fontSize: 12, fontWeight: '800' },
  });
}
