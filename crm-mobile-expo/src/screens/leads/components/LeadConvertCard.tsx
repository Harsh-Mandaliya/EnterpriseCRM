import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { convertLead } from '@/api/leads.api';
import { getApiErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { ConvertLeadResult, Lead } from '@/types';
import { confirmAction } from '@/utils/confirm';

/**
 * Converts a lead into a customer (or links its existing
 * customer) and optionally a deal. The server enforces who may
 * convert; EMPLOYEE users get a 403 and see the message.
 */
export function LeadConvertCard({
  lead,
  error: externalError,
  onConverted,
  onOpenCustomer,
}: {
  lead: Lead;
  /** Error from a conversion started elsewhere (pipeline chips). */
  error?: string | null;
  onConverted: (result: ConvertLeadResult) => void;
  onOpenCustomer: (customerId: string, customerName: string) => void;
}) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);

  const [createDeal, setCreateDeal] = useState(true);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountValue = amount.trim() === '' ? undefined : Number(amount.replace(/,/g, ''));
  const amountInvalid = amountValue !== undefined && (!Number.isFinite(amountValue) || amountValue < 0);

  if (lead.status === 'CONVERTED') {
    return (
      <View style={[styles.card, styles.doneCard]} accessibilityLabel="Lead converted">
        <View style={styles.row}>
          <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
          <Text style={styles.title}>Converted</Text>
        </View>
        <Text style={styles.subtitle}>
          {lead.convertedAt
            ? `Converted on ${new Date(lead.convertedAt).toLocaleDateString()}.`
            : 'This lead is now a customer.'}
        </Text>
        {lead.customerId ? (
          <Button
            label={`Open ${lead.customer?.name ?? 'customer'}`}
            variant="secondary"
            onPress={() => onOpenCustomer(lead.customerId!, lead.customer?.name ?? lead.name)}
          />
        ) : null}
      </View>
    );
  }

  if (lead.status === 'LOST' || lead.status === 'UNQUALIFIED') {
    return null;
  }

  async function handleConvert() {
    if (amountInvalid || busy) return;

    const confirmed = await confirmAction(
      'Convert lead',
      lead.customerId
        ? `Mark “${lead.name}” as converted for its existing customer${createDeal ? ' and create a deal' : ''}?`
        : `Create a customer from “${lead.name}”${createDeal ? ' and a new deal' : ''}?`,
      'Convert',
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    try {
      const result = await convertLead(lead.id, {
        createDeal,
        deal: createDeal ? { amount: amountValue } : undefined,
      });
      onConverted(result);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not convert this lead.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="swap-horizontal-outline" size={22} color={theme.colors.primary} />
        <Text style={styles.title}>Convert to customer</Text>
      </View>
      <Text style={styles.subtitle}>
        {lead.customerId
          ? `Linked to ${lead.customer?.name ?? 'a customer'}.`
          : 'Creates a customer with this lead’s contact details.'}{' '}
        The lead’s owner becomes the owner.
      </Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Also create a deal</Text>
        <Switch
          value={createDeal}
          onValueChange={setCreateDeal}
          trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
          accessibilityLabel="Also create a deal"
        />
      </View>

      {createDeal ? (
        <TextField
          label="Deal amount (optional)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          error={amountInvalid ? 'Enter a positive number' : undefined}
        />
      ) : null}

      {error ?? externalError ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error ?? externalError}
        </Text>
      ) : null}

      <Button
        label="Convert lead"
        onPress={handleConvert}
        loading={busy}
        disabled={amountInvalid}
      />
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    doneCard: {
      backgroundColor: theme.colors.successSoft,
      borderColor: theme.colors.successSoft,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    subtitle: {
      color: theme.colors.textMuted,
      fontSize: 13,
      lineHeight: 18,
    },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    switchLabel: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
    error: {
      color: theme.colors.danger,
      fontSize: 13,
    },
  });
}
