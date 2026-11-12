import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { describeWork, getWorkLog, type WorkLogEntry } from '@/api/insights.api';
import { getInvoice } from '@/api/invoices.api';
import { listPayments } from '@/api/payments.api';
import { ActionButton, Panel } from '@/components/common/Panel';
import { ScreenState } from '@/components/common/ScreenState';
import { StatusBadge, type BadgeTone } from '@/components/common/StatusBadge';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { usePdfCompany } from '@/hooks/usePdfCompany';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import type { AppStackParamList } from '@/navigation/types';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Invoice, Payment } from '@/types';
import { exportPdf, inr, invoiceHtml, longDate, receiptHtml } from '@/utils/pdf';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'InvoiceDetail'>;

export const invoiceTone = (status: string): BadgeTone =>
  status === 'PAID' ? 'success' : status === 'OVERDUE' ? 'danger' : status === 'CANCELLED' ? 'neutral' : status === 'DRAFT' ? 'neutral' : 'warning';

export const invoiceStatusLabel = (status: string) => (status === 'PENDING' ? 'Due' : status.charAt(0) + status.slice(1).toLowerCase());

/**
 * Paid amount. An invoice with status PAID counts as fully paid even when
 * not every payment was recorded (same rule as the receivables report).
 */
export function paidAmount(invoice: Pick<Invoice, 'status' | 'total'>, payments: Pick<Payment, 'amount' | 'status'>[]): number {
  const sum = payments.filter(p => p.status !== 'REFUNDED' && p.status !== 'FAILED').reduce((s, p) => s + p.amount, 0);
  return invoice.status === 'PAID' ? invoice.total : Math.min(sum, invoice.total);
}

