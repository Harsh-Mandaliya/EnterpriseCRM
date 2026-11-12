import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import {
  getBriefing,
  getCustomerInsights,
  getDealInsights,
  getLeadScores,
  getNextBestActions,
  getSalesForecast,
  type Briefing,
  type DealInsight,
} from '@/api/ai.api';
import { BarChart } from '@/components/charts/BarChart';
import { ActionButton, Kpi, KpiRow, MeterRow, Panel } from '@/components/common/Panel';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { StatusBadge } from '@/components/common/StatusBadge';
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
import type { CustomerInsight, LeadScore, NextBestAction, SalesForecast } from '@/types';
import { exportPdf, inr, reportHtml } from '@/utils/pdf';
import { can } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'AiCenter'>;
type Tab = 'deals' | 'leads' | 'customers' | 'forecast';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface Data {
  briefing: Briefing | null;
  deals: { deals: DealInsight[]; summary: { open: number; pipeline: number; weighted: number; highRisk: number } } | null;
  actions: NextBestAction[];
  leads: LeadScore[] | null;
  customers: CustomerInsight[] | null;
  forecast: SalesForecast | null;
}

/**
 * AI Center: transparent, rule-based insights computed from the
 * company's own data (no external AI service): a daily briefing, deal
 * win probability with the reasons, lead scores, customers at risk and
 * a revenue trend. Every role sees its own scope; lead scores, customer
 * risk and the revenue forecast need report access.
 */
