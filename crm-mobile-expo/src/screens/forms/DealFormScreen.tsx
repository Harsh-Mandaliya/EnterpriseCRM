import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createOpportunity, updateOpportunity } from '@/api/opportunities.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, DateField, InfoRow, InputField, PickerField } from '@/components/form/fields';
import { formatCompactCurrency } from '@/components/motion/AnimatedNumber';
import { parseMoney, rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { AppStackParamList } from '@/navigation/types';
import { dealStageOptions, STAGE_PROBABILITY, stageColor } from '@/screens/forms/options';
import { useTheme } from '@/theme/ThemeProvider';
import type { OpportunityStage } from '@/types';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'DealForm'>;

type Values = {
  title: string;
  amount: string;
  stage: OpportunityStage;
  closeDate: Date | null;
  customerId: string | null;
  leadId: string | null;
  ownerId: string | null;
};

const FORM_RULES = {
  title: rules.minLength('Deal name', 1),
  amount: rules.money('Amount'),
};

/** Create / edit a deal in the sales pipeline. */
export function DealFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const editing = route.params?.deal ?? null;
  const canAssign = useCan('deal.assign');
  const customers = usePickerData('customers');
  const leads = usePickerData('leads');
  const users = usePickerData('users', canAssign);

  const form = useForm<Values>(
    {
      title: editing?.title ?? '',
      amount: editing ? String(editing.amount) : '',
      stage: editing?.stage ?? 'PROSPECTING',
      closeDate: editing?.closeDate ? new Date(editing.closeDate) : null,
      customerId: editing?.customerId ?? route.params?.customerId ?? null,
      leadId: editing?.leadId ?? route.params?.leadId ?? null,
      ownerId: editing?.ownerId ?? null,
    },
    FORM_RULES,
  );
  const { values, setField } = form;

  const amount = form.errorFor('amount') ? 0 : parseMoney(values.amount);
  const probability = STAGE_PROBABILITY[values.stage];
  const color = stageColor(theme, values.stage);

  const submit = form.handleSubmit(async v => {
    // Noon local time so the date never shifts across time zones.
    const closeDate = v.closeDate
      ? new Date(v.closeDate.getFullYear(), v.closeDate.getMonth(), v.closeDate.getDate(), 12).toISOString()
      : undefined;
    if (editing) {
      await updateOpportunity(editing.id, {
        title: v.title.trim(),
        amount: parseMoney(v.amount),
        stage: v.stage,
        closeDate: closeDate ?? null,
        customerId: v.customerId,
        leadId: v.leadId,
        ...(canAssign ? { ownerId: v.ownerId } : {}),
      });
    } else {
      await createOpportunity({
        title: v.title.trim(),
        amount: parseMoney(v.amount),
        stage: v.stage,
        closeDate,
        customerId: v.customerId ?? undefined,
        leadId: v.leadId ?? undefined,
        ...(canAssign && v.ownerId ? { ownerId: v.ownerId } : {}),
      });
    }
    navigation.goBack();
  }, `Couldn't ${editing ? 'update' : 'create'} the deal.`);

  return (
    <FormScreen
      title={editing ? 'Edit deal' : 'New deal'}
      subtitle={editing ? editing.title : 'Add an opportunity to your pipeline'}
      icon="briefcase-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={editing ? 'Save deal' : 'Create deal'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Deal" icon="briefcase-outline">
        <InputField
          label="Deal name"
          icon="pricetag-outline"
          required
          value={values.title}
          onChangeText={v => setField('title', v)}
          onBlur={() => form.touch('title')}
          error={form.errorFor('title')}
          placeholder="e.g. Annual supply contract"
          maxLength={200}
        />
        <InputField
          label="Value"
          prefix="₹"
          value={values.amount}
          onChangeText={v => setField('amount', v)}
          onBlur={() => form.touch('amount')}
          keyboardType="decimal-pad"
          error={form.errorFor('amount')}
          placeholder="0"
        />
      </FormSection>

      <FormSection title="Pipeline stage" icon="git-branch-outline" description="Where is this deal right now?">
        <ChoiceField
          label="Stage"
          options={dealStageOptions(theme)}
          value={values.stage}
          onChange={v => setField('stage', v)}
        />
        <View style={[styles.forecast, { backgroundColor: theme.colors.surfaceAlt }]}>
          <View style={styles.forecastRow}>
            <Text style={[styles.forecastLabel, { color: theme.colors.textMuted }]}>Win probability</Text>
            <Text style={[styles.forecastValue, { color }]}>{Math.round(probability * 100)}%</Text>
          </View>
          <View style={[styles.track, { backgroundColor: theme.colors.border }]}>
            <View style={[styles.fill, { backgroundColor: color, width: `${probability * 100}%` }]} />
          </View>
          <Text style={[styles.forecastHint, { color: theme.colors.textSecondary }]}>
            Weighted value: <Text style={{ fontWeight: '800' }}>{formatCompactCurrency(amount * probability)}</Text>
            {'  '}of {formatCompactCurrency(amount)}
          </Text>
        </View>
        <DateField
          label="Expected close date"
          value={values.closeDate}
          onChange={v => setField('closeDate', v)}
          quickDays={[7, 14, 30, 60, 90]}
          allowClear
        />
      </FormSection>

      <FormSection title="Links & ownership" icon="link-outline">
        <PickerField
          label="Customer"
          placeholder="Not linked"
          items={customers.items}
          loading={customers.loading}
          value={values.customerId}
          onChange={v => setField('customerId', v)}
          allowClear
          icon="business-outline"
        />
        <PickerField
          label="Source lead"
          placeholder="Not linked"
          items={leads.items}
          loading={leads.loading}
          value={values.leadId}
          onChange={v => setField('leadId', v)}
          allowClear
          icon="person-outline"
        />
        {canAssign ? (
          <PickerField
            label="Deal owner"
            placeholder="Me"
            items={users.items}
            loading={users.loading}
            value={values.ownerId}
            onChange={v => setField('ownerId', v)}
            allowClear
            icon="person-circle-outline"
          />
        ) : (
          <InfoRow icon="person-circle-outline" text="You will own this deal." />
        )}
      </FormSection>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  forecast: { borderRadius: 14, padding: 14, marginBottom: 16, gap: 8 },
  forecastRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forecastLabel: { fontSize: 13, fontWeight: '600' },
  forecastValue: { fontSize: 20, fontWeight: '800' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  forecastHint: { fontSize: 13 },
});