export function InvoiceDetailScreen({ navigation, route }: Props) {
  const { invoiceId } = route.params;
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const canRecord = useCan('payment.record');
  const company = usePdfCompany();

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [history, setHistory] = useState<WorkLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [inv, pays] = await Promise.all([getInvoice(invoiceId), listPayments({ invoiceId })]);
      setInvoice(inv);
      setPayments(pays);
      setError(null);
      getWorkLog({ targetType: 'Invoice', targetId: invoiceId, limit: 30 })
        .then(setHistory)
        .catch(() => setHistory([]));
    } catch {
      setError('Could not load this invoice.');
    }
  }, [invoiceId]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const run = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      Alert.alert('Could not create the PDF', 'Please try again.');
    } finally {
      setBusy(null);
    }
  };

  const downloadBill = () =>
    run('bill', async () => {
      if (!invoice) return;
      await exportPdf(invoiceHtml({ invoice, payments, company: await company() }), `${invoice.invoiceNumber}.pdf`);
    });

  const downloadReceipt = (p: Payment, paidToDate: number) =>
    run(p.id, async () => {
      if (!invoice) return;
      await exportPdf(
        receiptHtml({
          payment: p,
          invoiceNumber: invoice.invoiceNumber,
          invoiceTotal: invoice.total,
          paidToDate,
          customerName: invoice.customer?.name ?? 'Customer',
          company: await company(),
        }),
        `Receipt-${invoice.invoiceNumber}-${p.id.slice(-6)}.pdf`,
      );
    });

  const header = (
    <HeroHeader
      title={invoice?.invoiceNumber ?? 'Invoice'}
      subtitle={invoice?.customer?.name ?? 'Bill details'}
      icon="document-text-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
    />
  );

  if (!invoice) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={styles.content}>{error ? <ScreenState kind="error" message={error} onRetry={load} /> : <SkeletonCard lines={6} />}</View>
      </View>
    );
  }

  const paid = paidAmount(invoice, payments);
  const balance = Math.max(0, invoice.total - paid);
  const pct = invoice.total > 0 ? Math.round((paid / invoice.total) * 100) : 0;
  const lateDays = Math.floor((Date.now() - new Date(invoice.dueDate).getTime()) / 86_400_000);
  const taxRate = invoice.subtotal > 0 ? Math.round((invoice.tax / invoice.subtotal) * 1000) / 10 : 0;
  const ordered = [...payments].sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
  let running = 0;
  const withRunning = ordered.map(p => ({ p, toDate: (running += p.amount) })).reverse();

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
        {/* ---------- amount summary ---------- */}
        <FadeInView index={0}>
          <View style={styles.summary}>
            <View style={styles.summaryTop}>
              <View>
                <Text style={styles.summaryLabel}>Invoice total</Text>
                <Text style={styles.summaryValue}>{inr(invoice.total)}</Text>
              </View>
              <StatusBadge label={invoiceStatusLabel(invoice.status)} tone={invoiceTone(invoice.status)} />
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
              <View style={[styles.fill, { width: `${pct}%`, backgroundColor: theme.colors.success }]} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryMeta}>
                Paid <Text style={{ color: theme.colors.success, fontWeight: '800' }}>{inr(paid)}</Text> ({pct}%)
              </Text>
              <Text style={styles.summaryMeta}>
                Balance <Text style={{ color: balance > 0 ? theme.colors.danger : theme.colors.text, fontWeight: '800' }}>{inr(balance)}</Text>
              </Text>
            </View>
            <View style={styles.dates}>
              <DateChip icon="calendar-outline" label="Issued" value={longDate(invoice.issueDate ?? invoice.createdAt)} />
              <DateChip
                icon="alarm-outline"
                label={balance > 0 && lateDays > 0 ? `${lateDays} day(s) late` : 'Due'}
                value={longDate(invoice.dueDate)}
                danger={balance > 0 && lateDays > 0}
              />
            </View>
          </View>
        </FadeInView>

        {/* ---------- actions ---------- */}
        <FadeInView index={1} style={styles.actions}>
          <ActionButton label="Download bill (PDF)" icon="download-outline" onPress={downloadBill} busy={busy === 'bill'} />
          {canRecord && balance > 0 && invoice.status !== 'CANCELLED' ? (
            <ActionButton label="Record payment" icon="cash-outline" variant="outline" onPress={() => navigation.navigate('PaymentForm', { invoiceId })} />
          ) : null}
        </FadeInView>

        {/* ---------- bill preview ---------- */}
        <FadeInView index={2}>
          <Panel title="Bill" icon="receipt-outline" subtitle={invoice.customer?.gstin ? `Customer GSTIN ${invoice.customer.gstin}` : undefined}>
            <View style={styles.parties}>
              <View style={{ flex: 1 }}>
                <Text style={styles.partyLabel}>BILLED TO</Text>
                <Text style={styles.partyName}>{invoice.customer?.name ?? 'Customer'}</Text>
                {invoice.customer?.address ? <Text style={styles.partyMeta}>{invoice.customer.address}</Text> : null}
                {invoice.customer?.phone ? <Text style={styles.partyMeta}>{invoice.customer.phone}</Text> : null}
              </View>
              {invoice.customer?.id ? (
                <PressableScale
                  onPress={() => navigation.navigate('CustomerDetail', { customerId: invoice.customer!.id, customerName: invoice.customer!.name })}
                  accessibilityRole="link"
                  accessibilityLabel="Open customer"
                >
                  <Ionicons name="open-outline" size={18} color={theme.colors.primary} />
                </PressableScale>
              ) : null}
            </View>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 1 }]}>Item</Text>
              <Text style={[styles.th, styles.num, { width: 40 }]}>Qty</Text>
              <Text style={[styles.th, styles.num, { width: 96 }]}>Amount</Text>
            </View>
            {invoice.lineItems.map((li, i) => (
              <View key={i} style={styles.tr}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.td}>{li.description}</Text>
                  <Text style={styles.tdMeta}>@ {inr(li.unitPrice)}</Text>
                </View>
                <Text style={[styles.td, styles.num, { width: 40 }]}>{li.quantity}</Text>
                <Text style={[styles.td, styles.num, { width: 96, fontWeight: '700' }]}>{inr(li.quantity * li.unitPrice)}</Text>
              </View>
            ))}
            <TotalLine label="Subtotal" value={inr(invoice.subtotal)} />
            <TotalLine label={`GST ${taxRate}%`} value={inr(invoice.tax)} />
            <TotalLine label="Total" value={inr(invoice.total)} strong />
            {invoice.notes ? <Text style={styles.notes}>{invoice.notes}</Text> : null}
          </Panel>
        </FadeInView>

        {/* ---------- payments ---------- */}
        <FadeInView index={3}>
          <Panel title="Payments" icon="wallet-outline" subtitle={`${payments.length} received`}>
            {withRunning.length === 0 ? (
              <Text style={styles.empty}>{invoice.status === 'PAID' ? 'Marked as paid — no payment details were recorded.' : 'No payments yet.'}</Text>
            ) : (
              withRunning.map(({ p, toDate }) => (
                <View key={p.id} style={styles.payRow}>
                  <View style={[styles.payIcon, { backgroundColor: theme.colors.successSoft }]}>
                    <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payAmount}>{inr(p.amount)}</Text>
                    <Text style={styles.payMeta}>
                      {longDate(p.paidAt)} · {p.method.replace('_', ' ')}
                      {p.reference ? ` · ${p.reference}` : ''}
                    </Text>
                  </View>
                  <PressableScale onPress={() => downloadReceipt(p, toDate)} accessibilityRole="button" accessibilityLabel="Download receipt" style={styles.receiptBtn}>
                    <Ionicons name={busy === p.id ? 'hourglass-outline' : 'download-outline'} size={15} color={theme.colors.primary} />
                    <Text style={styles.receiptText}>Receipt</Text>
                  </PressableScale>
                </View>
              ))
            )}
          </Panel>
        </FadeInView>

        {/* ---------- history ---------- */}
        {history.length > 0 ? (
          <FadeInView index={4}>
            <Panel title="History" icon="time-outline" subtitle="Who did what on this invoice">
              {history.map(h => (
                <View key={h.id} style={styles.histRow}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.primary }]} />
                  <Text style={styles.histText}>
                    <Text style={{ fontWeight: '800' }}>{h.actor?.name ?? 'Someone'}</Text> {describeWork(h)}
                  </Text>
                  <Text style={styles.histTime}>{longDate(h.at)}</Text>
                </View>
              ))}
            </Panel>
          </FadeInView>
        ) : null}
      </ScrollView>
    </View>
  );
}