export function AiCenterScreen({ navigation }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const role = useAppSelector(state => state.auth.user?.role);
  const full = can(role, 'reports.view');
  const company = usePdfCompany();

  const [data, setData] = useState<Data | null>(null);
  const [tab, setTab] = useState<Tab>('deals');
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const soft = <T,>(p: Promise<T>) => p.catch(() => null);
      const [briefing, deals, actions, leads, customers, forecast] = await Promise.all([
        soft(getBriefing()),
        soft(getDealInsights()),
        getNextBestActions().catch(() => [] as NextBestAction[]),
        full ? soft(getLeadScores()) : Promise.resolve(null),
        full ? soft(getCustomerInsights().then(r => r.atRiskCustomers)) : Promise.resolve(null),
        full ? soft(getSalesForecast()) : Promise.resolve(null),
      ]);
      if (!briefing && !deals) throw new Error('unavailable');
      setData({ briefing, deals, actions, leads, customers, forecast });
      setError(null);
    } catch {
      setError('Could not load insights.');
    }
  }, [full]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const riskColor = (risk: DealInsight['risk']) => (risk === 'high' ? theme.colors.danger : risk === 'medium' ? theme.colors.warning : theme.colors.success);
  const toneColor = (tone: string) => (tone === 'good' ? theme.colors.success : tone === 'bad' ? theme.colors.danger : tone === 'warn' ? theme.colors.warning : theme.colors.primary);

  const exportReport = async () => {
    if (!data) return;
    setExporting(true);
    try {
      await exportPdf(
        reportHtml({
          title: 'AI insights report',
          subtitle: role === 'OWNER' || role === 'ADMIN' ? 'Whole company' : role === 'MANAGER' ? 'Your team' : 'Your own pipeline',
          company: await company(),
          kpis: data.deals
            ? [
                { label: 'Open deals', value: String(data.deals.summary.open) },
                { label: 'Pipeline', value: inr(data.deals.summary.pipeline) },
                { label: 'Realistic forecast', value: inr(data.deals.summary.weighted) },
                { label: 'High-risk deals', value: String(data.deals.summary.highRisk) },
              ]
            : [],
          sections: [
            { title: 'Briefing', text: [data.briefing?.headline, ...(data.briefing?.points.map(p => `• ${p.text}`) ?? [])].filter(Boolean).join('  ') },
            {
              title: 'Deal win probability',
              numeric: [3, 4],
              table: [
                ['Deal', 'Customer', 'Owner', 'Value', 'Win %', 'Risk', 'Next step'],
                ...(data.deals?.deals ?? []).map(d => [d.title, d.customer ?? '', d.owner ?? '', inr(d.amount), `${d.probability}%`, d.risk, d.nextStep]),
              ],
            },
            ...(data.leads
              ? [{ title: 'Lead scores', numeric: [3], table: [['Lead', 'Status', 'Source', 'Score'], ...data.leads.slice(0, 30).map(l => [l.name, l.status, l.source, String(l.score)])] }]
              : []),
            ...(data.customers?.length
              ? [{ title: 'Customers at risk', table: [['Customer', 'Reason'], ...data.customers.map(c => [c.name, c.reason])] }]
              : []),
          ],
        }),
        'AI-insights.pdf',
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title="AI Center"
      subtitle="Smart insights from your own data"
      icon="analytics-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        <PressableScale onPress={exportReport} accessibilityRole="button" accessibilityLabel="Download insights PDF" style={styles.headerBtn}>
          <Ionicons name={exporting ? 'hourglass-outline' : 'download-outline'} size={18} color={theme.colors.onPrimary} />
        </PressableScale>
      }
    />
  );

  if (!data) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={4} />)}</View>
      </View>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'deals', label: 'Deals' },
    ...(full ? ([{ value: 'leads', label: 'Leads' }, { value: 'customers', label: 'Customers' }, { value: 'forecast', label: 'Forecast' }] as { value: Tab; label: string }[]) : []),
  ];

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
        {/* ---------- briefing ---------- */}
        {data.briefing ? (
          <FadeInView index={0}>
            <View style={[styles.briefing, { backgroundColor: theme.colors.primary }]}>
              <View style={styles.briefHead}>
                <Ionicons name="sunny-outline" size={20} color={theme.colors.onPrimary} />
                <Text style={styles.briefLabel}>Today’s briefing</Text>
              </View>
              <Text style={styles.briefHeadline}>{data.briefing.headline}</Text>
            </View>
            <View style={styles.points}>
              {data.briefing.points.map((p, i) => (
                <View key={i} style={styles.point}>
                  <View style={[styles.pointIcon, { backgroundColor: `${toneColor(p.tone)}1F` }]}>
                    <Ionicons name={p.icon as IconName} size={15} color={toneColor(p.tone)} />
                  </View>
                  <Text style={styles.pointText}>{p.text}</Text>
                </View>
              ))}
            </View>
          </FadeInView>
        ) : null}

        {data.deals ? (
          <KpiRow>
            <Kpi label="Open pipeline" value={data.deals.summary.pipeline} money icon="git-branch-outline" color={theme.colors.primary} />
            <Kpi label="Realistic forecast" value={data.deals.summary.weighted} money icon="analytics-outline" color={theme.colors.accent} hint="probability-weighted" />
            <Kpi label="Open deals" value={data.deals.summary.open} icon="briefcase-outline" color={theme.colors.info} />
            <Kpi label="High risk" value={data.deals.summary.highRisk} icon="warning-outline" color={theme.colors.danger} />
          </KpiRow>
        ) : null}

        {tabs.length > 1 ? <SegmentedControl<Tab> accessibilityLabel="Insight type" value={tab} onChange={setTab} options={tabs} /> : null}
        <View style={{ height: 14 }} />

        {/* ---------- deals ---------- */}
        {tab === 'deals' ? (
          <>
            {(data.deals?.deals ?? []).length === 0 ? (
              <ScreenState kind="empty" title="No open deals" message="Win probability appears here for every open deal." />
            ) : (
              data.deals!.deals.map((d, i) => (
                <FadeInView key={d.id} index={i}>
                  <PressableScale onPress={() => setOpen(open === d.id ? null : d.id)} accessibilityRole="button" accessibilityLabel={`${d.title}, ${d.probability} percent likely`} style={styles.deal}>
                    <View style={styles.dealTop}>
                      <View style={[styles.ring, { borderColor: riskColor(d.risk) }]}>
                        <Text style={[styles.ringText, { color: riskColor(d.risk) }]}>{d.probability}%</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dealTitle} numberOfLines={1}>
                          {d.title}
                        </Text>
                        <Text style={styles.dealMeta} numberOfLines={1}>
                          {formatCompactCurrency(d.amount)} · {d.stage.charAt(0) + d.stage.slice(1).toLowerCase()}
                          {d.customer ? ` · ${d.customer}` : ''}
                          {d.owner ? ` · ${d.owner}` : ''}
                        </Text>
                      </View>
                      <StatusBadge label={`${d.risk} risk`} tone={d.risk === 'high' ? 'danger' : d.risk === 'medium' ? 'warning' : 'success'} />
                    </View>
                    <View style={[styles.nextStep, { backgroundColor: theme.colors.surfaceAlt }]}>
                      <Ionicons name="arrow-forward-circle-outline" size={16} color={theme.colors.primary} />
                      <Text style={styles.nextText}>{d.nextStep}</Text>
                    </View>
                    {open === d.id ? (
                      <View style={styles.signals}>
                        <Text style={styles.signalHead}>Why {d.probability}%?</Text>
                        {d.signals.map(s => (
                          <View key={s.label} style={styles.signal}>
                            <Text style={[styles.signalImpact, { color: s.impact >= 0 ? theme.colors.success : theme.colors.danger }]}>
                              {s.impact >= 0 ? '+' : ''}
                              {s.impact}
                            </Text>
                            <Text style={styles.signalLabel}>{s.label}</Text>
                          </View>
                        ))}
                        <PressableScale onPress={() => navigation.navigate('TeamActivity', { targetType: 'Opportunity', targetId: d.id, title: d.title })} style={styles.linkBtn}>
                          <Text style={styles.link}>View deal history →</Text>
                        </PressableScale>
                      </View>
                    ) : (
                      <Text style={styles.tapHint}>Tap to see why</Text>
                    )}
                  </PressableScale>
                </FadeInView>
              ))
            )}
            {data.actions.length > 0 ? (
              <Panel title="Next best actions" icon="flash-outline">
                {data.actions.slice(0, 8).map((a, i) => (
                  <View key={i} style={styles.point}>
                    <View style={[styles.pointIcon, { backgroundColor: `${a.priority === 'high' ? theme.colors.danger : a.priority === 'medium' ? theme.colors.warning : theme.colors.info}1F` }]}>
                      <Ionicons name="flash" size={14} color={a.priority === 'high' ? theme.colors.danger : a.priority === 'medium' ? theme.colors.warning : theme.colors.info} />
                    </View>
                    <Text style={styles.pointText}>{a.message}</Text>
                  </View>
                ))}
              </Panel>
            ) : null}
          </>
        ) : null}

        {/* ---------- leads ---------- */}
        {tab === 'leads' ? (
          (data.leads ?? []).length === 0 ? (
            <ScreenState kind="empty" title="No open leads to score" message="Scores use contact completeness, source history, freshness and engagement." />
          ) : (
            data.leads!.slice(0, 25).map((l, i) => (
              <FadeInView key={l.leadId} index={i}>
                <PressableScale onPress={() => navigation.navigate('LeadDetail', { leadId: l.leadId, leadName: l.name })} accessibilityRole="button" style={styles.deal}>
                  <View style={styles.dealTop}>
                    <View style={[styles.ring, { borderColor: l.score >= 60 ? theme.colors.success : l.score >= 35 ? theme.colors.warning : theme.colors.danger }]}>
                      <Text style={[styles.ringText, { color: theme.colors.text }]}>{l.score}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dealTitle}>{l.name}</Text>
                      <Text style={styles.dealMeta}>
                        {l.status} · {l.source.replace('_', ' ')}
                      </Text>
                    </View>
                  </View>
                  <View style={{ marginTop: 10 }}>
                    <MeterRow label="Contact details" value={l.factors.contactCompleteness} max={25} color={theme.colors.primary} display={`${l.factors.contactCompleteness}/25`} />
                    <MeterRow label="Source quality" value={l.factors.sourceQuality} max={35} color={theme.colors.accent} display={`${l.factors.sourceQuality}/35`} />
                    <MeterRow label="Freshness" value={l.factors.freshness} max={20} color={theme.colors.info} display={`${l.factors.freshness}/20`} />
                    <MeterRow label="Engagement" value={l.factors.engagement} max={20} color={theme.colors.success} display={`${l.factors.engagement}/20`} />
                  </View>
                </PressableScale>
              </FadeInView>
            ))
          )
        ) : null}

        {/* ---------- customers ---------- */}
        {tab === 'customers' ? (
          (data.customers ?? []).length === 0 ? (
            <ScreenState kind="empty" title="No customers at risk" message="Paying customers with no logged activity in 30 days show up here." />
          ) : (
            data.customers!.map((c, i) => (
              <FadeInView key={c.customerId} index={i}>
                <PressableScale onPress={() => navigation.navigate('CustomerDetail', { customerId: c.customerId, customerName: c.name })} accessibilityRole="button" style={styles.deal}>
                  <View style={styles.dealTop}>
                    <View style={[styles.pointIcon, { backgroundColor: theme.colors.warningSoft, width: 38, height: 38 }]}>
                      <Ionicons name="alert-outline" size={18} color={theme.colors.warning} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dealTitle}>{c.name}</Text>
                      <Text style={styles.dealMeta}>{c.reason}</Text>
                    </View>
                  </View>
                </PressableScale>
              </FadeInView>
            ))
          )
        ) : null}

        {/* ---------- forecast ---------- */}
        {tab === 'forecast' ? (
          <Panel title="Revenue trend" icon="trending-up-outline" subtitle="Paid invoices per month, straight-line trend">
            {data.forecast?.history?.length ? (
              <BarChart data={data.forecast.history.map(h => ({ label: MONTHS[h.month - 1], value: h.revenue }))} format={formatCompactCurrency} highlightLast />
            ) : (
              <Text style={styles.empty}>No paid invoices yet.</Text>
            )}
            {data.forecast?.forecastedRevenue != null ? (
              <View style={[styles.nextStep, { backgroundColor: theme.colors.primaryLight, marginTop: 14 }]}>
                <Ionicons name={data.forecast.trendDirection === 'down' ? 'trending-down' : 'trending-up'} size={18} color={data.forecast.trendDirection === 'down' ? theme.colors.danger : theme.colors.success} />
                <Text style={styles.nextText}>
                  Next month if the trend holds: <Text style={{ fontWeight: '800' }}>{inr(data.forecast.forecastedRevenue)}</Text> (based on {data.forecast.monthsOfHistory} months)
                </Text>
              </View>
            ) : (
              <Text style={styles.empty}>A forecast needs at least two months of paid invoices.</Text>
            )}
          </Panel>
        ) : null}

        <Panel title="How these insights work" icon="information-circle-outline">
          <Text style={styles.explain}>
            Everything here is calculated from your CRM data with clear rules — deal stage, recent activity, close dates, the customer’s payment history, lead source results — so every number can be explained. Nothing is sent to an outside AI service. You only see records your role allows.
          </Text>
        </Panel>
        <ActionButton label="Download insights (PDF)" icon="download-outline" onPress={exportReport} busy={exporting} />
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 900, alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    briefing: { borderRadius: theme.radius.lg, padding: 16, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    briefHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    briefLabel: { color: theme.colors.onPrimary, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.9 },
    briefHeadline: { color: theme.colors.onPrimary, fontSize: 18, fontWeight: '800', marginTop: 8 },
    points: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, borderTopWidth: 0, borderBottomLeftRadius: theme.radius.lg, borderBottomRightRadius: theme.radius.lg, padding: 14, marginBottom: 14 },
    point: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingVertical: 6 },
    pointIcon: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    pointText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
    deal: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 14, marginBottom: 10 },
    dealTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ring: { width: 50, height: 50, borderRadius: 25, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
    ringText: { fontWeight: '800', fontSize: 13 },
    dealTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
    dealMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    nextStep: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', borderRadius: 10, padding: 10, marginTop: 10 },
    nextText: { flex: 1, color: theme.colors.text, fontSize: 13, lineHeight: 18 },
    signals: { marginTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, paddingTop: 10 },
    signalHead: { color: theme.colors.text, fontWeight: '800', fontSize: 13, marginBottom: 6 },
    signal: { flexDirection: 'row', gap: 10, paddingVertical: 3 },
    signalImpact: { width: 34, fontWeight: '800', fontSize: 13, textAlign: 'right' },
    signalLabel: { flex: 1, color: theme.colors.textSecondary, fontSize: 13 },
    tapHint: { color: theme.colors.textFaint, fontSize: 11, marginTop: 8, textAlign: 'right' },
    linkBtn: { marginTop: 8, alignSelf: 'flex-start' },
    link: { color: theme.colors.primary, fontWeight: '800', fontSize: 13 },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 12 },
    explain: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  });
}
