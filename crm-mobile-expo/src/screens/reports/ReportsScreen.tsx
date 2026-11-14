import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { useResponsive } from '@/hooks/useResponsive';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { getReceivables, getTeamPerformance, type Receivables, type TeamPerformance } from '@/api/insights.api';
import { listLeads } from '@/api/leads.api';
import { listOpportunities } from '@/api/opportunities.api';
import { getLeadConversionReport, getSalesReport, getTopCustomersReport } from '@/api/reports.api';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { ActionButton, Kpi, KpiRow, MeterRow, Panel } from '@/components/common/Panel';
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
import { stageColor, stageLabel } from '@/screens/forms/options';
import { leadFunnel, pipelineKpis, summarizeStages } from '@/screens/pipeline/pipelineMath';
import { scopeLabel } from '@/screens/team/TeamActivityScreen';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Lead, LeadConversionRow, Opportunity, SalesReportRow, TopCustomerRow } from '@/types';
import { exportPdf, inr, reportHtml, type ReportSection } from '@/utils/pdf';
import { can } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'Reports'>;
type Tab = 'overview' | 'sales' | 'money' | 'team';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const METHOD: Record<string, string> = { CASH: 'Cash', CARD: 'Card', BANK_TRANSFER: 'Bank transfer', UPI: 'UPI', OTHER: 'Other' };

interface Data {
  receivables: Receivables;
  team: TeamPerformance;
  deals: Opportunity[];
  leads: Lead[];
  revenue: SalesReportRow[] | null;
  sources: LeadConversionRow[] | null;
  topCustomers: TopCustomerRow[] | null;
}

/**
 * Reports & Analysis. Every number is scoped to the signed-in user
 * (company / team / own). Owners, admins and managers additionally get
 * revenue-by-month, lead sources and top customers. Every view can be
 * downloaded as a PDF report.
 */
