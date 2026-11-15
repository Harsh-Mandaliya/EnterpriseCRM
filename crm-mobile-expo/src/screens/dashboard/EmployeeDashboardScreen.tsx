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
import { usePdfCompany } from '@/hooks/usePdfCompany';
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
import { exportPdf, reportHtml } from '@/utils/pdf';

type Props = NativeStackScreenProps<AppStackParamList, 'EmployeeDashboard'>;

const DAY = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const TYPE_ICON: Record<string, IconName> = { CALL: 'call-outline', EMAIL: 'mail-outline', MEETING: 'people-outline', TASK: 'checkbox-outline' };
const shortDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—');

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
    /** What I completed, newest first. */
    completed: [...doneByMe].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? '')),
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
  const [exporting, setExporting] = useState(false);
  const company = usePdfCompany();

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

  // Today: what I finished against what was due today or is still overdue.
  const doneToday = stats.week[6].value;
  const todayTotal = doneToday + stats.dueToday + stats.overdue;
  const todayLine =
    todayTotal === 0
      ? 'Nothing is due today. Pick up a team task or plan ahead.'
      : stats.dueToday + stats.overdue === 0
        ? 'All of today’s work is done. Well done!'
        : `${stats.overdue ? `${stats.overdue} overdue, ` : ''}${stats.dueToday} due today — ${doneToday} finished so far.`;

  const downloadReport = async () => {
    setExporting(true);
    try {
      await exportPdf(
        reportHtml({
          title: 'My work report',
          subtitle: `${me?.name ?? ''} · ${me?.jobTitle || 'Employee'}`,
          company: await company(),
          kpis: [
            { label: 'Open tasks', value: String(stats.open) },
            { label: 'Overdue', value: String(stats.overdue) },
            { label: 'Completed', value: String(stats.done) },
            { label: 'On time', value: stats.onTimeRate === null ? '—' : `${stats.onTimeRate}%` },
          ],
          sections: [
            {
              title: 'Open work',
              table: [
                ['Task', 'Type', 'Due', 'Status', 'Assigned by'],
                ...stats.next.map(t => [t.summary, t.assignedToId ? t.type : `${t.type} (team)`, shortDate(t.dueAt), bucketOf(t) === 'overdue' ? 'Overdue' : bucketOf(t) === 'today' ? 'Due today' : 'Upcoming', t.createdBy?.name ?? '']),
              ],
            },
            {
              title: 'Completed work',
              table: [
                ['Task', 'Due', 'Completed', 'Result'],
                ...stats.completed.slice(0, 60).map(t => [t.summary, shortDate(t.dueAt), shortDate(t.completedAt), completionTiming(t) ?? 'no due date']),
              ],
            },
            {
              title: 'Coming up',
              table: [['When', 'Event', 'Where'], ...schedule.map(e => [new Date(e.startAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }), e.title, e.location ?? ''])],
            },
          ],
        }),
        'My-work-report.pdf',
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title={`Hi, ${me?.name?.split(' ')[0] ?? 'there'}`}
      subtitle={`${me?.jobTitle || 'Employee'} · ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}`}
      icon="briefcase-outline"
      right={
        <View style={styles.headerBtns}>
          <PressableScale onPress={downloadReport} disabled={exporting} accessibilityRole="button" accessibilityLabel="Download my work report as PDF" style={styles.headerBtn}>
            <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={18} color={theme.colors.onPrimary} />
          </PressableScale>
          <PressableScale onPress={() => navigation.navigate('Profile')} accessibilityRole="button" accessibilityLabel="My profile" style={styles.headerBtn}>
            <Ionicons name="person-outline" size={18} color={theme.colors.onPrimary} />
          </PressableScale>
        </View>
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

  const tones = [theme.colors.primary, theme.colors.info, theme.colors.danger, theme.colors.success, theme.colors.accent, theme.colors.warning, theme.colors.info, theme.colors.primary];
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
        <View style={styles.today}>
          <View style={styles.todayHead}>
            <View style={styles.todayIcon}>
              <Ionicons name={stats.overdue ? 'alert-circle-outline' : 'sunny-outline'} size={20} color={stats.overdue ? theme.colors.danger : theme.colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.todayTitle}>Today</Text>
              <Text style={styles.todayText}>{todayLine}</Text>
            </View>
            <Text style={styles.todayCount}>
              {doneToday}/{todayTotal}
            </Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${todayTotal ? Math.round((doneToday / todayTotal) * 100) : 0}%` }]} />
          </View>
        </View>

        <Text style={styles.section}>Overview</Text>
        <KpiRow>
          <Kpi label="Open tasks" value={stats.open} icon="checkbox-outline" color={theme.colors.primary} />
          <Kpi label="Due today" value={stats.dueToday} icon="today-outline" color={theme.colors.info} />
          <Kpi label="Overdue" value={stats.overdue} icon="alarm-outline" color={stats.overdue ? theme.colors.danger : theme.colors.textMuted} hint={stats.overdue ? 'Do these first' : undefined} />
          <Kpi label="Done this week" value={stats.doneThisWeek} icon="trophy-outline" color={theme.colors.success} />
        </KpiRow>

        <Text style={styles.section}>My work</Text>
        <ResponsiveGrid>
          <Panel title="Do next" icon="flash-outline" subtitle="Your tasks and open team tasks, most urgent first" action={{ label: 'All tasks', onPress: () => navigation.navigate('Activities') }}>
            {stats.next.length === 0 ? (
              <Text style={styles.empty}>Nothing pending. New tasks assigned to you will show here.</Text>
            ) : (
              stats.next.slice(0, 5).map(task => {
                const bucket = bucketOf(task);
                const color = bucket === 'overdue' ? theme.colors.danger : bucket === 'today' ? theme.colors.info : theme.colors.textMuted;
                const tag = bucket === 'overdue' ? 'Overdue' : bucket === 'today' ? 'Today' : bucket === 'nodate' ? 'No date' : 'Upcoming';
                return (
                  <View key={task.id} style={styles.row}>
                    <View style={[styles.typeIcon, { backgroundColor: `${color}1F` }]}>
                      <Ionicons name={TYPE_ICON[task.type] ?? 'checkbox-outline'} size={16} color={color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={2}>
                        {task.summary}
                      </Text>
                      <View style={styles.tags}>
                        <Text style={[styles.tag, { color, backgroundColor: `${color}1F` }]}>{tag}</Text>
                        {task.assignedToId ? null : <Text style={[styles.tag, { color: theme.colors.accent, backgroundColor: `${theme.colors.accent}1F` }]}>Team task</Text>}
                        <Text style={styles.rowMeta} numberOfLines={1}>
                          {task.dueAt ? `Due ${relativeDay(new Date(task.dueAt)).toLowerCase()}` : 'No due date'}
                          {task.createdBy ? ` · from ${task.createdBy.name}` : ''}
                        </Text>
                      </View>
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

          <Panel title="My schedule" icon="calendar-outline" subtitle="Today and coming up" action={{ label: 'Calendar', onPress: () => navigation.navigate('Calendar') }}>
            {schedule.length === 0 ? (
              <Text style={styles.empty}>No meetings or deadlines coming up.</Text>
            ) : (
              schedule.map(e => (
                <View key={e.id} style={styles.row}>
                  <View style={styles.dateBox}>
                    <Text style={styles.dateDay}>{new Date(e.startAt).getDate()}</Text>
                    <Text style={styles.dateMonth}>{new Date(e.startAt).toLocaleDateString('en-IN', { month: 'short' })}</Text>
                  </View>
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

        <Text style={styles.section}>My performance</Text>
        <ResponsiveGrid>
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

        </ResponsiveGrid>

        <Text style={styles.section}>Quick access</Text>
        <View style={styles.links}>
          {links.map((link, i) => (
            <PressableScale key={link.label} onPress={link.onPress} accessibilityRole="button" accessibilityLabel={link.label} style={[styles.link, { flexBasis: layout.kpiColumns === 4 ? '23%' : '47%' }]}>
              <View style={[styles.linkIcon, { backgroundColor: `${tones[i % tones.length]}1F` }]}>
                <Ionicons name={link.icon} size={18} color={tones[i % tones.length]} />
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
    headerBtns: { flexDirection: 'row', gap: 8 },
    today: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 14 },
    todayHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    todayIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    todayTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    todayText: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
    todayCount: { color: theme.colors.primary, fontSize: 22, fontWeight: '800' },
    track: { height: 8, borderRadius: 4, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
    fill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.success },
    typeIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    tags: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 4 },
    tag: { fontSize: 10, fontWeight: '800', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99, overflow: 'hidden' },
    dateBox: { width: 40, height: 42, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    dateDay: { color: theme.colors.primary, fontSize: 15, fontWeight: '800', lineHeight: 17 },
    dateMonth: { color: theme.colors.primary, fontSize: 10, fontWeight: '700' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    empty: { color: theme.colors.textMuted, fontSize: 13, paddingVertical: 8 },
    note: { color: theme.colors.textMuted, fontSize: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    rowTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    rowMeta: { color: theme.colors.textMuted, fontSize: 12, flexShrink: 1 },
    doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 99, backgroundColor: theme.colors.successSoft },
    doneText: { color: theme.colors.success, fontSize: 12, fontWeight: '800' },
    section: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase', marginTop: 18, marginBottom: 10 },
    links: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    link: { flexGrow: 1, minWidth: 150, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 12 },
    linkIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    linkLabel: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
    linkHint: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
  });
}
