import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { listActivities } from '@/api/activities.api';
import { getSalesForecast } from '@/api/ai.api';
import { listLeads } from '@/api/leads.api';
import { listOpportunities } from '@/api/opportunities.api';
import { getSalesReport, getTopCustomersReport } from '@/api/reports.api';
import { BarChart } from '@/components/charts/BarChart';
import { DonutChart } from '@/components/charts/DonutChart';
import { FunnelChart } from '@/components/charts/FunnelChart';
import { Sparkline } from '@/components/charts/Sparkline';
import { ScreenState } from '@/components/common/ScreenState';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { AnimatedNumber, formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useAppSelector } from '@/hooks/useRedux';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { stageColor, stageLabel } from '@/screens/forms/options';
import { leadFunnel, monthlyDealValue, ownerLeaderboard, pipelineKpis, summarizeStages } from '@/screens/pipeline/pipelineMath';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Activity, Lead, Opportunity, SalesForecast, SalesReportRow, TopCustomerRow } from '@/types';
import { can } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'Analytics'>;

interface Data {
  deals: Opportunity[];
  leads: Lead[];
  activities: Activity[];
  revenue: SalesReportRow[] | null;
  topCustomers: TopCustomerRow[] | null;
  forecast: SalesForecast | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Role-aware analytics. Pipeline, lead and task charts use the
 * records the API returns for this user (own records for reps,
 * team for team managers, company for admins). Revenue reports and
 * the forecast are only requested for roles allowed to see them.
 */
export function AnalyticsScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const role = useAppSelector(state => state.auth.user?.role);
  const showReports = can(role, 'reports.view');
  const twoColumns = width >= 900;

  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [deals, leads, activities, revenue, topCustomers, forecast] = await Promise.all([
        listOpportunities(),
        listLeads(),
        listActivities().catch(() => [] as Activity[]),
        showReports ? getSalesReport(6).catch(() => null) : Promise.resolve(null),
        showReports ? getTopCustomersReport(5).catch(() => null) : Promise.resolve(null),
        showReports ? getSalesForecast().catch(() => null) : Promise.resolve(null),
      ]);
      setData({ deals, leads, activities, revenue, topCustomers, forecast });
      setError(null);
    } catch {
      setError('Could not load analytics.');
    }
  }, [showReports]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const derived = useMemo(() => {
    if (!data) return null;
    const now = new Date();
    const pending = data.activities.filter(a => a.status === 'PENDING');
    return {
      kpis: pipelineKpis(data.deals),
      stages: summarizeStages(data.deals),
      funnel: leadFunnel(data.leads),
      monthly: monthlyDealValue(data.deals, 6),
      leaders: ownerLeaderboard(data.deals),
      tasks: {
        overdue: pending.filter(a => a.dueAt && new Date(a.dueAt) < now).length,
        pending: pending.filter(a => !a.dueAt || new Date(a.dueAt) >= now).length,
        done: data.activities.filter(a => a.status === 'COMPLETED').length,
      },
    };
  }, [data]);

  const header = (
    <HeroHeader
      title="Analytics"
      subtitle={
        role === 'OWNER' || role === 'ADMIN'
          ? 'Whole company'
          : role === 'MANAGER'
            ? 'Your team (or company if you lead no team)'
            : 'Your own pipeline'
      }
      icon="stats-chart-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  if (!data || !derived) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={4} />)}
        </View>
      </View>
    );
  }

  const { kpis, stages, funnel, monthly, leaders, tasks } = derived;
  const revenueTotal = data.revenue?.reduce((s, r) => s + r.revenue, 0) ?? 0;

  const cards: React.ReactNode[] = [
    /* ---------------- headline KPIs ---------------- */
    <View key="kpis" style={styles.kpiRow}>
      <Kpi label="Open pipeline" value={kpis.openValue} money icon="git-branch-outline" color={theme.colors.primary} />
      <Kpi label="Weighted forecast" value={kpis.weightedForecast} money icon="trending-up-outline" color={theme.colors.accent} />
      <Kpi label="Won" value={kpis.wonValue} money icon="trophy-outline" color={theme.colors.success} />
      <Kpi label="Avg deal" value={kpis.averageDeal} money icon="pricetag-outline" color={theme.colors.info} />
    </View>,

    /* ---------------- deals by stage ---------------- */
    <Card key="stages" title="Deals by stage" icon="pie-chart-outline" action={{ label: 'Open pipeline', onPress: () => navigation.navigate('Pipeline') }}>
      <DonutChart
        data={stages.filter(s => s.count > 0).map(s => ({ label: stageLabel(s.stage), value: s.count, color: stageColor(theme, s.stage) }))}
        centerValue={kpis.winRate === null ? '—' : `${Math.round(kpis.winRate * 100)}%`}
        centerLabel="win rate"
      />
      {data.deals.length === 0 ? <Text style={styles.empty}>No deals yet.</Text> : null}
    </Card>,

    /* ---------------- lead funnel ---------------- */
    <Card key="funnel" title="Lead funnel" icon="funnel-outline">
      {data.leads.length === 0 ? (
        <Text style={styles.empty}>No leads yet.</Text>
      ) : (
        <FunnelChart
          steps={funnel.map(step => ({
            label: step.status.charAt(0) + step.status.slice(1).toLowerCase(),
            value: step.count,
            color:
              step.status === 'CONVERTED'
                ? theme.colors.success
                : step.status === 'QUALIFIED'
                  ? theme.colors.status.qualified
                  : step.status === 'CONTACTED'
                    ? theme.colors.status.contacted
                    : theme.colors.textMuted,
          }))}
        />
      )}
      <Text style={styles.footnote}>
        {data.leads.filter(l => l.status === 'LOST').length} lost · {data.leads.filter(l => l.status === 'UNQUALIFIED').length} unqualified
      </Text>
    </Card>,

    /* ---------------- monthly deal flow ---------------- */
    <Card key="monthly" title="Deal value created per month" icon="bar-chart-outline">
      <BarChart data={monthly.map(m => ({ label: m.label, value: m.created }))} format={formatCompactCurrency} highlightLast />
      <Text style={styles.footnote}>Won in the same months: {formatCompactCurrency(monthly.reduce((s, m) => s + m.won, 0))}</Text>
    </Card>,

    /* ---------------- tasks ---------------- */
    <Card key="tasks" title="Tasks & follow-ups" icon="checkbox-outline" action={{ label: 'Open tasks', onPress: () => navigation.navigate('Activities') }}>
      <DonutChart
        size={130}
        data={[
          { label: 'Overdue', value: tasks.overdue, color: theme.colors.danger },
          { label: 'Upcoming', value: tasks.pending, color: theme.colors.warning },
          { label: 'Done', value: tasks.done, color: theme.colors.success },
        ].filter(s => s.value > 0)}
        centerValue={String(tasks.overdue + tasks.pending)}
        centerLabel="open"
      />
      {tasks.overdue + tasks.pending + tasks.done === 0 ? <Text style={styles.empty}>No tasks yet.</Text> : null}
    </Card>,
  ];

  if (showReports && data.revenue) {
    const history = data.forecast?.history ?? data.revenue;
    cards.push(
      <Card key="revenue" title="Collected revenue (paid invoices)" icon="cash-outline">
        <View style={styles.revenueHead}>
          <View>
            <AnimatedNumber value={revenueTotal} format={formatCompactCurrency} style={styles.bigNumber} />
            <Text style={styles.muted}>last 6 months</Text>
          </View>
          <Sparkline values={history.map(h => h.revenue)} />
        </View>
        {data.revenue.length > 0 ? (
          <BarChart
            data={data.revenue.map(r => ({ label: MONTHS[r.month - 1], value: r.revenue, color: theme.colors.success }))}
            format={formatCompactCurrency}
          />
        ) : (
          <Text style={styles.empty}>No paid invoices yet.</Text>
        )}
        {data.forecast?.forecastedRevenue != null ? (
          <View style={[styles.forecast, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons
              name={data.forecast.trendDirection === 'down' ? 'trending-down' : 'trending-up'}
              size={18}
              color={data.forecast.trendDirection === 'down' ? theme.colors.danger : theme.colors.success}
            />
            <Text style={[styles.forecastText, { color: theme.colors.text }]}>
              Next month trend: <Text style={{ fontWeight: '800' }}>{formatCompactCurrency(data.forecast.forecastedRevenue)}</Text>
            </Text>
          </View>
        ) : (
          <Text style={styles.footnote}>A forecast appears after two months of paid invoices.</Text>
        )}
      </Card>,
    );
  }

  if (showReports && data.topCustomers && data.topCustomers.length > 0) {
    const max = Math.max(...data.topCustomers.map(c => c.revenue), 1);
    cards.push(
      <Card key="customers" title="Top customers" icon="ribbon-outline">
        {data.topCustomers.map((c, i) => (
          <FadeInView key={c.customerId} index={i} style={styles.rankRow}>
            <Text style={styles.rank}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.rankHead}>
                <Text style={styles.rankName} numberOfLines={1}>
                  {c.customerName}
                </Text>
                <Text style={styles.rankValue}>{formatCompactCurrency(c.revenue)}</Text>
              </View>
              <View style={[styles.rankTrack, { backgroundColor: theme.colors.surfaceAlt }]}>
                <View style={[styles.rankFill, { width: `${(c.revenue / max) * 100}%`, backgroundColor: theme.colors.primary }]} />
              </View>
            </View>
          </FadeInView>
        ))}
      </Card>,
    );
  }

  if (showReports && leaders.length > 1) {
    cards.push(
      <Card key="leaders" title="Team leaderboard" icon="podium-outline">
        {leaders.map((l, i) => (
          <View key={l.name} style={styles.leaderRow}>
            <View style={[styles.medal, { backgroundColor: i === 0 ? theme.colors.warning : theme.colors.surfaceAlt }]}>
              <Text style={[styles.medalText, { color: i === 0 ? theme.colors.onPrimary : theme.colors.textSecondary }]}>{i + 1}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rankName}>{l.name}</Text>
              <Text style={styles.muted}>
                {l.deals} deals · {formatCompactCurrency(l.open)} open
              </Text>
            </View>
            <Text style={[styles.rankValue, { color: theme.colors.success }]}>{formatCompactCurrency(l.won)}</Text>
          </View>
        ))}
      </Card>,
    );
  }

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={styles.content}
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
      >
        <View style={twoColumns ? styles.grid : undefined}>
          {cards.map((card, index) => (
            <FadeInView key={index} index={index} style={twoColumns && index > 0 ? styles.gridItem : undefined}>
              {card}
            </FadeInView>
          ))}
        </View>
        {kpis.overdueCount > 0 ? (
          <Text style={[styles.footnote, { textAlign: 'center' }]}>
            {kpis.overdueCount} open {kpis.overdueCount === 1 ? 'deal is' : 'deals are'} past the expected close date ·{' '}
            {formatCompactCurrency(kpis.closingSoonValue)} expected in the next 30 days
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}

/* ============================================================
   PIECES
============================================================ */

function Card({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  children: React.ReactNode;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <View style={styles.cardIcon}>
          <Ionicons name={icon} size={16} color={theme.colors.primary} />
        </View>
        <Text style={styles.cardTitle} accessibilityRole="header">
          {title}
        </Text>
        {action ? (
          <PressableScale onPress={action.onPress} accessibilityRole="link" hitSlop={8}>
            <Text style={styles.cardAction}>{action.label} →</Text>
          </PressableScale>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function Kpi({
  label,
  value,
  icon,
  color,
  money,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  money?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.kpi}>
      <View style={[styles.kpiIcon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <AnimatedNumber value={value} format={v => (money ? formatCompactCurrency(v) : String(Math.round(v)))} style={styles.kpiValue} />
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 1100, alignSelf: 'center' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
    gridItem: { flexBasis: '48%', flexGrow: 1 },
    kpiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    kpi: {
      flexGrow: 1,
      flexBasis: '45%',
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      shadowColor: theme.colors.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    kpiIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    kpiValue: { color: theme.colors.text, fontSize: 22, fontWeight: '800' },
    kpiLabel: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: 16,
      marginBottom: 14,
    },
    cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    cardIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primaryLight },
    cardTitle: { flex: 1, color: theme.colors.text, fontSize: 16, fontWeight: '800' },
    cardAction: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 12 },
    footnote: { color: theme.colors.textMuted, fontSize: 12, marginTop: 12 },
    muted: { color: theme.colors.textMuted, fontSize: 12 },
    revenueHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    bigNumber: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
    forecast: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, padding: 12, marginTop: 14 },
    forecastText: { fontSize: 13 },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    rank: { width: 18, color: theme.colors.textMuted, fontWeight: '800', textAlign: 'center' },
    rankHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    rankName: { flex: 1, color: theme.colors.text, fontWeight: '700', fontSize: 14 },
    rankValue: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    rankTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
    rankFill: { height: 8, borderRadius: 4 },
    leaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
    medal: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    medalText: { fontWeight: '800' },
  });
}