export function ReportsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const layout = useResponsive();
  const pad = { paddingHorizontal: layout.gutter, maxWidth: layout.maxWidth };
  const role = useAppSelector(state => state.auth.user?.role);
  const full = can(role, 'reports.view');
  const company = usePdfCompany();

  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const soft = <T,>(p: Promise<T>) => p.catch(() => null);
      const [receivables, team, deals, leads, revenue, sources, topCustomers] = await Promise.all([
        getReceivables(),
        getTeamPerformance(30),
        listOpportunities().catch(() => [] as Opportunity[]),
        listLeads().catch(() => [] as Lead[]),
        full ? soft(getSalesReport(12)) : Promise.resolve(null),
        full ? soft(getLeadConversionReport()) : Promise.resolve(null),
        full ? soft(getTopCustomersReport(10)) : Promise.resolve(null),
      ]);
      setData({ receivables, team, deals, leads, revenue, sources, topCustomers });
      setError(null);
    } catch {
      setError('Could not load reports.');
    }
  }, [full]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const derived = useMemo(() => {
    if (!data) return null;
    return {
      kpis: pipelineKpis(data.deals),
      stages: summarizeStages(data.deals),
      funnel: leadFunnel(data.leads),
      leaders: [...data.team.members].sort((a, b) => b.deals.wonValue - a.deals.wonValue || b.collected.total - a.collected.total),
    };
  }, [data]);

  const exportReport = async (only?: Tab) => {
    if (!data || !derived) return;
    setExporting(true);
    try {
      const r = data.receivables;
      const sections: ReportSection[] = [];
      const want = (t: Tab) => !only || only === t || only === 'overview';
      if (want('sales')) {
        sections.push({
          title: 'Pipeline by stage',
          numeric: [1, 2, 3],
          table: [['Stage', 'Deals', 'Value', 'Weighted'], ...derived.stages.map(s => [stageLabel(s.stage), String(s.count), inr(s.value), inr(s.weighted)])],
        });
        if (data.revenue?.length) sections.push({ title: 'Collected revenue by month (paid invoices)', numeric: [1, 2], table: [['Month', 'Revenue', 'Invoices'], ...data.revenue.map(m => [`${MONTHS[m.month - 1]} ${m.year}`, inr(m.revenue), String(m.invoiceCount)])] });
        if (data.sources?.length) sections.push({ title: 'Lead conversion by source', numeric: [1, 2, 3, 4], table: [['Source', 'Leads', 'Converted', 'Lost', 'Conversion'], ...data.sources.map(s => [s.source.replace('_', ' '), String(s.total), String(s.converted), String(s.lost), `${s.conversionRate}%`])] });
      }
      if (want('money')) {
        sections.push({
          title: 'Receivables ageing (unpaid balance)',
          numeric: [1],
          table: [['Bucket', 'Amount'], ['Not yet due', inr(r.aging.current)], ['1–30 days late', inr(r.aging.d1_30)], ['31–60 days late', inr(r.aging.d31_60)], ['61–90 days late', inr(r.aging.d61_90)], ['Over 90 days late', inr(r.aging.d90plus)]],
        });
        sections.push({
          title: 'Customers — billed, paid and owed',
          numeric: [1, 2, 3, 4, 5],
          table: [['Customer', 'Invoices', 'Billed', 'Paid', 'Outstanding', 'Overdue', 'Last payment'], ...r.byCustomer.map(c => [c.name, String(c.invoices), inr(c.invoiced), inr(c.paid), inr(c.outstanding), inr(c.overdue), c.lastPaymentAt ? new Date(c.lastPaymentAt).toLocaleDateString('en-IN') : '—'])],
        });
        sections.push({ title: 'Payments by method', numeric: [1, 2], table: [['Method', 'Payments', 'Amount'], ...r.byMethod.map(m => [METHOD[m.method] ?? m.method, String(m.count), inr(m.total)])] });
        sections.push({ title: 'Collected by', numeric: [1, 2], table: [['Recorded by', 'Payments', 'Amount'], ...r.collectors.map(c => [c.user?.name ?? '—', String(c.count), inr(c.total)])] });
      }
      if (want('team')) {
        sections.push({
          title: 'Team — who did what (last 30 days)',
          table: [
            ['Person', 'Role', 'Open leads', 'Won deals', 'Tasks done / late', 'Collected', 'Needs attention'],
            ...derived.leaders.map(m => [m.user.name, m.user.role, String(m.leads.open), `${m.deals.won} · ${inr(m.deals.wonValue)}`, `${m.tasks.completed} / ${m.tasks.overdue}`, inr(m.collected.total), m.flags.join('; ') || 'On track']),
          ],
        });
      }
      await exportPdf(
        reportHtml({
          title: only === 'money' ? 'Receivables report' : only === 'team' ? 'Team report' : only === 'sales' ? 'Sales report' : 'Business report',
          subtitle: scopeLabel(role),
          company: await company(),
          kpis: [
            { label: 'Collected', value: inr(r.totals.collected) },
            { label: 'Outstanding', value: inr(r.totals.outstanding) },
            { label: 'Open pipeline', value: inr(derived.kpis.openValue) },
            { label: 'Won', value: inr(derived.kpis.wonValue) },
          ],
          sections,
        }),
        `${only ?? 'business'}-report.pdf`,
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title="Reports & Analysis"
      subtitle={scopeLabel(role)}
      icon="bar-chart-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        <PressableScale onPress={() => exportReport()} accessibilityRole="button" accessibilityLabel="Download full report PDF" style={styles.headerBtn}>
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={18} color={theme.colors.onPrimary} />
        </PressableScale>
      }
    />
  );

  if (!data || !derived) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={4} />)}</View>
      </View>
    );
  }

  const r = data.receivables;
  const { kpis, stages, funnel, leaders } = derived;
  const agingMax = Math.max(1, ...Object.values(r.aging));
  const custMax = Math.max(1, ...r.byCustomer.map(c => c.invoiced));
  const methodColors = [theme.colors.primary, theme.colors.success, theme.colors.accent, theme.colors.warning, theme.colors.info];

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
        <SegmentedControl<Tab>
          accessibilityLabel="Report"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'sales', label: 'Sales' },
            { value: 'money', label: 'Money' },
            { value: 'team', label: 'Team' },
          ]}
        />
        <View style={{ height: 14 }} />

        {tab === 'overview' ? (
          <>
            <KpiRow>
              <Kpi label="Collected" value={r.totals.collected} money icon="cash-outline" color={theme.colors.success} hint={`${r.totals.collectionRate}% of billed`} />
              <Kpi label="Outstanding" value={r.totals.outstanding} money icon="hourglass-outline" color={r.totals.overdue ? theme.colors.danger : theme.colors.warning} hint={r.totals.overdue ? `${formatCompactCurrency(r.totals.overdue)} overdue` : 'nothing overdue'} />
              <Kpi label="Open pipeline" value={kpis.openValue} money icon="git-branch-outline" color={theme.colors.primary} hint={`${kpis.openCount} deals · ${formatCompactCurrency(kpis.weightedForecast)} weighted`} />
              <Kpi label="Won" value={kpis.wonValue} money icon="trophy-outline" color={theme.colors.accent} hint={kpis.winRate === null ? undefined : `${Math.round(kpis.winRate * 100)}% win rate`} />
            </KpiRow>
            <ResponsiveGrid>
            <FadeInView index={0}>
              <Panel title="Money collected per month" icon="cash-outline" subtitle="Payments received">
                {r.monthly.length ? <BarChart data={r.monthly.map(m => ({ label: MONTHS[m.month - 1], value: m.total, color: theme.colors.success }))} format={formatCompactCurrency} highlightLast /> : <Text style={styles.empty}>No payments yet.</Text>}
              </Panel>
            </FadeInView>
            <FadeInView index={1}>
              <Panel title="Pipeline by stage" icon="pie-chart-outline" action={{ label: 'Open pipeline', onPress: () => navigation.navigate('Pipeline') }}>
                <DonutChart
                  data={stages
                    .filter(s => s.count > 0 && s.stage !== 'WON' && s.stage !== 'LOST')
                    .map(s => ({ label: `${stageLabel(s.stage)} ${formatCompactCurrency(s.value)}`, value: s.count, color: stageColor(theme, s.stage) }))}
                  centerValue={formatCompactCurrency(kpis.openValue)}
                  centerLabel={`${kpis.openCount} open deals`}
                />
              </Panel>
            </FadeInView>
            <FadeInView index={2}>
              <Panel title="Lead funnel" icon="funnel-outline">
                {data.leads.length ? (
                  <FunnelChart steps={funnel.map(s => ({ label: s.status.charAt(0) + s.status.slice(1).toLowerCase(), value: s.count, color: s.status === 'CONVERTED' ? theme.colors.success : theme.colors.primary }))} />
                ) : (
                  <Text style={styles.empty}>No leads yet.</Text>
                )}
              </Panel>
            </FadeInView>
            </ResponsiveGrid>
          </>
        ) : null}

        {tab === 'sales' ? (
          <>
            <ResponsiveGrid>
            {data.revenue ? (
              <Panel title="Revenue — last 12 months" icon="trending-up-outline" subtitle={`Paid invoices · ${inr(data.revenue.reduce((s, m) => s + m.revenue, 0))}`}>
                {data.revenue.length ? <BarChart data={data.revenue.map(m => ({ label: MONTHS[m.month - 1], value: m.revenue }))} format={formatCompactCurrency} highlightLast /> : <Text style={styles.empty}>No paid invoices yet.</Text>}
              </Panel>
            ) : null}
            <Panel title="Deals by stage" icon="layers-outline">
              {stages.map(s => (
                <MeterRow key={s.stage} label={`${stageLabel(s.stage)} · ${s.count}`} value={s.value} max={Math.max(1, ...stages.map(x => x.value))} color={stageColor(theme, s.stage)} display={formatCompactCurrency(s.value)} />
              ))}
              <Text style={styles.foot}>
                Average deal {formatCompactCurrency(kpis.averageDeal)} · {kpis.overdueCount} past close date · {formatCompactCurrency(kpis.closingSoonValue)} closing in 30 days
              </Text>
            </Panel>
            {data.sources ? (
              <Panel title="Where good leads come from" icon="git-network-outline" subtitle="Conversion rate by source">
                {data.sources.length === 0 ? (
                  <Text style={styles.empty}>No leads yet.</Text>
                ) : (
                  [...data.sources].sort((a, b) => b.conversionRate - a.conversionRate).map(s => (
                    <MeterRow key={s.source} label={`${s.source.replace('_', ' ')} · ${s.converted}/${s.total}`} value={s.conversionRate} max={100} color={theme.colors.accent} display={`${s.conversionRate}%`} />
                  ))
                )}
              </Panel>
            ) : null}
            {data.topCustomers?.length ? (
              <Panel title="Top customers by revenue" icon="ribbon-outline">
                {data.topCustomers.map(c => (
                  <PressableScale key={c.customerId} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.customerId, customerName: c.customerName })}>
                    <MeterRow label={c.customerName} value={c.revenue} max={data.topCustomers![0].revenue || 1} color={theme.colors.primary} display={formatCompactCurrency(c.revenue)} />
                  </PressableScale>
                ))}
              </Panel>
            ) : null}
            </ResponsiveGrid>
            <ActionButton label="Download sales report (PDF)" icon="download-outline" onPress={() => exportReport('sales')} busy={exporting} />
          </>
        ) : null}

        {tab === 'money' ? (
          <>
            <KpiRow>
              <Kpi label="Billed" value={r.totals.invoiced} money icon="receipt-outline" color={theme.colors.primary} hint={`${r.totals.invoiceCount} invoices`} />
              <Kpi label="Collected" value={r.totals.collected} money icon="checkmark-circle-outline" color={theme.colors.success} hint={`${r.totals.collectionRate}%`} />
              <Kpi label="Outstanding" value={r.totals.outstanding} money icon="hourglass-outline" color={theme.colors.warning} />
              <Kpi label="Overdue" value={r.totals.overdue} money icon="alert-circle-outline" color={theme.colors.danger} hint={`${r.totals.overdueCount} invoice(s)`} />
            </KpiRow>
            <ResponsiveGrid>
            <Panel title="How late is unpaid money?" icon="hourglass-outline" subtitle="Ageing of outstanding balance">
              <MeterRow label="Not yet due" value={r.aging.current} max={agingMax} color={theme.colors.success} display={formatCompactCurrency(r.aging.current)} />
              <MeterRow label="1–30 days late" value={r.aging.d1_30} max={agingMax} color={theme.colors.warning} display={formatCompactCurrency(r.aging.d1_30)} />
              <MeterRow label="31–60 days late" value={r.aging.d31_60} max={agingMax} color={theme.colors.accent} display={formatCompactCurrency(r.aging.d31_60)} />
              <MeterRow label="61–90 days late" value={r.aging.d61_90} max={agingMax} color={theme.colors.danger} display={formatCompactCurrency(r.aging.d61_90)} />
              <MeterRow label="Over 90 days" value={r.aging.d90plus} max={agingMax} color={theme.colors.danger} display={formatCompactCurrency(r.aging.d90plus)} />
            </Panel>
            <Panel title="Who pays, who owes" icon="business-outline" subtitle="Billed vs paid per customer">
              {r.byCustomer.length === 0 ? (
                <Text style={styles.empty}>No invoices yet.</Text>
              ) : (
                r.byCustomer.map(c => (
                  <PressableScale key={c.id} onPress={() => navigation.navigate('CustomerDetail', { customerId: c.id, customerName: c.name })} style={styles.custRow}>
                    <View style={styles.custHead}>
                      <Text style={styles.custName} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={styles.custValue}>{formatCompactCurrency(c.invoiced)}</Text>
                    </View>
                    <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <View style={{ width: `${(c.paid / custMax) * 100}%`, backgroundColor: theme.colors.success }} />
                      <View style={{ width: `${((c.outstanding - c.overdue) / custMax) * 100}%`, backgroundColor: theme.colors.warning }} />
                      <View style={{ width: `${(c.overdue / custMax) * 100}%`, backgroundColor: theme.colors.danger }} />
                    </View>
                    <Text style={styles.custMeta}>
                      Paid {formatCompactCurrency(c.paid)} · owes {formatCompactCurrency(c.outstanding)}
                      {c.overdue ? ` (${formatCompactCurrency(c.overdue)} late)` : ''}
                      {c.lastPaymentAt ? ` · last paid ${new Date(c.lastPaymentAt).toLocaleDateString('en-IN')}` : ''}
                    </Text>
                  </PressableScale>
                ))
              )}
              <View style={styles.legend}>
                <Legend color={theme.colors.success} label="Paid" />
                <Legend color={theme.colors.warning} label="Due" />
                <Legend color={theme.colors.danger} label="Overdue" />
              </View>
            </Panel>
            {r.byMethod.length ? (
              <Panel title="How customers pay" icon="card-outline">
                <DonutChart data={r.byMethod.map((m, i) => ({ label: `${METHOD[m.method] ?? m.method} ${formatCompactCurrency(m.total)}`, value: m.count, color: methodColors[i % methodColors.length] }))} centerValue={formatCompactCurrency(r.byMethod.reduce((s, m) => s + m.total, 0))} centerLabel="received" />
              </Panel>
            ) : null}
            {r.collectors.length ? (
              <Panel title="Collected by" icon="person-outline" subtitle="Who recorded the payments">
                {r.collectors.map((c, i) => (
                  <MeterRow key={i} label={`${c.user?.name ?? '—'} · ${c.count} payment(s)`} value={c.total} max={r.collectors[0].total || 1} color={theme.colors.success} display={formatCompactCurrency(c.total)} />
                ))}
              </Panel>
            ) : null}
            </ResponsiveGrid>
            <ActionButton label="Download receivables report (PDF)" icon="download-outline" onPress={() => exportReport('money')} busy={exporting} />
          </>
        ) : null}

        {tab === 'team' ? (
          <>
            <KpiRow>
              <Kpi label="People" value={data.team.totals.people} icon="people-outline" color={theme.colors.primary} />
              <Kpi label="Tasks done (30 d)" value={data.team.totals.tasksCompleted} icon="checkmark-done-outline" color={theme.colors.success} hint={data.team.totals.tasksOverdue ? `${data.team.totals.tasksOverdue} overdue` : undefined} />
              <Kpi label="Untouched leads" value={data.team.totals.untouchedLeads} icon="snow-outline" color={theme.colors.warning} />
              <Kpi label="Collected (30 d)" value={data.team.totals.collected} money icon="cash-outline" color={theme.colors.accent} />
            </KpiRow>
            <Panel title="Leaderboard" icon="podium-outline" subtitle="Won value, then money collected" action={{ label: 'Team activity', onPress: () => navigation.navigate('TeamActivity') }}>
              {leaders.map((m, i) => (
                <View key={m.user.id} style={styles.leader}>
                  <View style={[styles.medal, { backgroundColor: i === 0 ? theme.colors.warning : theme.colors.surfaceAlt }]}>
                    <Text style={[styles.medalText, { color: i === 0 ? theme.colors.onPrimary : theme.colors.textSecondary }]}>{i + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.custName}>{m.user.name}</Text>
                    <Text style={styles.custMeta}>
                      {m.deals.won} won · {m.tasks.completed} tasks done · {formatCompactCurrency(m.collected.total)} collected
                    </Text>
                    {m.flags.length ? <Text style={[styles.custMeta, { color: theme.colors.danger }]}>{m.flags.join(' · ')}</Text> : null}
                  </View>
                  <Text style={[styles.custValue, { color: theme.colors.success }]}>{formatCompactCurrency(m.deals.wonValue)}</Text>
                </View>
              ))}
            </Panel>
            <ActionButton label="Download team report (PDF)" icon="download-outline" onPress={() => exportReport('team')} busy={exporting} />
          </>
        ) : null}

        {tab === 'overview' ? <ActionButton label="Download full business report (PDF)" icon="download-outline" onPress={() => exportReport()} busy={exporting} /> : null}
      </ScrollView>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.custMeta}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 960, alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 12 },
    foot: { color: theme.colors.textMuted, fontSize: 12, marginTop: 4 },
    custRow: { paddingVertical: 8 },
    custHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5, gap: 8 },
    custName: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 14 },
    custValue: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    custMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 3 },
    track: { height: 10, borderRadius: 5, overflow: 'hidden', flexDirection: 'row' },
    legend: { flexDirection: 'row', gap: 14, marginTop: 10 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    leader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    medal: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    medalText: { fontWeight: '800' },
  });
}
