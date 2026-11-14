import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { createInvoice } from '@/api/invoices.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, DateField, FieldShell, InputField, PickerField, StepperField } from '@/components/form/fields';
import { AnimatedNumber } from '@/components/motion/AnimatedNumber';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { parseMoney, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { MainStackParamList } from '@/navigation/OwnerNavigator';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Product } from '@/types';
import { addDays } from '@/utils/dates';

type Props = NativeStackScreenProps<MainStackParamList, 'InvoiceForm'>;

interface LineDraft {
  key: number;
  productId: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
}

type Values = {
  customerId: string | null;
  taxRate: string;
  dueDate: Date | null;
  notes: string;
};

/** Common Indian GST slabs; any 0–100 rate can be typed. */
const TAX_OPTIONS = ['0', '5', '12', '18', '28'].map(rate => ({ value: rate, label: `${rate}%` }));

const money = (value: number) =>
  `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Same rounding as the server (invoices.service.ts computeTotals). */
export function computeInvoiceTotals(lines: { quantity: number; unitPrice: number }[], taxRate: number) {
  const subtotal = lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
  const tax = Math.round(subtotal * (taxRate / 100) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, tax, total: Math.round((subtotal + tax) * 100) / 100 };
}

let nextKey = 1;
const emptyLine = (): LineDraft => ({ key: nextKey++, productId: null, description: '', quantity: 1, unitPrice: '' });

/**
 * Create an invoice. Totals are previewed here with the server's
 * rounding; the server recalculates them on save.
 */
export function InvoiceFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const fixedCustomer = route.params?.customerId ?? null;
  const customers = usePickerData('customers', !fixedCustomer);
  const products = usePickerData('products');
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [linesTouched, setLinesTouched] = useState(false);

  const form = useForm<Values>(
    { customerId: fixedCustomer, taxRate: '18', dueDate: addDays(new Date(), 15), notes: '' },
    {
      customerId: value => (value ? undefined : 'Choose a customer'),
      taxRate: value => {
        const rate = Number(value);
        return value.trim() === '' || !Number.isFinite(rate) || rate < 0 || rate > 100 ? 'Tax must be 0–100%' : undefined;
      },
      dueDate: value => (value ? undefined : 'Choose a due date'),
    },
  );
  const { values, setField } = form;

  const lineErrors = lines.map(line => ({
    description: line.description.trim() ? undefined : 'Describe the item',
    unitPrice:
      line.unitPrice.trim() === '' || !Number.isFinite(parseMoney(line.unitPrice)) || parseMoney(line.unitPrice) < 0
        ? 'Enter a price'
        : undefined,
    quantity: line.quantity > 0 ? undefined : 'Must be more than 0',
  }));
  const linesValid = lineErrors.every(e => !e.description && !e.unitPrice && !e.quantity);

  const totals = useMemo(
    () =>
      computeInvoiceTotals(
        lines.map(l => ({ quantity: l.quantity, unitPrice: parseMoney(l.unitPrice) || 0 })),
        Number(values.taxRate) || 0,
      ),
    [lines, values.taxRate],
  );

  const updateLine = (key: number, patch: Partial<LineDraft>) =>
    setLines(current => current.map(line => (line.key === key ? { ...line, ...patch } : line)));

  const pickProduct = (key: number, productId: string | null) => {
    const product = (products.raw as Product[]).find(p => p.id === productId);
    updateLine(key, {
      productId,
      ...(product ? { description: product.name, unitPrice: String(product.price) } : {}),
    });
  };

  const submit = form.handleSubmit(async v => {
    setLinesTouched(true);
    if (!linesValid) throw new Error('Fix the highlighted line items.');
    const due = v.dueDate!;
    await createInvoice({
      customerId: v.customerId!,
      lineItems: lines.map(l => ({
        productId: l.productId ?? undefined,
        description: l.description.trim(),
        quantity: l.quantity,
        unitPrice: parseMoney(l.unitPrice),
      })),
      taxRate: Number(v.taxRate),
      dueDate: new Date(due.getFullYear(), due.getMonth(), due.getDate(), 12).toISOString(),
      notes: v.notes.trim() || undefined,
    });
    navigation.goBack();
  }, "Couldn't create the invoice.");

  return (
    <FormScreen
      title="New invoice"
      subtitle={route.params?.customerName ? `For ${route.params.customerName}` : 'Bill a customer'}
      icon="receipt-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={`Create · ${money(totals.total)}`}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={(form.completion + (linesValid ? 1 : 0)) / 2}
      footerNote="Totals are recalculated by the server when you save."
    >
      {!fixedCustomer ? (
        <FormSection title="Customer" icon="business-outline">
          <PickerField
            label="Bill to"
            required
            items={customers.items}
            loading={customers.loading}
            value={values.customerId}
            onChange={v => setField('customerId', v)}
            error={form.errorFor('customerId')}
            icon="business-outline"
          />
        </FormSection>
      ) : null}

      <FormSection title="Items" icon="list-outline" description="Pick a product to fill in the price, or type a custom item.">
        {lines.map((line, index) => {
          const errors: Partial<(typeof lineErrors)[number]> = linesTouched || form.submitted ? lineErrors[index] : {};
          const lineTotal = line.quantity * (parseMoney(line.unitPrice) || 0);
          return (
            <FadeInView key={line.key} style={styles.line}>
              <View style={styles.lineHeader}>
                <Text style={styles.lineTitle}>Item {index + 1}</Text>
                <Text style={styles.lineTotal}>{money(lineTotal)}</Text>
                {lines.length > 1 ? (
                  <Pressable
                    onPress={() => setLines(current => current.filter(l => l.key !== line.key))}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove item ${index + 1}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <PickerField
                label="Product"
                placeholder="Custom item"
                items={products.items}
                loading={products.loading}
                value={line.productId}
                onChange={id => pickProduct(line.key, id)}
                allowClear
                icon="cube-outline"
              />
              <InputField
                label="Description"
                required
                value={line.description}
                onChangeText={v => updateLine(line.key, { description: v })}
                error={errors.description}
                placeholder="What are you billing for?"
              />
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <StepperField label="Qty" value={line.quantity} onChange={v => updateLine(line.key, { quantity: v })} error={errors.quantity} />
                </View>
                <View style={{ flex: 1.2 }}>
                  <InputField
                    label="Unit price"
                    prefix="₹"
                    value={line.unitPrice}
                    onChangeText={v => updateLine(line.key, { unitPrice: v })}
                    keyboardType="decimal-pad"
                    error={errors.unitPrice}
                    placeholder="0"
                  />
                </View>
              </View>
            </FadeInView>
          );
        })}
        <PressableScale
          onPress={() => setLines(current => [...current, emptyLine()])}
          accessibilityRole="button"
          accessibilityLabel="Add another item"
          style={styles.addLine}
        >
          <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.addLineText}>Add item</Text>
        </PressableScale>
      </FormSection>

      <FormSection title="Tax & due date" icon="calculator-outline">
        <ChoiceField
          label="GST rate"
          options={TAX_OPTIONS}
          value={TAX_OPTIONS.some(o => o.value === values.taxRate) ? values.taxRate : null}
          onChange={v => setField('taxRate', v)}
        />
        <InputField
          label="Custom rate"
          suffix={<Text style={styles.suffix}>%</Text>}
          value={values.taxRate}
          onChangeText={v => setField('taxRate', v)}
          keyboardType="decimal-pad"
          error={form.errorFor('taxRate')}
          hint="A single rate for the whole invoice. Check your GST obligations with your accountant."
        />
        <DateField
          label="Due date"
          required
          value={values.dueDate}
          onChange={v => setField('dueDate', v)}
          quickDays={[0, 7, 15, 30, 45]}
          error={form.errorFor('dueDate')}
        />
        <InputField label="Notes for the customer" value={values.notes} onChangeText={v => setField('notes', v)} multiline placeholder="Payment instructions, bank details…" />
      </FormSection>

      <FormSection title="Summary" icon="wallet-outline">
        <FieldShell label="">
          <View style={styles.summary}>
            <SummaryRow label="Subtotal" value={totals.subtotal} />
            <SummaryRow label={`GST (${Number(values.taxRate) || 0}%)`} value={totals.tax} />
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <AnimatedNumber value={totals.total} format={money} style={styles.totalValue} />
            </View>
          </View>
        </FieldShell>
      </FormSection>
    </FormScreen>
  );
}

function SummaryRow({ label, value }: { label: string; value: number }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{money(value)}</Text>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    line: {
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: theme.radius.md,
      padding: 12,
      marginBottom: 12,
      backgroundColor: theme.colors.background,
    },
    lineHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    lineTitle: { flex: 1, color: theme.colors.text, fontWeight: '800', fontSize: 14 },
    lineTotal: { color: theme.colors.primary, fontWeight: '800', fontSize: 14 },
    row: { flexDirection: 'row', gap: 10 },
    addLine: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      minHeight: 46,
      borderRadius: theme.radius.md,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: theme.colors.primary,
    },
    addLineText: { color: theme.colors.primary, fontWeight: '800' },
    suffix: { color: theme.colors.textMuted, fontWeight: '700' },
    summary: { gap: 8 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: theme.colors.textMuted, fontSize: 14 },
    summaryValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
    totalLabel: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
    totalValue: { color: theme.colors.primary, fontSize: 22, fontWeight: '800' },
  });
}
