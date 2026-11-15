import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { completeActivity, listActivities } from '@/api/activities.api';
import { listEvents } from '@/api/calendar.api';
import { getApiErrorMessage } from '@/api/client';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { Kpi, KpiRow, MeterRow, Panel, type IconName } from '@/components/common/Panel';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { ScreenState } from '@/components/common/ScreenState';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useResponsive } from '@/hooks/useResponsive';
import type { AppStackParamList } from '@/navigation/types';
import { bucketOf, completionTiming } from '@/screens/activities/ActivitiesScreen';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Activity, CalendarEvent } from '@/types';
import { confirmAction } from '@/utils/confirm';
import { relativeDay } from '@/utils/dates';

type Props = NativeStackScreenProps<AppStackParamList, 'EmployeeDashboard'>;

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * An employee's own work figures (exported for tests). "Mine" is
 * what is assigned to me; general team tasks anyone may pick up
 * are counted separately until I complete one.
 */
export function employeeStats(tasks: Activity[], meId: string | undefined, now = new Date()) {
  const work = tasks.filter(t => t.type !== 'NOTE');
  const mine = work.filter(t => t.assignedToId === meId);
  const open = mine.filter(t => t.status === 'PENDING');
  const doneByMe = work.filter(t => t.status === 'COMPLETED' && (t.completedById ?? t.assignedToId) === meId);
  const timed = doneByMe.map(completionTiming).filter((x): x is string => x !== null);
  const onTime = timed.filter(x => x === 'on time').length;
  const today = startOfDay(now).getTime();

  // Completed per day, oldest first, for the last 7 days.
  const week = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(today - (6 - i) * DAY);
    return {
      label: day.toLocaleDateString('en-IN', { weekday: 'short' }),
      value: doneByMe.filter(t => t.completedAt && startOfDay(new Date(t.completedAt)).getTime() === day.getTime()).length,
    };
  });

  return {
    open: open.length,
    dueToday: open.filter(t => bucketOf(t, now) === 'today').length,
    overdue: open.filter(t => bucketOf(t, now) === 'overdue').length,
    done: doneByMe.length,
    doneThisWeek: week.reduce((sum, d) => sum + d.value, 0),
    onTime,
    late: timed.length - onTime,
    /** 0–100, or null when nothing with a due date has been completed yet. */
    onTimeRate: timed.length ? Math.round((onTime / timed.length) * 100) : null,
    teamOpen: work.filter(t => !t.assignedToId && t.status === 'PENDING').length,
    week,
    /** What to do next: my tasks and open team tasks, most urgent first. */
    next: work
      .filter(t => t.status === 'PENDING' && (t.assignedToId === meId || !t.assignedToId))
      .sort((a, b) => (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999')),
  };
}

/** Employee home: own tasks, score and schedule. No customers or deals — those belong to sales. */
export function EmployeeDashboardScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const layout = useResponsive();
  const me = useAppSelector(state => state.auth.user);

  const [tasks, setTasks] = useState<Activity[] | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [t, e] = await Promise.all([listActivities(), listEvents()]);
      setTasks(t);
      setEvents(e);
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load your work.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const stats = useMemo(() => employeeStats(tasks ?? [], me?.id), [tasks, me?.id]);

  const schedule = useMemo(() => {
    const from = startOfDay(new Date()).getTime();
    return events
      .filter(e => new Date(e.endAt).getTime() >= from)
      .sort((a, b) => a.startAt.localeCompare(b.startAt))
      .slice(0, 4);
  }, [events]);

  const markDone = async (task: Activity) => {
    const ok = await confirmAction('Mark as done?', `“${task.summary}” will be recorded as completed by you, now.`, 'Mark done');
    if (!ok) return;
    setBusyId(task.id);
    try {
      await completeActivity(task.id);
      await load();
    } catch (err) {
      Alert.alert('Could not complete the task', getApiErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const header = (
    <HeroHeader
      title={`Hi, ${me?.name?.split(' ')[0] ?? 'there'}`}
      subtitle={`${me?.jobTitle || 'Employee'} · ${me?.company?.name ?? ''}`}
      icon="briefcase-outline"
      right={
        <PressableScale onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My profile" style={styles.headerBtn}>
          <Ionicons name="person-outline" size={18} color={theme.colors.onPrimary} />
        </PressableScale>
      }
    />
  );

  if (tasks === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}</View>
      </View>
    );
  }

  const links: { label: string; hint: string; icon: IconName; onPress: () => void }[] = [
    { label: 'My tasks', hint: `${stats.open} open`, icon: 'checkbox-outline', onPress: () => navigation.navigate('Activities') },
    { label: 'Calendar', hint: 'Meetings & deadlines', icon: 'calendar-outline', onPress: () => navigation.navigate('Calendar') },
    { label: 'Alerts', hint: 'What needs attention', icon: 'notifications-outline', onPress: () => navigation.navigate('NotificationList') },
    { label: 'Products', hint: 'Price list & stock', icon: 'cube-outline', onPress: () => navigation.navigate('ProductList') },
    { label: 'My team', hint: 'Who I work with', icon: 'people-outline', onPress: () => navigation.navigate('Teams') },
    { label: 'My activity', hint: 'What I have done', icon: 'time-outline', onPress: () => navigation.navigate('TeamActivity') },
    { label: 'Reports', hint: 'My numbers as PDF', icon: 'bar-chart-outline', onPress: () => navigation.navigate('Reports') },
    { label: 'Account', hint: 'Details & password', icon: 'person-circle-outline', onPress: () => navigation.navigate('AccountDetails') },
  ];

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth }]}
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
          <Kpi label="Open tasks" value={stats.open} icon="checkbox-outline" color={theme.colors.primary} />
          <Kpi label="Due today" value={stats.dueToday} icon="today-outline" color={theme.colors.info} />
          <Kpi label="Overdue" value={stats.overdue} icon="alarm-outline" color={stats.overdue ? theme.colors.danger : theme.colors.textMuted} hint={stats.overdue ? 'Do these first' : undefined} />
          <Kpi label="Done this week" value={stats.doneThisWeek} icon="trophy-outline" color={theme.colors.success} />
        </KpiRow>

        <ResponsiveGrid>
          <Panel title="Do next" icon="flash-outline" subtitle="Your tasks and open team tasks, most urgent first" action={{ label: 'All tasks', onPress: () => navigation.navigate('Activities') }}>
            {stats.next.length === 0 ? (
              <Text style={styles.empty}>Nothing pending. New tasks assigned to you will show here.</Text>
            ) : (
              stats.next.slice(0, 5).map(task => {
                const bucket = bucketOf(task);
                const color = bucket === 'overdue' ? theme.colors.danger : bucket === 'today' ? theme.colors.info : theme.colors.textMuted;
                return (
                  <View key={task.id} style={styles.row}>
                    <View style={[styles.bar, { backgroundColor: color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {task.summary}
                      </Text>
                      <Text style={[styles.rowMeta, { color }]}>
                        {task.dueAt ? `Due ${relativeDay(new Date(task.dueAt)).toLowerCase()}` : 'No due date'}
                        {task.assignedToId ? '' : ' · Team task'}
                        {task.createdBy ? ` · from ${task.createdBy.name}` : ''}
                      </Text>
                    </View>
                    <PressableScale onPress={() => markDone(task)} disabled={busyId === task.id} accessibilityRole="button" accessibilityLabel={`Mark done: ${task.summary}`} style={styles.doneBtn}>
                      <Ionicons name={busyId === task.id ? 'hourglass-outline' : 'checkmark'} size={15} color={theme.colors.success} />
                      <Text style={styles.doneText}>Done</Text>
                    </PressableScale>
                  </View>
                );
              })
            )}
          </Panel>

          <Panel title="My score" icon="ribbon-outline" subtitle="How my completed work went">
            <DonutChart
              centerValue={stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%`}
              centerLabel="on time"
              data={[
                { label: 'Done on time', value: stats.onTime, color: theme.colors.success },
                { label: 'Done late', value: stats.late, color: theme.colors.warning },
                { label: 'Open', value: stats.open - stats.overdue, color: theme.colors.info },
                { label: 'Overdue', value: stats.overdue, color: theme.colors.danger },
              ]}
            />
            <View style={{ marginTop: 14 }}>
              <MeterRow label="Tasks completed by me" value={stats.done} max={stats.done + stats.open} color={theme.colors.success} display={`${stats.done} of ${stats.done + stats.open}`} />
              <Text style={styles.note}>{stats.teamOpen} open team task(s) anyone can pick up.</Text>
            </View>
          </Panel>

          <Panel title="Completed in the last 7 days" icon="stats-chart-outline" subtitle="Hover or touch a bar for the day’s count">
            <BarChart data={stats.week} highlightLast />
          </Panel>

          <Panel title="My schedule" icon="calendar-outline" subtitle="Today and coming up" action={{ label: 'Calendar', onPress: () => navigation.navigate('Calendar') }}>
            {schedule.length === 0 ? (
              <Text style={styles.empty}>No meetings or deadlines coming up.</Text>
            ) : (
              schedule.map(e => (
                <View key={e.id} style={styles.row}>
                  <View style={[styles.bar, { backgroundColor: theme.colors.primary }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text style={styles.rowMeta}>
                      {relativeDay(new Date(e.startAt))}, {new Date(e.startAt).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' })}
                      {e.location ? ` · ${e.location}` : ''}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Panel>
        </ResponsiveGrid>

        <Text style={styles.section}>Quick access</Text>
        <View style={styles.links}>
          {links.map(link => (
            <PressableScale key={link.label} onPress={link.onPress} accessibilityRole="button" accessibilityLabel={link.label} style={[styles.link, { flexBasis: layout.kpiColumns === 4 ? '23%' : '47%' }]}>
              <View style={styles.linkIcon}>
                <Ionicons name={link.icon} size={18} color={theme.colors.primary} />
              </View>
              <Text style={styles.linkLabel}>{link.label}</Text>
              <Text style={styles.linkHint} numberOfLines={1}>
                {link.hint}
              </Text>
            </PressableScale>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    empty: { color: theme.colors.textMuted, fontSize: 13, paddingVertical: 8 },
    note: { color: theme.colors.textMuted, fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    bar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
    rowTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    rowMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, backgroundColor: theme.colors.successSoft },
    doneText: { color: theme.colors.success, fontSize: 12, fontWeight: '800' },
    section: { color: theme.colors.text, fontSize: 16, fontWeight: '800', marginTop: 8, marginBottom: 10 },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    link: { flexGrow: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
    linkIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight, marginBottom: 8 },
    linkLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
    linkHint: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  });
}
