import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { listActivities } from '@/api/activities.api';
import { listEvents } from '@/api/calendar.api';
import { getCustomer } from '@/api/customer.api';
import { describeWork, getWorkLog, type WorkLogEntry } from '@/api/insights.api';
import { listInvoices } from '@/api/invoices.api';
import { listOpportunities } from '@/api/opportunities.api';
import { listPayments } from '@/api/payments.api';
import { InfoRow, Kpi, KpiRow, Panel, ActionButton } from '@/components/common/Panel';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { StatusBadge } from '@/components/common/StatusBadge';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { usePdfCompany } from '@/hooks/usePdfCompany';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { invoiceStatusLabel, invoiceTone } from '@/screens/invoices/InvoiceDetailScreen';
import { stageColor, stageLabel } from '@/screens/forms/options';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Activity, CalendarEvent, Customer, Invoice, Opportunity, Payment } from '@/types';
import { exportPdf, inr, longDate, reportHtml } from '@/utils/pdf';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'CustomerDetail'>;
type Tab = 'overview' | 'deals' | 'billing' | 'activity';

const idOf = (v: unknown): string | null => (v && typeof v === 'object' && 'id' in v ? String((v as { id: string }).id) : typeof v === 'string' ? v : null);

/** Statement maths: billed, paid (manual "paid" counts as paid), outstanding, overdue. */
export function customerTotals(invoices: Invoice[], payments: Payment[], now = Date.now()) {
  const paidBy = new Map<string, number>();
  for (const p of payments) {
    const inv = idOf(p.invoiceId);
    if (inv && p.status !== 'REFUNDED' && p.status !== 'FAILED') paidBy.set(inv, (paidBy.get(inv) ?? 0) + p.amount);
  }
  let billed = 0, paid = 0, outstanding = 0, overdue = 0;
  for (const inv of invoices) {
    if (inv.status === 'CANCELLED') continue;
    // Status PAID = fully paid (same rule as the receivables report).
    const p = inv.status === 'PAID' ? inv.total : Math.min(paidBy.get(inv.id) ?? 0, inv.total);
    const bal = Math.max(0, inv.total - p);
    billed += inv.total;
    paid += p;
    outstanding += bal;
    if (bal > 0 && new Date(inv.dueDate).getTime() < now) overdue += bal;
  }
  return { billed, paid, outstanding, overdue };
}

