import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getApiErrorMessage } from '@/api/client';
import { deleteEvent, listEvents } from '@/api/calendar.api';
import { ActionButton, InfoRow, Kpi, KpiRow } from '@/components/common/Panel';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { Fab } from '@/components/common/Fab';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { usePdfCompany } from '@/hooks/usePdfCompany';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { CalendarEvent, CalendarEventType } from '@/types';
import { confirmAction } from '@/utils/confirm';
import { toDateInput } from '@/utils/dates';
import { exportPdf, reportHtml } from '@/utils/pdf';

type Props = NativeStackScreenProps<AppStackParamList, 'Calendar'>;
type Mode = 'month' | 'week' | 'agenda';
type TypeFilter = 'ALL' | CalendarEventType;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const TYPE_META: Record<CalendarEventType, { label: string; icon: IconName }> = {
  MEETING: { label: 'Meeting', icon: 'people-outline' },
  CALL: { label: 'Call', icon: 'call-outline' },
  FOLLOW_UP: { label: 'Follow-up', icon: 'return-up-forward-outline' },
  DEADLINE: { label: 'Deadline', icon: 'flag-outline' },
  OTHER: { label: 'Other', icon: 'ellipse-outline' },
};

export function typeColor(theme: Theme, type: CalendarEventType): string {
  switch (type) {
    case 'MEETING':
      return theme.colors.primary;
    case 'CALL':
      return theme.colors.success;
    case 'FOLLOW_UP':
      return theme.colors.warning;
    case 'DEADLINE':
      return theme.colors.danger;
    default:
      return theme.colors.accent;
  }
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

/** Monday-first 6×7 grid of dates covering the month. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export function weekDays(anchor: Date): Date[] {
  const offset = (anchor.getDay() + 6) % 7;
  const monday = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
  return Array.from({ length: 7 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
}

export function CalendarScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const me = useAppSelector(state => state.auth.user);
  const company = usePdfCompany();

  const [events, setEvents] = useState<CalendarEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [type, setType] = useState<TypeFilter>('ALL');
  const [mineOnly, setMineOnly] = useState(false);
  const [detail, setDetail] = useState<CalendarEvent | null>(null);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setEvents(await listEvents());
      setError(null);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not load the calendar.'));
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const visible = useMemo(() => {
    return (events ?? []).filter(e => {
      if (type !== 'ALL' && e.type !== type) return false;
      if (mineOnly && e.createdById !== me?.id && !e.attendeeIds.some(a => a.id === me?.id)) return false;
      return true;
    });
  }, [events, type, mineOnly, me?.id]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visible) {
      const k = toDateInput(new Date(e.startAt));
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    for (const list of map.values()) list.sort((a, b) => a.startAt.localeCompare(b.startAt));
    return map;
  }, [visible]);

  const stats = useMemo(() => {
    const now = new Date();
    const today = startOfDay(now);
    const week = weekDays(now);
    const weekEnd = new Date(week[6].getTime() + 86_400_000);
    const all = events ?? [];
    return {
      today: all.filter(e => sameDay(new Date(e.startAt), today)).length,
      week: all.filter(e => new Date(e.startAt) >= week[0] && new Date(e.startAt) < weekEnd).length,
      upcoming: all.filter(e => new Date(e.startAt) >= now).length,
      deadlines: all.filter(e => e.type === 'DEADLINE' && new Date(e.startAt) >= now && new Date(e.startAt).getTime() - now.getTime() < 14 * 86_400_000).length,
    };
  }, [events]);

  const canDelete = (e: CalendarEvent) => me?.role === 'OWNER' || me?.role === 'ADMIN' || me?.role === 'MANAGER' || e.createdById === me?.id;

  const remove = async (e: CalendarEvent) => {
    const ok = await confirmAction('Delete event?', `“${e.title}” will be removed for everyone.`, 'Delete');
    if (!ok) return;
    try {
      await deleteEvent(e.id);
      setDetail(null);
      load();
    } catch (err) {
      Alert.alert('Could not delete', getApiErrorMessage(err));
    }
  };

  const shift = (dir: -1 | 1) => {
    if (mode === 'month') setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + dir, 1));
    else {
      const next = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + dir * 7);
      setCursor(next);
      setSelected(next);
    }
  };

  const exportAgenda = async () => {
    setExporting(true);
    try {
      const from = startOfDay(new Date());
      const upcoming = visible.filter(e => new Date(e.startAt) >= from).sort((a, b) => a.startAt.localeCompare(b.startAt)).slice(0, 120);
      await exportPdf(
        reportHtml({
          title: 'Calendar agenda',
          subtitle: `From ${from.toLocaleDateString('en-IN')} · ${type === 'ALL' ? 'all types' : TYPE_META[type].label}${mineOnly ? ' · mine only' : ''}`,
          company: await company(),
          kpis: [
            { label: 'Today', value: String(stats.today) },
            { label: 'This week', value: String(stats.week) },
            { label: 'Upcoming', value: String(stats.upcoming) },
            { label: 'Deadlines (14 days)', value: String(stats.deadlines) },
          ],
          sections: [
            {
              title: 'Upcoming events',
              table: [
                ['Date', 'Time', 'Type', 'Title', 'Where', 'Related', 'Attendees'],
                ...upcoming.map(e => [
                  new Date(e.startAt).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }),
                  `${time(e.startAt)}–${time(e.endAt)}`,
                  TYPE_META[e.type].label,
                  e.title,
                  e.location ?? '',
                  e.customerId?.name ?? e.leadId?.name ?? e.opportunityId?.title ?? '',
                  e.attendeeIds.map(a => a.name).join(', '),
                ]),
              ],
            },
          ],
        }),
        'Calendar-agenda.pdf',
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title="Calendar"
      subtitle={stats.today ? `${stats.today} event(s) today · ${stats.week} this week` : `${stats.upcoming} upcoming`}
      icon="calendar-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        <PressableScale onPress={exportAgenda} accessibilityRole="button" accessibilityLabel="Download agenda PDF" style={styles.headerBtn}>
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={18} color={theme.colors.onPrimary} />
        </PressableScale>
      }
    />
  );

  if (events === null) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1].map(i => <SkeletonCard key={i} lines={4} />)}</View>
      </View>
    );
  }

  // screen padding 32 + card padding 12 + six 2px gaps between seven cells
  const cell = Math.floor((Math.min(width, 760) - 32 - 12 - 12) / 7);
  const selectedKey = toDateInput(selected);
  const dayEvents = byDay.get(selectedKey) ?? [];
  const title =
    mode === 'month'
      ? cursor.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
      : (() => {
          const w = weekDays(cursor);
          return `${w[0].toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${w[6].toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        })();

  const agendaDays = [...byDay.entries()]
    .filter(([k]) => k >= toDateInput(new Date()))
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 30);

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
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
          <Kpi label="Today" value={stats.today} icon="today-outline" color={theme.colors.primary} />
          <Kpi label="This week" value={stats.week} icon="calendar-number-outline" color={theme.colors.info} />
          <Kpi label="Upcoming" value={stats.upcoming} icon="time-outline" color={theme.colors.success} />
          <Kpi label="Deadlines (14 d)" value={stats.deadlines} icon="flag-outline" color={theme.colors.danger} />
        </KpiRow>

        <SegmentedControl<Mode>
          accessibilityLabel="Calendar view"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'agenda', label: 'Agenda' },
          ]}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip label="All" active={type === 'ALL'} onPress={() => setType('ALL')} />
          {(Object.keys(TYPE_META) as CalendarEventType[]).map(t => (
            <Chip key={t} label={TYPE_META[t].label} color={typeColor(theme, t)} active={type === t} onPress={() => setType(type === t ? 'ALL' : t)} />
          ))}
          <Chip label="Mine only" icon="person-outline" active={mineOnly} onPress={() => setMineOnly(!mineOnly)} />
        </ScrollView>

        {mode !== 'agenda' ? (
          <View style={styles.card}>
            <View style={styles.navRow}>
              <PressableScale onPress={() => shift(-1)} accessibilityLabel="Previous" style={styles.navBtn}>
                <Ionicons name="chevron-back" size={18} color={theme.colors.text} />
              </PressableScale>
              <Text style={styles.navTitle}>{title}</Text>
              <PressableScale
                onPress={() => {
                  const t = startOfDay(new Date());
                  setCursor(t);
                  setSelected(t);
                }}
                accessibilityLabel="Go to today"
                style={styles.todayBtn}
              >
                <Text style={styles.todayText}>Today</Text>
              </PressableScale>
              <PressableScale onPress={() => shift(1)} accessibilityLabel="Next" style={styles.navBtn}>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </PressableScale>
            </View>
            <View style={styles.weekHead}>
              {WEEKDAYS.map(d => (
                <Text key={d} style={[styles.weekHeadText, { width: cell }]}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {(mode === 'month' ? monthGrid(cursor.getFullYear(), cursor.getMonth()) : weekDays(cursor)).map(d => {
                const key = toDateInput(d);
                const list = byDay.get(key) ?? [];
                const outside = mode === 'month' && d.getMonth() !== cursor.getMonth();
                const isSel = key === selectedKey;
                const isToday = sameDay(d, new Date());
                return (
                  <Pressable
                    key={key}
                    onPress={() => setSelected(d)}
                    onLongPress={() => navigation.navigate('EventForm', { date: key })}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.toDateString()}, ${list.length} events`}
                    style={[
                      styles.day,
                      { width: cell, height: mode === 'month' ? cell + 6 : cell + 30 },
                      isSel && { backgroundColor: theme.colors.primary },
                      !isSel && isToday && { borderColor: theme.colors.primary, borderWidth: 1.5 },
                    ]}
                  >
                    <Text style={[styles.dayNum, outside && { color: theme.colors.textFaint }, isSel && { color: theme.colors.onPrimary }]}>{d.getDate()}</Text>
                    <View style={styles.dots}>
                      {list.slice(0, 3).map(e => (
                        <View key={e.id} style={[styles.dot, { backgroundColor: isSel ? theme.colors.onPrimary : typeColor(theme, e.type) }]} />
                      ))}
                    </View>
                    {mode === 'week' && list.length > 0 ? (
                      <Text style={[styles.weekCount, isSel && { color: theme.colors.onPrimary }]}>{list.length}</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {mode !== 'agenda' ? (
          <>
            <View style={styles.listHead}>
              <Text style={styles.listTitle}>{selected.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
              <PressableScale onPress={() => navigation.navigate('EventForm', { date: selectedKey })} accessibilityRole="button" style={styles.addBtn}>
                <Ionicons name="add" size={16} color={theme.colors.primary} />
                <Text style={styles.addText}>Add</Text>
              </PressableScale>
            </View>
            {dayEvents.length === 0 ? (
              <Text style={styles.empty}>Nothing scheduled. Long-press a date to add an event.</Text>
            ) : (
              dayEvents.map((e, i) => <EventCard key={e.id} event={e} index={i} onPress={() => setDetail(e)} />)
            )}
          </>
        ) : agendaDays.length === 0 ? (
          <ScreenState kind="empty" title="No upcoming events" message="Tap “New event” to schedule a meeting, call or deadline." />
        ) : (
          agendaDays.map(([k, list]) => (
            <View key={k}>
              <Text style={styles.agendaDay}>{new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</Text>
              {list.map((e, i) => (
                <EventCard key={e.id} event={e} index={i} onPress={() => setDetail(e)} />
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <Fab label="New event" icon="add" onPress={() => navigation.navigate('EventForm', { date: selectedKey })} />

      <Modal visible={!!detail} transparent animationType="slide" onRequestClose={() => setDetail(null)}>
        <Pressable style={styles.backdrop} onPress={() => setDetail(null)} accessibilityLabel="Close" />
        {detail ? (
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <View style={[styles.typeIcon, { backgroundColor: `${typeColor(theme, detail.type)}22` }]}>
                <Ionicons name={TYPE_META[detail.type].icon} size={20} color={typeColor(theme, detail.type)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sheetType, { color: typeColor(theme, detail.type) }]}>{TYPE_META[detail.type].label}</Text>
                <Text style={styles.sheetTitle}>{detail.title}</Text>
              </View>
              <PressableScale onPress={() => setDetail(null)} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={theme.colors.textMuted} />
              </PressableScale>
            </View>
            <ScrollView style={{ maxHeight: 380 }}>
              <InfoRow icon="calendar-outline" label="When" value={`${new Date(detail.startAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}, ${time(detail.startAt)}–${time(detail.endAt)}`} />
              <InfoRow icon="hourglass-outline" label="Duration" value={`${Math.round((new Date(detail.endAt).getTime() - new Date(detail.startAt).getTime()) / 60000)} min`} />
              <InfoRow icon="location-outline" label="Where" value={detail.location} />
              {detail.customerId ? (
                <InfoRow icon="business-outline" label="Customer" value={detail.customerId.name} onPress={() => { setDetail(null); navigation.navigate('CustomerDetail', { customerId: detail.customerId!.id, customerName: detail.customerId!.name }); }} />
              ) : null}
              {detail.leadId ? (
                <InfoRow icon="person-outline" label="Lead" value={detail.leadId.name} onPress={() => { setDetail(null); navigation.navigate('LeadDetail', { leadId: detail.leadId!.id, leadName: detail.leadId!.name }); }} />
              ) : null}
              {detail.opportunityId ? <InfoRow icon="git-branch-outline" label="Deal" value={detail.opportunityId.title} /> : null}
              <InfoRow icon="people-outline" label="Attendees" value={detail.attendeeIds.map(a => a.name).join(', ') || 'Only the organiser'} />
              {detail.notes ? <Text style={styles.notes}>{detail.notes}</Text> : null}
            </ScrollView>
            {canDelete(detail) ? (
              <View style={{ marginTop: 14 }}>
                <ActionButton label="Delete event" icon="trash-outline" variant="danger" onPress={() => remove(detail)} />
              </View>
            ) : null}
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

function EventCard({ event: e, index, onPress }: { event: CalendarEvent; index: number; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = typeColor(theme, e.type);
  const past = new Date(e.endAt) < new Date();
  const related = e.customerId?.name ?? e.leadId?.name ?? e.opportunityId?.title;
  return (
    <FadeInView index={index}>
      <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${TYPE_META[e.type].label} ${e.title} at ${time(e.startAt)}`} style={[styles.event, { borderLeftColor: color, opacity: past ? 0.6 : 1 }]}>
        <View style={styles.eventTime}>
          <Text style={styles.eventStart}>{time(e.startAt)}</Text>
          <Text style={styles.eventEnd}>{time(e.endAt)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.eventTitle} numberOfLines={1}>
            {e.title}
          </Text>
          <View style={styles.eventMetaRow}>
            <Ionicons name={TYPE_META[e.type].icon} size={12} color={color} />
            <Text style={[styles.eventMeta, { color }]}>{TYPE_META[e.type].label}</Text>
            {e.location ? <Text style={styles.eventMeta} numberOfLines={1}>· {e.location}</Text> : null}
          </View>
          {related || e.attendeeIds.length ? (
            <Text style={styles.eventMeta} numberOfLines={1}>
              {related ? `${related}` : ''}
              {related && e.attendeeIds.length ? ' · ' : ''}
              {e.attendeeIds.length ? `${e.attendeeIds.length} attendee(s)` : ''}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
      </PressableScale>
    </FadeInView>
  );
}

function Chip({ label, active, onPress, color, icon }: { label: string; active: boolean; onPress: () => void; color?: string; icon?: IconName }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const c = color ?? theme.colors.primary;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active ? { backgroundColor: c, borderColor: c } : null]}>
      {icon ? <Ionicons name={icon} size={13} color={active ? theme.colors.onPrimary : theme.colors.textSecondary} /> : color ? <View style={[styles.chipDot, { backgroundColor: active ? theme.colors.onPrimary : c }]} /> : null}
      <Text style={[styles.chipText, active ? { color: theme.colors.onPrimary } : null]}>{label}</Text>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 110, width: '100%', maxWidth: 760, alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    chips: { gap: 8, paddingVertical: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 6, marginBottom: 14 },
    navRow: { flexDirection: 'row', alignItems: 'center', gap: 6, padding: 6 },
    navBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceAlt },
    navTitle: { flex: 1, color: theme.colors.text, fontSize: 16, fontWeight: '800', textAlign: 'center' },
    todayBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99, backgroundColor: theme.colors.primaryLight },
    todayText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    weekHead: { flexDirection: 'row', justifyContent: 'center', gap: 2, marginTop: 4 },
    weekHeadText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 11, fontWeight: '800' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 2, paddingBottom: 6 },
    day: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, borderRadius: 12 },
    dayNum: { color: theme.colors.text, fontSize: 14, fontWeight: '700' },
    dots: { flexDirection: 'row', gap: 3, marginTop: 4 },
    dot: { width: 6, height: 6, borderRadius: 3 },
    weekCount: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', marginTop: 4 },
    listHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    listTitle: { color: theme.colors.text, fontSize: 15, fontWeight: '800' },
    addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
    addText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 18 },
    agendaDay: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 14, marginBottom: 8 },
    event: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, padding: 12, marginBottom: 8 },
    eventTime: { width: 54, alignItems: 'flex-start' },
    eventStart: { color: theme.colors.text, fontWeight: '800', fontSize: 13 },
    eventEnd: { color: theme.colors.textFaint, fontSize: 11, marginTop: 2 },
    eventTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    eventMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    eventMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 30, width: '100%', maxWidth: 760, alignSelf: 'center' },
    sheetHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: theme.colors.border, alignSelf: 'center', marginBottom: 12 },
    sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
    typeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    sheetType: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
    sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    notes: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 10, backgroundColor: theme.colors.surfaceAlt, borderRadius: 10, padding: 10 },
  });
}
