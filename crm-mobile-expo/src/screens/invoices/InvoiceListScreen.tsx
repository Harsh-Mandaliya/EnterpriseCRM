import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { Fab } from '@/components/common/Fab';
import { useCan } from '@/utils/permissions';
import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  listInvoices,
} from '@/api/invoices.api';

import { colors } from '@/theme/colors';
import { typography, spacing, radius } from '@/theme/typography';

import type { Invoice, InvoiceStatus } from '@/types';
import type { MainStackParamList } from '@/navigation/OwnerNavigator';

import { createThemedStyles } from '@/theme/themeStore';
type Props = NativeStackScreenProps<
  MainStackParamList,
  'InvoiceList'
>;

/* ============================================================
   HELPERS
============================================================ */

function statusColor(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return colors.success;

    case 'OVERDUE':
      return colors.danger;

    case 'PENDING':
      return colors.warning;

    case 'CANCELLED':
      return colors.textMuted;

    default:
      return colors.status.new;
  }
}

function formatCurrency(value: number): string {
  return `₹${value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | Date): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Invalid date';
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ============================================================
   SCREEN
============================================================ */

export function InvoiceListScreen({
  navigation,
}: Props) {
  const canCreateInvoice = useCan('invoice.create');
  const canRecordPayment = useCan('payment.record');
  const [items, setItems] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ==========================================================
     LOAD INVOICES
  ========================================================== */

  const load = useCallback(async () => {
    try {
      setError(null);

      const data = await listInvoices();

      setItems(data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error ??
          err?.response?.data?.message ??
          "Couldn't load invoices.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Reload after returning from a create/edit form.
  useRefreshOnFocus(() => load());

  /* ==========================================================
     REFRESH
  ========================================================== */

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  /* ==========================================================
     LOADING
  ========================================================== */

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator
          size="large"
          color={colors.primary}
        />

        <Text style={styles.loadingText}>
          Loading invoices...
        </Text>
      </View>
    );
  }

  /* ==========================================================
     UI
  ========================================================== */

  return (
    <View style={styles.container}>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>
            {error}
          </Text>

          <Pressable
            onPress={load}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              Retry
            </Text>
          </Pressable>
        </View>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.list,
          items.length === 0 && styles.emptyList,
        ]}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Text style={styles.emptyIconText}>
                ₹
              </Text>
            </View>

            <Text style={styles.emptyTitle}>
              No invoices yet
            </Text>

            <Text style={styles.emptyText}>
              Create an invoice from a customer's
              detail page.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const currentStatusColor =
            statusColor(item.status);

          // v1.4: record a real payment (keeps the invoice, receipts and
          // reports consistent) instead of flipping the status to PAID.
          const canMarkPaid =
            canRecordPayment &&
            item.status !== 'PAID' &&
            item.status !== 'CANCELLED';

          return (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.buttonPressed]}
              onPress={() => navigation.navigate('InvoiceDetail', { invoiceId: item.id })}
              accessibilityRole="button"
              accessibilityLabel={`Open ${item.invoiceNumber}`}
            >
              {/* ==================================================
                  LEFT CONTENT
              ================================================== */}

              <View style={styles.rowContent}>
                <Text
                  style={styles.rowTitle}
                  numberOfLines={1}
                >
                  {item.invoiceNumber}
                </Text>

                <Text
                  style={styles.rowSubtitle}
                  numberOfLines={2}
                >
                  {item.customer?.name ??
                    'Unknown customer'}
                </Text>

                <Text style={styles.dueDate}>
                  Due {formatDate(item.dueDate)}
                </Text>

                <Text style={styles.amount}>
                  {formatCurrency(item.total)}
                </Text>
              </View>

              {/* ==================================================
                  RIGHT CONTENT
              ================================================== */}

              <View style={styles.rightCol}>
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        currentStatusColor + '22',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      {
                        color:
                          currentStatusColor,
                      },
                    ]}
                  >
                    {item.status === 'PENDING' ? 'DUE' : item.status}
                  </Text>
                </View>

                {canMarkPaid && (
                  <Pressable
                    onPress={() =>
                      navigation.navigate('PaymentForm', { invoiceId: item.id })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Record payment for ${item.invoiceNumber}`}
                    style={({ pressed }) => [
                      styles.payButton,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.payButtonText}>
                      Record payment
                    </Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {canCreateInvoice ? <Fab label="New invoice" onPress={() => navigation.navigate('InvoiceForm')} /> : null}
    </View>
  );
}

/* ============================================================
   STYLES
============================================================ */

const styles = createThemedStyles(() => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      colors.background,
  },

  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },

  /* ==========================================================
     ERROR
  ========================================================== */

  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },

  errorText: {
    ...typography.caption,
    color: colors.danger,
    flex: 1,
    marginRight: spacing.sm,
  },

  retryButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.danger,
  },

  retryText: {
    ...typography.small,
    color: colors.danger,
    fontWeight: '700',
  },

  /* ==========================================================
     LIST
  ========================================================== */

  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },

  emptyList: {
    flexGrow: 1,
  },

  /* ==========================================================
     EMPTY STATE
  ========================================================== */

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },

  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor:
      colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },

  emptyIconText: {
    color: colors.primary,
    fontSize: 22,
    fontWeight: '800',
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
    marginTop: spacing.xs,
    lineHeight: 20,
  },

  /* ==========================================================
     INVOICE ROW
  ========================================================== */

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },

  rowContent: {
    flex: 1,
    marginRight: spacing.sm,
    minWidth: 0,
  },

  rowTitle: {
    ...typography.bodyBold,
    color: colors.text,
  },

  rowSubtitle: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 3,
  },

  dueDate: {
    ...typography.small,
    color: colors.textMuted,
    marginTop: 4,
  },

  amount: {
    ...typography.h3,
    color: colors.primary,
    marginTop: spacing.xs,
  },

  /* ==========================================================
     RIGHT SIDE
  ========================================================== */

  rightCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    gap: spacing.xs,
  },

  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },

  badgeText: {
    ...typography.small,
    fontWeight: '700',
  },

  /* ==========================================================
     MARK PAID
  ========================================================== */

  payButton: {
    minWidth: 78,
    minHeight: 30,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },

  payButtonText: {
    ...typography.small,
    color: colors.success,
    fontWeight: '700',
  },

  buttonPressed: {
    opacity: 0.7,
  },
}));