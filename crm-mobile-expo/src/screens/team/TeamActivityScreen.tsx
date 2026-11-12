import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { useResponsive } from '@/hooks/useResponsive';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  describeWork,
  getTeamPerformance,
  getWorkLog,
  workIcon,
  type MemberPerformance,
  type TeamPerformance,
  type WorkLogEntry,
} from '@/api/insights.api';
import { ActionButton, Kpi, KpiRow, Panel } from '@/components/common/Panel';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { usePdfCompany } from '@/hooks/usePdfCompany';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import { exportPdf, reportHtml } from '@/utils/pdf';

type Props = NativeStackScreenProps<AppStackParamList, 'TeamActivity'>;
type Tab = 'people' | 'feed';
type Kind = 'all' | 'lead' | 'deal' | 'task' | 'money';

const PERIODS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
] as const;

const KIND_PREFIX: Record<Exclude<Kind, 'all'>, string[]> = {
  lead: ['lead', 'customer'],
  deal: ['deal'],
  task: ['task', 'event'],
  money: ['invoice', 'payment'],
};

export function scopeLabel(role: string | undefined): string {
  if (role === 'OWNER' || role === 'ADMIN') return 'Whole company';
  if (role === 'MANAGER') return 'You and your team';
  return 'Your own work';
}

