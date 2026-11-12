import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Fab } from '@/components/common/Fab';
import { useCan } from '@/utils/permissions';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '@/navigation/types';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable,
  Alert,
} from 'react-native';

import { listPayments } from '@/api/payments.api';
import { usePdfCompany } from '@/hooks/usePdfCompany';
import { exportPdf, receiptHtml } from '@/utils/pdf';
import { colors } from '@/theme/colors';
import {
  typography,
  spacing,
  radius,
} from '@/theme/typography';

import type { Payment } from '@/types';

import { createThemedStyles } from '@/theme/themeStore';
/* ============================================================
   HELPERS
============================================================ */

function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    maximumFractionDigits: 0,
  })}`;
}

function formatMethod(method: string): string {
  return method
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/* ============================================================
   PAYMENT LIST SCREEN
============================================================ */

export function PaymentListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const canRecord = useCan('payment.record');
  const [items, setItems] = useState<Payment[]>([]);
  const [receiptFor, setReceiptFor] = useState<string | null>(null);
  const pdfCompany = usePdfCompany();

  // v1.4: printable receipt for one payment (paid-to-date counts every
  // payment on the same invoice up to and including this one).
  async function downloadReceipt(payment: Payment) {
    const invoice = typeof payment.invoiceId === 'object' ? payment.invoiceId : null;
    const invoiceId = invoice?.id ?? (typeof payment.invoiceId === 'string' ? payment.invoiceId : null);
    const customer = typeof payment.customerId === 'object' ? payment.customerId : null;
    setReceiptFor(payment.id);
    try {
      const paidToDate = items
        .filter(p => (typeof p.invoiceId === 'object' ? p.invoiceId.id : p.invoiceId) === invoiceId && new Date(p.paidAt) <= new Date(payment.paidAt))
        .reduce((sum, p) => sum + p.amount, 0);
      await exportPdf(
        receiptHtml({
          payment,
          invoiceNumber: invoice?.invoiceNumber ?? 'Invoice',
          invoiceTotal: invoice?.total ?? payment.amount,
          paidToDate,
          customerName: customer?.name ?? 'Customer',
          company: await pdfCompany(),
        }),
        `Receipt-${invoice?.invoiceNumber ?? payment.id.slice(-6)}.pdf`,
      );
    } catch {
      Alert.alert('Could not create the receipt', 'Please try again.');
    } finally {
      setReceiptFor(null);
    }
  }
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ==========================================================
     LOAD PAYMENTS
  ========================================================== */

  const loadPayments = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setError(null);

      try {
        const data = await listPayments();
        setItems(data);
      } catch (err: any) {
        setError(
          err?.response?.data?.error ??
            "Couldn't load payments. Please try again.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => loadPayments());

  /* ==========================================================
     REFRESH
  ========================================================== */

  async function handleRefresh() {
    setRefreshing(true);

    try {
      await loadPayments(false);
    } finally {
      setRefreshing(false);
    }
  }

  /* ==========================================================
     SUMMARY
  ========================================================== */

  const totalReceived = useMemo(
    () =>
      items.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      ),
    [items],
  );

  const paymentCount = items.length;

  const averagePayment =
    paymentCount > 0
      ? totalReceived / paymentCount
      : 0;

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading && items.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading payments...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     ERROR
  ========================================================== */

  if (error && items.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>
          Couldn't load payments
        </Text>

        <Text style={styles.errorText}>
          {error}
        </Text>

        <Pressable
          style={styles.retryButton}
          onPress={() => loadPayments()}
        >
          <Text style={styles.retryText}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }

  /* ==========================================================
     RENDER
  ========================================================== */

  return (
    <View style={styles.container}>
      {/* ======================================================
          HEADER
      ====================================================== */}

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.eyebrow}>
            PAYMENTS
          </Text>

          <Text style={styles.title}>
            Payment history
          </Text>

          <Text style={styles.subtitle}>
            Track money received from customers
          </Text>
        </View>

        <View style={styles.headerIcon}>
          <Text style={styles.headerIconText}>
            ₹
          </Text>
        </View>
      </View>

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <View style={styles.summaryRow}>
        <View style={styles.summaryCard}>
          <View style={styles.summaryIcon}>
            <Text style={styles.summaryIconText}>
              ₹
            </Text>
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>
              Received
            </Text>

            <Text
              style={styles.summaryValue}
              numberOfLines={1}
            >
              {formatCurrency(totalReceived)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.countIcon}>
            <Text style={styles.countIconText}>
              #
            </Text>
          </View>

          <View style={styles.summaryContent}>
            <Text style={styles.summaryLabel}>
              Payments
            </Text>

            <Text style={styles.summaryValue}>
              {paymentCount}
            </Text>
          </View>
        </View>
      </View>

      {/* ======================================================
          AVERAGE PAYMENT
      ====================================================== */}

      <View style={styles.averageRow}>
        <Text style={styles.averageLabel}>
          Average payment
        </Text>

        <Text style={styles.averageValue}>
          {formatCurrency(averagePayment)}
        </Text>
      </View>

      {/* ======================================================
          ERROR BANNER
      ====================================================== */}

      {error ? (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {error}
          </Text>
        </View>
      ) : null}

      {/* ======================================================
          PAYMENT LIST
      ====================================================== */}

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          items.length > 0 ? (
            <View style={styles.listHeader}>
              <Text style={styles.listTitle}>
                Recent payments
              </Text>

              <Text style={styles.listCount}>
                {items.length}
              </Text>
            </View>
          ) : undefined
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ₹
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No payments yet
            </Text>

            <Text style={styles.emptyText}>
              Payments recorded against invoices
              will appear here.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const invoice =
            typeof item.invoiceId === 'object'
              ? item.invoiceId
              : null;

          const customer =
            typeof item.customerId === 'object'
              ? item.customerId
              : null;

          const customerName =
            customer?.name ?? 'Customer';

          const invoiceNumber =
            invoice?.invoiceNumber ?? 'Invoice';

          return (
            <Pressable
              style={({ pressed }) => [styles.paymentCard, pressed && { opacity: 0.85 }]}
              disabled={!invoice}
              onPress={() => invoice && navigation.navigate('InvoiceDetail', { invoiceId: invoice.id })}
              accessibilityRole="button"
              accessibilityLabel={`Payment from ${customerName} for ${invoiceNumber}`}
            >
              {/* LEFT ICON */}

              <View style={styles.paymentIcon}>
                <Text style={styles.paymentIconText}>
                  ₹
                </Text>
              </View>

              {/* CONTENT */}

              <View style={styles.paymentContent}>
                <Text
                  style={styles.paymentTitle}
                  numberOfLines={1}
                >
                  {customerName}
                </Text>

                <Text
                  style={styles.invoiceText}
                  numberOfLines={1}
                >
                  {invoiceNumber}
                </Text>

                <View style={styles.metaRow}>
                  <Text style={styles.metaText}>
                    {formatMethod(item.method)}
                  </Text>

                  <View style={styles.dot} />

                  <Text style={styles.metaText}>
                    {new Date(
                      item.paidAt,
                    ).toLocaleDateString('en-IN')}
                  </Text>
                </View>
              </View>

              {/* AMOUNT */}

              <View style={styles.amountContainer}>
                <Text style={styles.amount}>
                  +{formatCurrency(item.amount)}
                </Text>

                <View style={styles.paidBadge}>
                  <Text style={styles.paidText}>
                    PAID
                  </Text>
                </View>

                <Pressable
                  onPress={() => downloadReceipt(item)}
                  disabled={receiptFor === item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Download receipt for ${invoiceNumber}`}
                  style={({ pressed }) => [styles.receiptButton, pressed && { opacity: 0.7 }]}
                  hitSlop={6}
                >
                  {receiptFor === item.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Text style={styles.receiptText}>⬇ Receipt</Text>
                  )}
                </Pressable>
              </View>
            </Pressable>
          );
        }}
      />

      {canRecord ? <Fab label="Record payment" icon="wallet-outline" onPress={() => navigation.navigate('PaymentForm')} /> : null}
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({
  receiptButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 82,
    alignItems: 'center',
  },
  receiptText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
  },

  /* ==========================================================
     CONTAINER
  ========================================================== */

  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: 30,
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },

  headerContent: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: colors.primary,
    marginBottom: 3,
  },

  title: {
    ...typography.h1,
    color: colors.text,
    fontWeight: '700',
  },

  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },

  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },

  headerIconText: {
    color: colors.textInverse,
    fontSize: 23,
    fontWeight: '700',
  },

  /* ==========================================================
     SUMMARY
  ========================================================== */

  summaryRow: {
    flexDirection: 'row',
    gap: 9,
    paddingHorizontal: spacing.md,
    marginTop: 4,
  },

  summaryCard: {
    flex: 1,
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },

  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  summaryIconText: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
  },

  countIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },

  countIconText: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '700',
  },

  summaryContent: {
    flex: 1,
    minWidth: 0,
  },

  summaryLabel: {
    fontSize: 10,
    color: colors.textMuted,
  },

  summaryValue: {
    fontSize: 17,
    lineHeight: 21,
    color: colors.text,
    fontWeight: '700',
    marginTop: 2,
  },

  /* ==========================================================
     AVERAGE
  ========================================================== */

  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: 3,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: colors.surface,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },

  averageLabel: {
    ...typography.small,
    color: colors.textMuted,
  },

  averageValue: {
    ...typography.bodyBold,
    color: colors.primary,
  },

  /* ==========================================================
     WARNING
  ========================================================== */

  warningBox: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.danger + '08',
    borderWidth: 1,
    borderColor: colors.danger + '25',
  },

  warningText: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.danger,
  },

  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl * 2,
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    paddingTop: 4,
  },

  listTitle: {
    ...typography.h3,
    color: colors.text,
    fontWeight: '700',
  },

  listCount: {
    fontSize: 10,
    color: colors.textMuted,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 4,
    overflow: 'hidden',
  },

  /* ==========================================================
     PAYMENT CARD
  ========================================================== */

  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 11,
    marginBottom: 8,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  paymentIconText: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '700',
  },

  paymentContent: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },

  paymentTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },

  invoiceText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  metaText: {
    fontSize: 9,
    color: colors.textMuted,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.textMuted,
    marginHorizontal: 6,
  },

  /* ==========================================================
     AMOUNT
  ========================================================== */

  amountContainer: {
    alignItems: 'flex-end',
    minWidth: 75,
  },

  amount: {
    fontSize: 13,
    color: colors.success,
    fontWeight: '700',
  },

  paidBadge: {
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.success + '12',
  },

  paidText: {
    fontSize: 8,
    color: colors.success,
    fontWeight: '800',
    letterSpacing: 0.4,
  },

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: 50,
  },

  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },

  emptyIconText: {
    fontSize: 26,
    color: colors.primary,
    fontWeight: '700',
  },

  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },

  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 280,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorTitle: {
    ...typography.h3,
    color: colors.text,
    textAlign: 'center',
  },

  errorText: {
    ...typography.caption,
    color: colors.danger,
    textAlign: 'center',
    marginTop: 5,
  },

  retryButton: {
    marginTop: 14,
    paddingHorizontal: 17,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
  },

  retryText: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '600',
  },
}));