export function CustomerDetailScreen({ navigation, route }: Props) {
  const { customerId, customerName } = route.params;
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const canEdit = useCan('customer.create');
  const canInvoice = useCan('invoice.create');
  const canDeal = useCan('deal.create');
  const company = usePdfCompany();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [deals, setDeals] = useState<Opportunity[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [history, setHistory] = useState<WorkLogEntry[]>([]);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      const c = await getCustomer(customerId);
      setCustomer(c);
      setError(null);
      const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);
      const [d, inv, pay, t, ev, h] = await Promise.all([
        safe(listOpportunities(), [] as Opportunity[]),
        safe(listInvoices({ customerId }), [] as Invoice[]),
        safe(listPayments(), [] as Payment[]),
        safe(listActivities({ customerId }), [] as Activity[]),
        safe(listEvents(), [] as CalendarEvent[]),
        safe(getWorkLog({ targetType: 'Customer', targetId: customerId, limit: 50 }), [] as WorkLogEntry[]),
      ]);
      setDeals(d.filter(x => (x.customerId ?? x.customer?.id) === customerId));
      setInvoices(inv);
      setPayments(pay.filter(p => idOf(p.customerId) === customerId));
      setTasks(t);
      setEvents(ev.filter(e => e.customerId?.id === customerId));
      setHistory(h);
    } catch {
      setError('Could not load this customer.');
    }
  }, [customerId]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const totals = useMemo(() => customerTotals(invoices, payments), [invoices, payments]);
  const openDeals = deals.filter(d => d.stage !== 'WON' && d.stage !== 'LOST');
  const openValue = openDeals.reduce((s, d) => s + d.amount, 0);
  const wonValue = deals.filter(d => d.stage === 'WON').reduce((s, d) => s + d.amount, 0);
  const pendingTasks = tasks.filter(t => t.status === 'PENDING');
  const upcoming = events.filter(e => new Date(e.startAt) >= new Date()).sort((a, b) => a.startAt.localeCompare(b.startAt));

  const health: { label: string; tone: 'success' | 'warning' | 'danger'; text: string } =
    totals.overdue > 0
      ? { label: 'Payment overdue', tone: 'danger', text: `${inr(totals.overdue)} is past due. Follow up before new orders.` }
      : totals.outstanding > 0
        ? { label: 'Balance open', tone: 'warning', text: `${inr(totals.outstanding)} due, not yet late.` }
        : { label: 'Good standing', tone: 'success', text: totals.billed > 0 ? 'All invoices are paid.' : 'No invoices yet.' };

  const open = async (url: string, fail: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(fail);
    }
  };

  const exportStatement = async () => {
    if (!customer) return;
    setExporting(true);
    try {
      const paidFor = (inv: Invoice) => {
        const p = payments.filter(x => idOf(x.invoiceId) === inv.id).reduce((s, x) => s + x.amount, 0);
        return inv.status === 'PAID' ? inv.total : Math.min(p, inv.total);
      };
      await exportPdf(
        reportHtml({
          title: 'Customer statement',
          subtitle: `${customer.name}${customer.gstin ? ` · GSTIN ${customer.gstin}` : ''}`,
          company: await company(),
          kpis: [
            { label: 'Total billed', value: inr(totals.billed) },
            { label: 'Paid', value: inr(totals.paid) },
            { label: 'Outstanding', value: inr(totals.outstanding) },
            { label: 'Overdue', value: inr(totals.overdue) },
          ],
          sections: [
            { title: 'Customer', text: [customer.name, customer.address, customer.phone, customer.email].filter(Boolean).join(' · ') },
            {
              title: 'Invoices',
              numeric: [3, 4, 5],
              table: [
                ['Invoice', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status'],
                ...invoices.map(inv => [inv.invoiceNumber, longDate(inv.issueDate ?? inv.createdAt), longDate(inv.dueDate), inr(inv.total), inr(paidFor(inv)), inr(Math.max(0, inv.total - paidFor(inv))), invoiceStatusLabel(inv.status)]),
              ],
            },
            {
              title: 'Payments received',
              numeric: [4],
              table: [
                ['Date', 'Invoice', 'Method', 'Reference', 'Amount'],
                ...payments.map(p => [longDate(p.paidAt), typeof p.invoiceId === 'object' ? p.invoiceId.invoiceNumber : '', p.method.replace('_', ' '), p.reference ?? '', inr(p.amount)]),
              ],
            },
          ],
        }),
        `Statement-${customer.name.replace(/\W+/g, '-')}.pdf`,
      );
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const header = (
    <HeroHeader
      title={customer?.name ?? customerName}
      subtitle={customer?.owner ? `Owner: ${customer.owner.name}` : 'Customer'}
      icon="business-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        canEdit && customer ? (
          <PressableScale onPress={() => navigation.navigate('CustomerForm', { customer })} accessibilityRole="button" accessibilityLabel="Edit customer" style={styles.headerBtn}>
            <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
          </PressableScale>
        ) : undefined
      }
    />
  );

  if (!customer) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}</View>
      </View>
    );
  }

  const quick: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; onPress: () => void; show: boolean }[] = [
    { icon: 'call-outline', label: 'Call', show: !!customer.phone, onPress: () => open(`tel:${customer.phone}`, 'Calling is not available on this device.') },
    { icon: 'logo-whatsapp', label: 'WhatsApp', show: !!customer.phone, onPress: () => open(`https://wa.me/${(customer.phone ?? '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`, 'Could not open WhatsApp.') },
    { icon: 'mail-outline', label: 'E-mail', show: !!customer.email, onPress: () => open(`mailto:${customer.email}`, 'No e-mail app found.') },
    { icon: 'receipt-outline', label: 'Invoice', show: canInvoice, onPress: () => navigation.navigate('InvoiceForm', { customerId, customerName: customer.name }) },
    { icon: 'git-branch-outline', label: 'Deal', show: canDeal, onPress: () => navigation.navigate('DealForm', { customerId }) },
    { icon: 'checkbox-outline', label: 'Task', show: true, onPress: () => navigation.navigate('TaskForm', { customerId }) },
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
        {/* identity card */}
        <FadeInView index={0} style={styles.identity}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>{customer.name.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{customer.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[customer.phone, customer.email].filter(Boolean).join(' · ') || 'No contact details'}
            </Text>
            <View style={{ flexDirection: 'row', marginTop: 6 }}>
              <StatusBadge label={health.label} tone={health.tone} />
            </View>
          </View>
        </FadeInView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quick
            .filter(q => q.show)
            .map(q => (
              <PressableScale key={q.label} onPress={q.onPress} accessibilityRole="button" accessibilityLabel={q.label} style={styles.quick}>
                <View style={[styles.quickIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name={q.icon} size={18} color={theme.colors.primary} />
                </View>
                <Text style={styles.quickText}>{q.label}</Text>
              </PressableScale>
            ))}
        </ScrollView>

        <KpiRow>
          <Kpi label="Total billed" value={totals.billed} money icon="receipt-outline" color={theme.colors.primary} />
          <Kpi label="Paid" value={totals.paid} money icon="checkmark-circle-outline" color={theme.colors.success} />
          <Kpi label="Outstanding" value={totals.outstanding} money icon="hourglass-outline" color={totals.overdue ? theme.colors.danger : theme.colors.warning} hint={totals.overdue ? `${formatCompactCurrency(totals.overdue)} overdue` : undefined} />
          <Kpi label="Open deals" value={openValue} money icon="git-branch-outline" color={theme.colors.accent} hint={`${openDeals.length} open · ${formatCompactCurrency(wonValue)} won`} />
        </KpiRow>

        <SegmentedControl<Tab>
          accessibilityLabel="Customer section"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'overview', label: 'Overview' },
            { value: 'deals', label: `Deals (${deals.length})` },
            { value: 'billing', label: `Billing (${invoices.length})` },
            { value: 'activity', label: 'Activity' },
          ]}
        />
        <View style={{ height: 14 }} />

        {tab === 'overview' ? (
          <>
            <Panel title="Account health" icon="pulse-outline">
              <Text style={styles.body}>{health.text}</Text>
              {pendingTasks.length ? <Text style={[styles.body, { marginTop: 6 }]}>{pendingTasks.length} open task(s) for this customer.</Text> : null}
              {upcoming[0] ? (
                <Text style={[styles.body, { marginTop: 6 }]}>
                  Next: <Text style={{ fontWeight: '800' }}>{upcoming[0].title}</Text> on {longDate(upcoming[0].startAt)}
                </Text>
              ) : null}
            </Panel>
            <Panel title="Details" icon="id-card-outline">
              <InfoRow icon="call-outline" label="Phone" value={customer.phone} onPress={customer.phone ? () => open(`tel:${customer.phone}`, 'Calling is not available.') : undefined} />
              <InfoRow icon="mail-outline" label="E-mail" value={customer.email} onPress={customer.email ? () => open(`mailto:${customer.email}`, 'No e-mail app found.') : undefined} />
              <InfoRow icon="shield-checkmark-outline" label="GSTIN" value={customer.gstin} />
              <InfoRow icon="location-outline" label="Address" value={customer.address} />
              <InfoRow icon="person-circle-outline" label="Owner" value={customer.owner?.name ?? 'Unassigned'} />
              <InfoRow icon="calendar-outline" label="Customer since" value={longDate(customer.createdAt)} />
              {customer.notes ? <Text style={styles.notes}>{customer.notes}</Text> : null}
            </Panel>
            <ActionButton label="Download statement (PDF)" icon="download-outline" onPress={exportStatement} busy={exporting} />
          </>
        ) : null}

        {tab === 'deals' ? (
          deals.length === 0 ? (
            <ScreenState kind="empty" title="No deals yet" message={canDeal ? 'Tap “Deal” above to start one.' : 'Deals for this customer will appear here.'} />
          ) : (
            deals.map((d, i) => (
              <FadeInView key={d.id} index={i}>
                <PressableScale onPress={() => navigation.navigate('TeamActivity', { targetType: 'Opportunity', targetId: d.id, title: d.title })} accessibilityRole="button" style={[styles.row, { borderLeftColor: stageColor(theme, d.stage) }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle}>{d.title}</Text>
                    <Text style={styles.rowMeta}>
                      {stageLabel(d.stage)} · {d.owner?.name ?? 'Unowned'}
                      {d.closeDate ? ` · close ${longDate(d.closeDate)}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.rowValue}>{formatCompactCurrency(d.amount)}</Text>
                </PressableScale>
              </FadeInView>
            ))
          )
        ) : null}

        {tab === 'billing' ? (
          <>
            {invoices.length === 0 ? (
              <ScreenState kind="empty" title="No invoices yet" message={canInvoice ? 'Tap “Invoice” above to bill this customer.' : 'Invoices will appear here.'} />
            ) : (
              invoices.map((inv, i) => {
                const p = payments.filter(x => idOf(x.invoiceId) === inv.id).reduce((s, x) => s + x.amount, 0);
                const paid = inv.status === 'PAID' ? inv.total : Math.min(p, inv.total);
                return (
                  <FadeInView key={inv.id} index={i}>
                    <PressableScale onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: inv.id })} accessibilityRole="button" style={styles.row}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{inv.invoiceNumber}</Text>
                        <Text style={styles.rowMeta}>
                          Due {longDate(inv.dueDate)} · paid {inr(paid)}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={styles.rowValue}>{inr(inv.total)}</Text>
                        <StatusBadge label={invoiceStatusLabel(inv.status)} tone={invoiceTone(inv.status)} />
                      </View>
                    </PressableScale>
                  </FadeInView>
                );
              })
            )}
            {payments.length > 0 ? (
              <Panel title="Payments received" icon="wallet-outline" subtitle={`${payments.length} payment(s) · ${inr(payments.reduce((s, p) => s + p.amount, 0))}`}>
                {payments.map(p => (
                  <View key={p.id} style={styles.payRow}>
                    <Ionicons name="checkmark-circle" size={18} color={theme.colors.success} />
                    <Text style={styles.payText}>
                      {longDate(p.paidAt)} · {p.method.replace('_', ' ')}
                      {typeof p.invoiceId === 'object' ? ` · ${p.invoiceId.invoiceNumber}` : ''}
                    </Text>
                    <Text style={styles.rowValue}>{inr(p.amount)}</Text>
                  </View>
                ))}
              </Panel>
            ) : null}
            <ActionButton label="Download statement (PDF)" icon="download-outline" onPress={exportStatement} busy={exporting} />
          </>
        ) : null}

        {tab === 'activity' ? (
          <>
            <Panel title="Tasks" icon="checkbox-outline" subtitle={`${pendingTasks.length} open`} action={{ label: 'Add', icon: 'add', onPress: () => navigation.navigate('TaskForm', { customerId }) }}>
              {tasks.length === 0 ? (
                <Text style={styles.empty}>No tasks yet.</Text>
              ) : (
                tasks.slice(0, 15).map(t => (
                  <View key={t.id} style={styles.payRow}>
                    <Ionicons name={t.status === 'COMPLETED' ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={t.status === 'COMPLETED' ? theme.colors.success : theme.colors.warning} />
                    <Text style={styles.payText} numberOfLines={2}>
                      {t.summary}
                    </Text>
                    <Text style={styles.rowMeta}>{t.dueAt ? longDate(t.dueAt) : ''}</Text>
                  </View>
                ))
              )}
            </Panel>
            <Panel title="Meetings & calls" icon="calendar-outline" subtitle={`${upcoming.length} upcoming`}>
              {events.length === 0 ? (
                <Text style={styles.empty}>Nothing scheduled with this customer.</Text>
              ) : (
                events.slice(0, 10).map(e => (
                  <View key={e.id} style={styles.payRow}>
                    <Ionicons name="calendar" size={16} color={theme.colors.primary} />
                    <Text style={styles.payText} numberOfLines={1}>
                      {e.title}
                    </Text>
                    <Text style={styles.rowMeta}>{longDate(e.startAt)}</Text>
                  </View>
                ))
              )}
            </Panel>
            <Panel title="History" icon="time-outline" subtitle="Who did what with this customer">
              {history.length === 0 ? (
                <Text style={styles.empty}>No recorded changes yet.</Text>
              ) : (
                history.map(h => (
                  <Text key={h.id} style={styles.hist}>
                    <Text style={{ fontWeight: '800', color: theme.colors.text }}>{h.actor?.name ?? 'Someone'}</Text> {describeWork(h)} · {longDate(h.at)}
                  </Text>
                ))
              )}
            </Panel>
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 860, alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: theme.colors.onPrimary, fontSize: 20, fontWeight: '800' },
    name: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
    quickRow: { gap: 10, paddingVertical: 14 },
    quick: { alignItems: 'center', width: 70, gap: 6 },
    quickIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    quickText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    body: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 20 },
    notes: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 10, fontStyle: 'italic' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, borderLeftColor: theme.colors.primary, padding: 14, marginBottom: 10 },
    rowTitle: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    rowMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    rowValue: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    payRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    payText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13 },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 10 },
    hist: { color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19, paddingVertical: 5 },
  });
}
