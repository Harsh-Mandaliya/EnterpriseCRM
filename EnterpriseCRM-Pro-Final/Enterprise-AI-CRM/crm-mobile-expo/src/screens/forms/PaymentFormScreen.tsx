import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createPayment, getInvoicePaymentSummary } from '@/api/payments.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, DateField, InputField, PickerField } from '@/components/form/fields';
import { PressableScale } from '@/components/motion/PressableScale';
import { Skeleton } from '@/components/motion/Skeleton';
import { parseMoney, rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { AppStackParamList } from '@/navigation/types';
import { paymentMethodOptions } from '@/screens/forms/options';
import { useTheme } from '@/theme/ThemeProvider';
import type { PaymentMethod } from '@/types';

type Props = NativeStackScreenProps<AppStackParamList, 'PaymentForm'>;

type Values = {
  invoiceId: string | null;
  amount: string;
  method: PaymentMethod;
  reference: string;
  paidAt: Date | null;
};

type Summary = { invoiceTotal: number; totalPaid: number; balanceDue: number; status: string };

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Record money received against an open invoice. Partial payments
 * are allowed; the invoice becomes PAID automatically when the
 * balance reaches zero.
 */
export function PaymentFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const invoices = usePickerData('invoices');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const form = useForm<Values>(
    { invoiceId: route.params?.invoiceId ?? null, amount: '', method: 'UPI', reference: '', paidAt: new Date() },
    {
      invoiceId: value => (value ? undefined : 'Choose the invoice being paid'),
      amount: (value, all) => {
        const base = rules.money('Amount', { min: 0.01, required: true })(value);
        if (base) return base;
        return summary && all.invoiceId && parseMoney(value) > summary.balanceDue + 0.005
          ? `More than the balance due (${money(summary.balanceDue)})`
          : undefined;
      },
    },
  );
  const { values, setField } = form;

  useEffect(() => {
    if (!values.invoiceId) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    setSummaryLoading(true);
    getInvoicePaymentSummary(values.invoiceId)
      .then(result => !cancelled && setSummary(result))
      .catch(() => !cancelled && setSummary(null))
      .finally(() => !cancelled && setSummaryLoading(false));
    return () => {
      cancelled = true;
    };
  }, [values.invoiceId]);

  const submit = form.handleSubmit(async v => {
    await createPayment({
      invoiceId: v.invoiceId!,
      amount: parseMoney(v.amount),
      method: v.method,
      reference: v.reference.trim() || undefined,
      paidAt: v.paidAt ? v.paidAt.toISOString() : undefined,
    });
    navigation.goBack();
  }, "Couldn't record the payment.");

  const paidRatio = summary && summary.invoiceTotal > 0 ? summary.totalPaid / summary.invoiceTotal : 0;

  return (
    <FormScreen
      title="Record payment"
      subtitle="Money received from a customer"
      icon="wallet-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={values.amount ? `Record ${money(parseMoney(values.amount) || 0)}` : 'Record payment'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Invoice" icon="receipt-outline">
        <PickerField
          label="Invoice"
          required
          placeholder="Choose an open invoice"
          items={invoices.items}
          loading={invoices.loading}
          value={values.invoiceId}
          onChange={v => setField('invoiceId', v)}
          error={form.errorFor('invoiceId')}
          icon="receipt-outline"
          hint={!invoices.loading && invoices.items.length === 0 ? 'No pending or overdue invoices you can see.' : undefined}
        />

        {summaryLoading ? (
          <Skeleton height={70} radius={14} />
        ) : summary ? (
          <View style={[styles.balance, { backgroundColor: theme.colors.surfaceAlt }]}>
            <View style={styles.balanceRow}>
              <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>Balance due</Text>
              <Text style={[styles.balanceValue, { color: theme.colors.text }]}>{money(summary.balanceDue)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
              <View style={[styles.fill, { backgroundColor: theme.colors.success, width: `${Math.min(100, paidRatio * 100)}%` }]} />
            </View>
            <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>
              {money(summary.totalPaid)} paid of {money(summary.invoiceTotal)}
            </Text>
          </View>
        ) : null}
      </FormSection>

      <FormSection title="Payment" icon="cash-outline">
        <InputField
          label="Amount received"
          required
          prefix="₹"
          value={values.amount}
          onChangeText={v => setField('amount', v)}
          onBlur={() => form.touch('amount')}
          keyboardType="decimal-pad"
          error={form.errorFor('amount')}
          placeholder="0"
          suffix={
            summary && summary.balanceDue > 0 ? (
              <PressableScale
                onPress={() => setField('amount', summary.balanceDue.toFixed(2))}
                accessibilityRole="button"
                accessibilityLabel="Fill in the full balance"
                style={[styles.fullChip, { backgroundColor: theme.colors.primaryLight }]}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 12 }}>Full</Text>
              </PressableScale>
            ) : undefined
          }
        />
        <ChoiceField label="Method" options={paymentMethodOptions} value={values.method} onChange={v => setField('method', v)} />
        <InputField
          label="Reference"
          icon="document-text-outline"
          value={values.reference}
          onChangeText={v => setField('reference', v)}
          placeholder="UPI ref / cheque no. / transaction ID"
          maxLength={120}
        />
        <DateField label="Received on" value={values.paidAt} onChange={v => setField('paidAt', v)} quickDays={[0, -1, -2]} />
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  balance: { borderRadius: 14, padding: 14, gap: 8 },
  balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  balanceLabel: { fontSize: 13, fontWeight: '600' },
  balanceValue: { fontSize: 20, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  fullChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
});
