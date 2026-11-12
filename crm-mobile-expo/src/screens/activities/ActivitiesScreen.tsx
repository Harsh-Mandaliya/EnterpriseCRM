import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { assignActivity, completeActivity, listActivities } from '@/api/activities.api';
import { getApiErrorMessage } from '@/api/client';
import { Fab } from '@/components/common/Fab';
import { Kpi, KpiRow } from '@/components/common/Panel';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { usePickerData } from '@/hooks/usePickerData';
import { useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useResponsive } from '@/hooks/useResponsive';
import type { AppStackParamList } from '@/navigation/types';
import { activityTypeOptions } from '@/screens/forms/options';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Activity } from '@/types';
import { confirmAction } from '@/utils/confirm';
import { useCan } from '@/utils/permissions';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
type View_ = 'open' | 'done' | 'all';
type Who = 'all' | 'mine' | 'general' | 'created';

/* ---------------- helpers (exported for tests) ---------------- */

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

export type Bucket = 'overdue' | 'today' | 'upcoming' | 'nodate' | 'done';

export function bucketOf(task: Pick<Activity, 'status' | 'dueAt'>, now = new Date()): Bucket {
  if (task.status !== 'PENDING') return 'done';
  if (!task.dueAt) return 'nodate';
  const due = new Date(task.dueAt);
  const today = startOfDay(now);
  if (due < today) return 'overdue';
  if (due < new Date(today.getTime() + DAY)) return 'today';
  return 'upcoming';
}

/** "on time" / "2 days late" for a completed task with a due date. */
export function completionTiming(task: Pick<Activity, 'dueAt' | 'completedAt'>): string | null {
  if (!task.dueAt || !task.completedAt) return null;
  const late = startOfDay(new Date(task.completedAt)).getTime() - startOfDay(new Date(task.dueAt)).getTime();
  if (late <= 0) return 'on time';
  const days = Math.round(late / DAY);
  return `${days} day${days > 1 ? 's' : ''} late`;
}

export function assigneeLabel(task: Pick<Activity, 'assignedToId' | 'assignedTo'>, meId?: string): string {
  if (!task.assignedToId) return 'General (team)';
  if (task.assignedToId === meId) return 'You';
  return task.assignedTo?.name ?? 'Someone';
}

export function filterTasks(tasks: Activity[], view: View_, who: Who, query: string, meId?: string): Activity[] {
  const q = query.trim().toLowerCase();
  return tasks
    .filter(t => t.type !== 'NOTE')
    .filter(t => (view === 'open' ? t.status === 'PENDING' : view === 'done' ? t.status === 'COMPLETED' : true))
    .filter(t =>
      who === 'mine' ? t.assignedToId === meId : who === 'general' ? !t.assignedToId : who === 'created' ? t.createdById === meId : true,
    )
    .filter(t => !q || t.summary.toLowerCase().includes(q) || (t.notes ?? '').toLowerCase().includes(q) || (t.assignedTo?.name ?? '').toLowerCase().includes(q))
    .sort((a, b) => {
      if (view === 'done') return (b.completedAt ?? '').localeCompare(a.completedAt ?? '');
      const ad = a.dueAt ?? '9999';
      const bd = b.dueAt ?? '9999';
      return ad.localeCompare(bd);
    });
}

const BUCKETS: { key: Bucket; title: string; icon: IconName }[] = [
  { key: 'overdue', title: 'Overdue', icon: 'alarm-outline' },
  { key: 'today', title: 'Due today', icon: 'today-outline' },
  { key: 'upcoming', title: 'Upcoming', icon: 'calendar-outline' },
  { key: 'nodate', title: 'No due date', icon: 'remove-circle-outline' },
  { key: 'done', title: 'Completed', icon: 'checkmark-done-outline' },
];

/**
 * Tasks (v1.4.2). Each task shows who it is for — a person or
 * "General (team)" that anyone can pick up — who created it and,
 * once done, who completed it and exactly when. Owners, admins and
 * managers can (re)assign. Visibility follows the hierarchy on the
 * server (own / team / company; general tasks for everyone).
 */