export function relativeTime(iso: string | null): string {
  if (!iso) return 'never';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function TeamActivityScreen({ navigation, route }: Props) {
  const target = route.params?.targetId ? route.params : null;
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const layout = useResponsive();
  const pad = { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth };
  const role = useAppSelector(state => state.auth.user?.role);
  const company = usePdfCompany();

  const [tab, setTab] = useState<Tab>(target ? 'feed' : 'people');
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [kind, setKind] = useState<Kind>('all');
  const [person, setPerson] = useState<string | null>(null);
  const [perf, setPerf] = useState<TeamPerformance | null>(null);
  const [feed, setFeed] = useState<WorkLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      if (target) {
        setFeed(await getWorkLog({ targetType: target.targetType, targetId: target.targetId, limit: 200 }));
      } else {
        const [p, f] = await Promise.all([
          getTeamPerformance(Number(days)),
          getWorkLog({ days: Number(days), userId: person ?? undefined, limit: 300 }),
        ]);
        setPerf(p);
        setFeed(f);
      }
      setError(null);
    } catch {
      setError('Could not load team activity.');
    }
  }, [days, person, target]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const filtered = useMemo(() => {
    if (!feed) return [];
    if (kind === 'all') return feed;
    return feed.filter(e => KIND_PREFIX[kind].some(p => e.action.startsWith(p)));
  }, [feed, kind]);

  const grouped = useMemo(() => {
    const map = new Map<string, WorkLogEntry[]>();
    for (const e of filtered) {
      const k = dayKey(e.at);
      map.set(k, [...(map.get(k) ?? []), e]);
    }
    return [...map.entries()];
  }, [filtered]);

  const openTarget = (e: WorkLogEntry) => {
    if (!e.targetId) return;
    if (e.targetType === 'Lead') navigation.navigate('LeadDetail', { leadId: e.targetId, leadName: e.label ?? 'Lead' });
    else if (e.targetType === 'Customer') navigation.navigate('CustomerDetail', { customerId: e.targetId, customerName: e.label ?? 'Customer' });
    else if (e.targetType === 'Invoice') navigation.navigate('InvoiceDetail', { invoiceId: e.targetId });
    else if (e.targetType === 'Opportunity') navigation.navigate('TeamActivity', { targetType: 'Opportunity', targetId: e.targetId, title: e.label ?? 'Deal' });
  };

  const exportReport = async () => {
    if (!perf) return;
    setExporting(true);
    try {
      const rows = perf.members.map(m => [
        m.user.name,
        m.user.role,
        `${m.leads.open} open / ${m.leads.converted} won`,
        `${m.deals.open} (${formatCompactCurrency(m.deals.openValue)})`,
        `${m.deals.won} (${formatCompactCurrency(m.deals.wonValue)})`,
        `${m.tasks.completed} done / ${m.tasks.overdue} late`,
        formatCompactCurrency(m.collected.total),
        m.flags.join('; ') || 'On track',
      ]);
      await exportPdf(
        reportHtml({
          title: 'Team performance',
          subtitle: `Last ${perf.days} days · ${scopeLabel(role)}`,
          company: await company(),
          kpis: [
            { label: 'Open pipeline', value: formatCompactCurrency(perf.totals.openPipeline) },
            { label: 'Won', value: formatCompactCurrency(perf.totals.wonValue) },
            { label: 'Collected', value: formatCompactCurrency(perf.totals.collected) },
            { label: 'Tasks done / late', value: `${perf.totals.tasksCompleted} / ${perf.totals.tasksOverdue}` },
          ],
          sections: [
            {
              title: 'Who did what',
              table: [['Person', 'Role', 'Leads', 'Open deals', 'Won', 'Tasks', 'Collected', 'Needs attention'], ...rows],
            },
            {
              title: 'Recent activity',
              table: [['When', 'Who', 'What'], ...(feed ?? []).slice(0, 60).map(e => [new Date(e.at).toLocaleString('en-IN'), e.actor?.name ?? '—', describeWork(e)])],
            },
          ],
        }),
        'Team-performance.pdf',
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title={target ? (target.title ?? 'History') : 'Team activity'}
      subtitle={target ? 'Every change, who made it and when' : `${scopeLabel(role)} · who did what`}
      icon={target ? 'time-outline' : 'people-circle-outline'}
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  const loading = target ? !feed : !perf || !feed;
  if (loading) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}</View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, pad]}
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
        {!target ? (
          <>
            <View style={styles.controls}>
              <SegmentedControl<Tab>
                options={[
                  { value: 'people', label: 'People' },
                  { value: 'feed', label: 'Activity feed' },
                ]}
                value={tab}
                onChange={setTab}
                accessibilityLabel="View"
              />
              <SegmentedControl<'7' | '30' | '90'> options={[...PERIODS]} value={days} onChange={setDays} accessibilityLabel="Period" />
            </View>
            {perf ? (
              <KpiRow>
                <Kpi label="Open pipeline" value={perf.totals.openPipeline} money icon="git-branch-outline" color={theme.colors.primary} />
                <Kpi label="Won" value={perf.totals.wonValue} money icon="trophy-outline" color={theme.colors.success} />
                <Kpi label="Tasks done" value={perf.totals.tasksCompleted} icon="checkmark-done-outline" color={theme.colors.info} hint={perf.totals.tasksOverdue ? `${perf.totals.tasksOverdue} overdue` : undefined} />
                <Kpi label="Collected" value={perf.totals.collected} money icon="cash-outline" color={theme.colors.accent} />
              </KpiRow>
            ) : null}
          </>
        ) : null}

        {tab === 'people' && perf && !target ? (
          <>
            <ResponsiveGrid>
            {perf.members.map((m, i) => (
              <FadeInView key={m.user.id} index={i}>
                <MemberCard
                  member={m}
                  selected={person === m.user.id}
                  onPress={() => {
                    setPerson(person === m.user.id ? null : m.user.id);
                    setTab('feed');
                  }}
                />
              </FadeInView>
            ))}
            </ResponsiveGrid>
            <ActionButton label="Download team report (PDF)" icon="download-outline" onPress={exportReport} busy={exporting} />
          </>
        ) : (
          <>
            {!target ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {(['all', 'lead', 'deal', 'task', 'money'] as Kind[]).map(k => (
                  <Chip key={k} label={{ all: 'Everything', lead: 'Leads & customers', deal: 'Deals', task: 'Tasks & meetings', money: 'Invoices & payments' }[k]} active={kind === k} onPress={() => setKind(k)} />
                ))}
                {person && perf ? (
                  <Chip label={`${perf.members.find(m => m.user.id === person)?.user.name ?? 'Person'} ✕`} active onPress={() => setPerson(null)} />
                ) : null}
              </ScrollView>
            ) : null}
            {grouped.length === 0 ? (
              <ScreenState kind="empty" title="Nothing recorded yet" message="Actions such as moving a deal, completing a task or recording a payment appear here." />
            ) : (
              grouped.map(([day, entries], gi) => (
                <FadeInView key={day} index={gi}>
                  <Text style={styles.day}>{day}</Text>
                  <View style={styles.timeline}>
                    {entries.map(e => (
                      <PressableScale key={e.id} onPress={() => openTarget(e)} disabled={!e.targetId || e.targetType === 'Payment'} style={styles.entry} accessibilityLabel={`${e.actor?.name ?? 'Someone'} ${describeWork(e)}`}>
                        <View style={[styles.entryIcon, { backgroundColor: theme.colors.primaryLight }]}>
                          <Ionicons name={workIcon(e.action) as never} size={15} color={theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.entryText}>
                            <Text style={styles.entryWho}>{e.actor?.name ?? 'Someone'}</Text> {describeWork(e)}
                          </Text>
                          <Text style={styles.entryMeta}>
                            {e.actor?.role ? `${e.actor.role.charAt(0)}${e.actor.role.slice(1).toLowerCase()} · ` : ''}
                            {new Date(e.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      </PressableScale>
                    ))}
                  </View>
                </FadeInView>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function MemberCard({ member: m, selected, onPress }: { member: MemberPerformance; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const ok = m.flags.length === 0;
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityLabel={`${m.user.name}, open their activity`}>
      <Panel
        title={m.user.name}
        icon={m.user.role === 'MANAGER' ? 'people-outline' : m.user.role === 'EMPLOYEE' ? 'construct-outline' : m.user.role === 'SALES' ? 'briefcase-outline' : 'shield-outline'}
        subtitle={`${m.user.role.charAt(0)}${m.user.role.slice(1).toLowerCase()} · active ${relativeTime(m.activity.lastActiveAt)} · ${m.activity.actions} actions`}
        style={selected ? { borderColor: theme.colors.primary, borderWidth: 2 } : undefined}
      >
        <View style={styles.statGrid}>
          <Stat label="Open leads" value={String(m.leads.open)} />
          <Stat label="Converted" value={String(m.leads.converted)} good />
          <Stat label="Open deals" value={`${m.deals.open} · ${formatCompactCurrency(m.deals.openValue)}`} />
          <Stat label="Won" value={`${m.deals.won} · ${formatCompactCurrency(m.deals.wonValue)}`} good />
          <Stat label="Tasks done" value={String(m.tasks.completed)} good />
          <Stat label="Tasks pending" value={`${m.tasks.pending}${m.tasks.overdue ? ` (${m.tasks.overdue} late)` : ''}`} bad={m.tasks.overdue > 0} />
          <Stat label="Invoiced" value={formatCompactCurrency(m.invoices.total)} />
          <Stat label="Collected" value={formatCompactCurrency(m.collected.total)} good />
        </View>
        <View style={styles.flags}>
          {ok ? (
            <View style={[styles.flag, { backgroundColor: theme.colors.successSoft }]}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
              <Text style={[styles.flagText, { color: theme.colors.success }]}>On track</Text>
            </View>
          ) : (
            m.flags.map(f => (
              <View key={f} style={[styles.flag, { backgroundColor: theme.colors.dangerSoft }]}>
                <Ionicons name="alert-circle" size={14} color={theme.colors.danger} />
                <Text style={[styles.flagText, { color: theme.colors.danger }]}>{f}</Text>
              </View>
            ))
          )}
        </View>
      </Panel>
    </PressableScale>
  );
}

function Stat({ label, value, good, bad }: { label: string; value: string; good?: boolean; bad?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, good ? { color: theme.colors.success } : bad ? { color: theme.colors.danger } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <PressableScale onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : null]}>
      <Text style={[styles.chipText, active ? { color: theme.colors.onPrimary } : null]}>{label}</Text>
    </PressableScale>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 900, alignSelf: 'center' },
    controls: { gap: 10, marginBottom: 14 },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 },
    stat: { width: '50%', paddingRight: 8 },
    statValue: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    statLabel: { color: theme.colors.textMuted, fontSize: 11, marginTop: 1 },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12 },
    flag: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
    flagText: { fontSize: 12, fontWeight: '700' },
    chips: { gap: 8, paddingBottom: 12 },
    chip: { borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
    chipText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: '700' },
    day: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 6, marginBottom: 8 },
    timeline: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, marginBottom: 12 },
    entry: { flexDirection: 'row', gap: 12, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    entryIcon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    entryText: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
    entryWho: { color: theme.colors.text, fontWeight: '800' },
    entryMeta: { color: theme.colors.textFaint, fontSize: 11, marginTop: 2 },
  });
}