function DateChip({ icon, label, value, danger }: { icon: React.ComponentProps<typeof Ionicons>['name']; label: string; value: string; danger?: boolean }) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = danger ? theme.colors.danger : theme.colors.textSecondary;
  return (
    <View style={[styles.chip, { backgroundColor: danger ? theme.colors.dangerSoft : theme.colors.surfaceAlt }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[styles.chipText, { color }]}>
        {label}: <Text style={{ fontWeight: '800' }}>{value}</Text>
      </Text>
    </View>
  );
}

function TotalLine({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.totalLine, strong ? styles.totalStrong : null]}>
      <Text style={[styles.totalLabel, strong ? { fontWeight: '800' } : null]}>{label}</Text>
      <Text style={[styles.totalValue, strong ? { fontSize: 17 } : null]}>{value}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 16, paddingBottom: 60, width: '100%', maxWidth: 820, alignSelf: 'center' },
    summary: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 12 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    summaryLabel: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    summaryValue: { color: theme.colors.text, fontSize: 28, fontWeight: '800', marginTop: 2 },
    track: { height: 10, borderRadius: 5, overflow: 'hidden' },
    fill: { height: 10, borderRadius: 5 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, flexWrap: 'wrap', gap: 6 },
    summaryMeta: { color: theme.colors.textSecondary, fontSize: 13 },
    dates: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
    chipText: { fontSize: 12 },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    parties: { flexDirection: 'row', gap: 10, paddingBottom: 12, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    partyLabel: { color: theme.colors.textMuted, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
    partyName: { color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 2 },
    partyMeta: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
    tableHead: { flexDirection: 'row', backgroundColor: theme.colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
    th: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    num: { textAlign: 'right' },
    tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    td: { color: theme.colors.text, fontSize: 13 },
    tdMeta: { color: theme.colors.textMuted, fontSize: 11, marginTop: 2 },
    totalLine: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 5 },
    totalStrong: { borderTopWidth: 2, borderTopColor: theme.colors.text, marginTop: 4, paddingTop: 8 },
    totalLabel: { color: theme.colors.textSecondary, fontSize: 13 },
    totalValue: { color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    notes: { color: theme.colors.textMuted, fontSize: 12, marginTop: 12, fontStyle: 'italic' },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 10 },
    payRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    payIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    payAmount: { color: theme.colors.text, fontWeight: '800', fontSize: 15 },
    payMeta: { color: theme.colors.textMuted, fontSize: 12, marginTop: 2 },
    receiptBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 },
    receiptText: { color: theme.colors.primary, fontSize: 12, fontWeight: '800' },
    histRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 7 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    histText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
    histTime: { color: theme.colors.textFaint, fontSize: 11 },
  });
}