export function ActivitiesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const layout = useResponsive();
  const me = useAppSelector(state => state.auth.user);
  const canAssign = useCan('task.assign');
  const users = usePickerData('users', canAssign);

  const [tasks, setTasks] = useState<Activity[] | null>(null);
  const [view, setView] = useState<View_>('open');
  const [who, setWho] = useState<Who>('all');
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Activity | null>(null);

  const load = useCallback(async () => {
    try {
      setTasks(await listActivities());
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load tasks.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const stats = useMemo(() => {
    const all = (tasks ?? []).filter(t => t.type !== 'NOTE');
    const weekAgo = Date.now() - 7 * DAY;
    return {
      open: all.filter(t => t.status === 'PENDING').length,
      overdue: all.filter(t => bucketOf(t) === 'overdue').length,
      today: all.filter(t => bucketOf(t) === 'today').length,
      doneWeek: all.filter(t => t.status === 'COMPLETED' && t.completedAt && new Date(t.completedAt).getTime() >= weekAgo).length,
      general: all.filter(t => t.status === 'PENDING' && !t.assignedToId).length,
    };
  }, [tasks]);

  const visible = useMemo(() => filterTasks(tasks ?? [], view, who, query, me?.id), [tasks, view, who, query, me?.id]);
  const groups = useMemo(() => BUCKETS.map(b => ({ ...b, items: visible.filter(t => bucketOf(t) === b.key) })).filter(g => g.items.length), [visible]);

  const markDone = async (task: Activity) => {
    const now = new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    const ok = await confirmAction('Mark as done?', `“${task.summary}” will be recorded as completed by ${me?.name ?? 'you'} on ${now}.`, 'Mark done');
    if (!ok) return;
    setBusyId(task.id);
    try {
      const updated = await completeActivity(task.id);
      setTasks(cur => cur?.map(t => (t.id === task.id ? { ...t, ...updated } : t)) ?? null);
    } catch (err) {
      Alert.alert('Could not complete the task', getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const assignTo = async (task: Activity, userId: string | null) => {
    setAssigning(null);
    setBusyId(task.id);
    try {
      const updated = await assignActivity(task.id, userId);
      setTasks(cur => cur?.map(t => (t.id === task.id ? { ...t, ...updated } : t)) ?? null);
    } catch (err) {
      Alert.alert('Could not assign the task', getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <HeroHeader
      title="Tasks"
      subtitle={tasks ? `${stats.open} open · ${stats.overdue} overdue${stats.general ? ` · ${stats.general} for the team` : ''}` : 'Follow-ups, calls and meetings'}
      icon="checkbox-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  if (tasks === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={[styles.content, { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth }]}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={2} />)}
        </View>
      </View>
    );
  }

  const whoOptions: { value: Who; label: string; icon: IconName }[] = [
    { value: 'all', label: 'Everything', icon: 'albums-outline' },
    { value: 'mine', label: 'Assigned to me', icon: 'person-outline' },
    { value: 'general', label: 'General (team)', icon: 'people-outline' },
    { value: 'created', label: 'Created by me', icon: 'create-outline' },
  ];

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth }]}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <KpiRow>
          <Kpi label="Open" value={stats.open} icon="list-outline" color={theme.colors.primary} hint={stats.general ? `${stats.general} general` : undefined} />
          <Kpi label="Overdue" value={stats.overdue} icon="alarm-outline" color={theme.colors.danger} />
          <Kpi label="Due today" value={stats.today} icon="today-outline" color={theme.colors.warning} />
          <Kpi label="Done (7 days)" value={stats.doneWeek} icon="checkmark-done-outline" color={theme.colors.success} />
        </KpiRow>

        <SegmentedControl<View_>
          accessibilityLabel="Task status"
          value={view}
          onChange={setView}
          options={[
            { value: 'open', label: `Open (${stats.open})` },
            { value: 'done', label: 'Completed' },
            { value: 'all', label: 'All' },
          ]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {whoOptions.map(o => {
            const active = who === o.value;
            return (
              <PressableScale key={o.value} onPress={() => setWho(o.value)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : null]}>
                <Ionicons name={o.icon} size={14} color={active ? theme.colors.onPrimary : theme.colors.textSecondary} />
                <Text style={[styles.chipText, active ? { color: theme.colors.onPrimary } : null]}>{o.label}</Text>
              </PressableScale>
            );
          })}
        </ScrollView>

        <View style={styles.search}>
          <Ionicons name="search" size={18} color={theme.colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tasks or people"
            placeholderTextColor={theme.colors.textFaint}
            style={[styles.searchInput, WEB_NO_OUTLINE]}
            autoCorrect={false}
            accessibilityLabel="Search tasks"
          />
          {query ? (
            <PressableScale onPress={() => setQuery('')} accessibilityLabel="Clear search" hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
            </PressableScale>
          ) : null}
        </View>

        {groups.length === 0 ? (
          <ScreenState
            kind="empty"
            title={view === 'done' ? 'Nothing completed yet' : 'No tasks here'}
            message={view === 'open' ? 'Tap “New task” to plan a call, meeting or follow-up.' : 'Try another filter.'}
          />
        ) : (
          groups.map(g => (
            <View key={g.key}>
              <View style={styles.groupHead}>
                <Ionicons name={g.icon} size={15} color={g.key === 'overdue' ? theme.colors.danger : g.key === 'done' ? theme.colors.success : theme.colors.textMuted} />
                <Text style={[styles.groupTitle, g.key === 'overdue' ? { color: theme.colors.danger } : null]}>
                  {g.title} · {g.items.length}
                </Text>
              </View>
              <ResponsiveGrid>
                {g.items.map((t, i) => (
                  <FadeInView key={t.id} index={Math.min(i, 8)}>
                    <TaskCard
                      task={t}
                      meId={me?.id}
                      busy={busyId === t.id}
                      canAssign={canAssign}
                      onDone={() => markDone(t)}
                      onAssign={() => setAssigning(t)}
                    />
                  </FadeInView>
                ))}
              </ResponsiveGrid>
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="New task" icon="add" onPress={() => navigation.navigate('TaskForm')} />

      {/* assign sheet */}
      <Modal visible={!!assigning} transparent animationType="slide" onRequestClose={() => setAssigning(null)}>
        <Pressable style={styles.backdrop} onPress={() => setAssigning(null)} accessibilityLabel="Close" />
        {assigning ? (
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Assign task</Text>
            <Text style={styles.sheetSub} numberOfLines={2}>
              {assigning.summary}
            </Text>
            <ScrollView style={{ maxHeight: 380 }}>
              <AssignRow icon="people-outline" title="General (team)" subtitle="Anyone in the company can pick it up and complete it" active={!assigning.assignedToId} onPress={() => assignTo(assigning, null)} />
              {me ? <AssignRow icon="person-outline" title={`Me (${me.name})`} active={assigning.assignedToId === me.id} onPress={() => assignTo(assigning, me.id)} /> : null}
              {users.items
                .filter(u => u.id !== me?.id)
                .map(u => (
                  <AssignRow key={u.id} icon="person-circle-outline" title={u.title} subtitle={u.subtitle} active={assigning.assignedToId === u.id} onPress={() => assignTo(assigning, u.id)} />
                ))}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function TaskCard({
  task: t,
  meId,
  busy,
  canAssign,
  onDone,
  onAssign,
}: {
  task: Activity;
  meId?: string;
  busy: boolean;
  canAssign: boolean;
  onDone: () => void;
  onAssign: () => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bucket = bucketOf(t);
  const type = activityTypeOptions.find(o => o.value === t.type);
  const done = t.status === 'COMPLETED';
  const accent = done ? theme.colors.success : bucket === 'overdue' ? theme.colors.danger : bucket === 'today' ? theme.colors.warning : theme.colors.primary;
  const timing = completionTiming(t);
  const general = !t.assignedToId;

  return (
    <View style={[styles.card, { borderLeftColor: accent }]}>
      <View style={styles.cardTop}>
        <View style={[styles.typeIcon, { backgroundColor: `${accent}1F` }]}>
          <Ionicons name={(type?.icon as IconName) ?? 'checkbox-outline'} size={17} color={accent} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, done ? styles.titleDone : null]} numberOfLines={2}>
            {t.summary}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {type?.label ?? t.type}
            {t.dueAt ? ` · due ${dateTime(t.dueAt)}` : ''}
          </Text>
        </View>
      </View>

      {t.notes ? (
        <Text style={styles.notes} numberOfLines={2}>
          {t.notes}
        </Text>
      ) : null}

      <View style={styles.people}>
        <View style={[styles.personChip, { backgroundColor: general ? theme.colors.accentSoft : theme.colors.surfaceAlt }]}>
          <Ionicons name={general ? 'people' : 'person'} size={12} color={general ? theme.colors.accent : theme.colors.textSecondary} />
          <Text style={[styles.personText, general ? { color: theme.colors.accent } : null]} numberOfLines={1}>
            For: {assigneeLabel(t, meId)}
          </Text>
        </View>
        {t.createdBy ? (
          <Text style={styles.meta} numberOfLines={1}>
            by {t.createdById === meId ? 'you' : t.createdBy.name}
          </Text>
        ) : null}
      </View>

      {done ? (
        <View style={[styles.doneBox, { backgroundColor: theme.colors.successSoft }]}>
          <Ionicons name="checkmark-circle" size={17} color={theme.colors.success} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.doneText, { color: theme.colors.success }]}>
              Completed by {t.completedBy ? (t.completedBy.id === meId ? 'you' : t.completedBy.name) : 'someone'}
            </Text>
            <Text style={styles.doneMeta}>
              {t.completedAt ? dateTime(t.completedAt) : ''}
              {timing ? ` · ${timing}` : ''}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.actions}>
          {canAssign ? (
            <PressableScale onPress={onAssign} disabled={busy} accessibilityRole="button" accessibilityLabel="Assign task" style={[styles.actionBtn, { borderColor: theme.colors.border }]}>
              <Ionicons name="person-add-outline" size={15} color={theme.colors.textSecondary} />
              <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>Assign</Text>
            </PressableScale>
          ) : null}
          <PressableScale onPress={onDone} disabled={busy} accessibilityRole="button" accessibilityLabel={`Mark ${t.summary} as done`} style={[styles.actionBtn, { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]}>
            <Ionicons name={busy ? 'hourglass-outline' : 'checkmark'} size={15} color={theme.colors.onPrimary} />
            <Text style={[styles.actionText, { color: theme.colors.onPrimary }]}>Mark done</Text>
          </PressableScale>
        </View>
      )}
    </View>
  );
}

function AssignRow({ icon, title, subtitle, active, onPress }: { icon: IconName; title: string; subtitle?: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.assignRow, active ? { backgroundColor: theme.colors.primaryLight } : null]}>
      <Ionicons name={icon} size={20} color={active ? theme.colors.primary : theme.colors.textSecondary} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.assignTitle, active ? { color: theme.colors.primary } : null]}>{title}</Text>
        {subtitle ? <Text style={styles.meta}>{subtitle}</Text> : null}
      </View>
      {active ? <Ionicons name="checkmark" size={18} color={theme.colors.primary} /> : null}
    </PressableScale>
  );
}

/** Hide the browser focus ring inside the box; the border shows focus. */
const WEB_NO_OUTLINE = (Platform.OS === 'web' ? { outlineWidth: 0 } : null) as object | null;

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingTop: 16, paddingBottom: 110, width: '100%', alignSelf: 'center' },
    chips: { gap: 8, paddingVertical: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 },
    chipText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: '700' },
    search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 12, minHeight: 46, marginBottom: 6 },
    searchInput: { flex: 1, color: theme.colors.text, fontSize: 15, paddingVertical: 10, minWidth: 0 },
    groupHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 8 },
    groupTitle: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, padding: 14, marginBottom: 12 },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    typeIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    title: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    titleDone: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
    meta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2, flexShrink: 1 },
    notes: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 8, lineHeight: 18 },
    people: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' },
    personChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 9, paddingVertical: 4, maxWidth: '100%' },
    personText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    doneBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginTop: 10 },
    doneText: { fontSize: 13, fontWeight: '800' },
    doneMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 1 },
    actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 12 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 7 },
    actionText: { fontSize: 13, fontWeight: '800' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, width: '100%', maxWidth: 640, alignSelf: 'center' },
    handle: { width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 12 },
    sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    sheetSub: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2, marginBottom: 12 },
    assignRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, padding: 12 },
    assignTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '700' },
  });
}
