import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createActivity } from '@/api/activities.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, DateField, InfoRow, InputField, PickerField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { AppStackParamList } from '@/navigation/types';
import { activityTypeOptions } from '@/screens/forms/options';
import type { ActivityType } from '@/types';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'TaskForm'>;

type Values = {
  type: ActivityType;
  summary: string;
  notes: string;
  dueAt: Date | null;
  assignedToId: string | null;
  leadId: string | null;
  customerId: string | null;
  opportunityId: string | null;
};

const PLACEHOLDER: Record<ActivityType, string> = {
  TASK: 'e.g. Send the revised quotation',
  CALL: 'e.g. Follow-up call about pricing',
  EMAIL: 'e.g. Share the product brochure',
  MEETING: 'e.g. Demo with the purchase team',
  NOTE: 'e.g. Customer prefers WhatsApp updates',
};

/**
 * Create a task, call, e-mail, meeting or note. Every role can log
 * activities; only managers and above can assign them to others.
 */
/** Picker value for a task with no single owner. */
export const GENERAL = "__general__";

export function TaskFormScreen({ navigation, route }: Props) {
  const canAssign = useCan('task.assign');
  const users = usePickerData('users', canAssign);
  const leads = usePickerData('leads');
  const customers = usePickerData('customers');
  const deals = usePickerData('deals');

  const form = useForm<Values>(
    {
      type: 'TASK',
      summary: '',
      notes: '',
      dueAt: null,
      assignedToId: null,
      leadId: route.params?.leadId ?? null,
      customerId: route.params?.customerId ?? null,
      opportunityId: route.params?.opportunityId ?? null,
    },
    { summary: rules.minLength('Title', 1) },
  );
  const { values, setField } = form;
  const isNote = values.type === 'NOTE';

  const submit = form.handleSubmit(async v => {
    await createActivity({
      type: v.type,
      summary: v.summary.trim(),
      notes: v.notes.trim() || undefined,
      dueAt: !isNote && v.dueAt ? v.dueAt.toISOString() : undefined,
      leadId: v.leadId ?? undefined,
      customerId: v.customerId ?? undefined,
      opportunityId: v.opportunityId ?? undefined,
      // Me (default) / a person / a general team task anyone can pick up.
      ...(canAssign && v.assignedToId ? { assignedToId: v.assignedToId === GENERAL ? null : v.assignedToId } : {}),
    });
    navigation.goBack();
  }, "Couldn't save the activity.");

  return (
    <FormScreen
      title="New activity"
      subtitle="Plan a follow-up or log what happened"
      icon="checkbox-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={isNote ? 'Save note' : 'Create task'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="What" icon="list-outline">
        <ChoiceField label="Type" options={activityTypeOptions} value={values.type} onChange={v => setField('type', v)} />
        <InputField
          label="Title"
          required
          icon="create-outline"
          value={values.summary}
          onChangeText={v => setField('summary', v)}
          onBlur={() => form.touch('summary')}
          error={form.errorFor('summary')}
          placeholder={PLACEHOLDER[values.type]}
          maxLength={200}
        />
        <InputField
          label="Details"
          value={values.notes}
          onChangeText={v => setField('notes', v)}
          multiline
          placeholder="Anything the next person should know"
          maxLength={2000}
        />
      </FormSection>

      {!isNote ? (
        <FormSection title="When & who" icon="time-outline">
          <DateField label="Due" value={values.dueAt} onChange={v => setField('dueAt', v)} withTime allowClear />
          {canAssign ? (
            <PickerField
              label="Assign to"
              placeholder="Me"
              items={[{ id: GENERAL, title: "General (team)", subtitle: "Anyone in the company can pick it up" }, ...users.items]}
              loading={users.loading}
              value={values.assignedToId}
              onChange={v => setField('assignedToId', v)}
              allowClear
              icon="person-circle-outline"
            />
          ) : (
            <InfoRow icon="person-circle-outline" text="This task will be assigned to you." />
          )}
        </FormSection>
      ) : null}

      <FormSection title="Related to" icon="link-outline" description="Optional — links show the activity on the record's timeline.">
        <PickerField label="Lead" placeholder="None" items={leads.items} loading={leads.loading} value={values.leadId} onChange={v => setField('leadId', v)} allowClear icon="person-outline" />
        <PickerField label="Customer" placeholder="None" items={customers.items} loading={customers.loading} value={values.customerId} onChange={v => setField('customerId', v)} allowClear icon="business-outline" />
        <PickerField label="Deal" placeholder="None" items={deals.items} loading={deals.loading} value={values.opportunityId} onChange={v => setField('opportunityId', v)} allowClear icon="briefcase-outline" />
      </FormSection>
    </FormScreen>
  );
}
