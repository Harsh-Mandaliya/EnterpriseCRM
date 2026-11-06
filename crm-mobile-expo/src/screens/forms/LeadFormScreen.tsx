import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createLead, updateLead, updateLeadStatus } from '@/api/leads.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, InfoRow, InputField, PickerField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { AppStackParamList } from '@/navigation/types';
import { leadSourceOptions, leadStatusOptions } from '@/screens/forms/options';
import { saveWithDuplicateCheck } from '@/screens/forms/useDuplicateAwareSave';
import { useTheme } from '@/theme/ThemeProvider';
import type { LeadSource, LeadStatus } from '@/types';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'LeadForm'>;

type Values = {
  name: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  assignedToId: string | null;
  customerId: string | null;
};

const FORM_RULES = {
  name: rules.minLength('Name', 1),
  email: rules.email,
  phone: rules.phone,
};

/**
 * Create / edit a lead. Managers and admins can assign it to anyone
 * in their scope; reps always own the leads they create (the server
 * enforces this too).
 */
export function LeadFormScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const editing = route.params?.lead ?? null;
  const canAssign = useCan('lead.assign');
  const users = usePickerData('users', canAssign);
  const customers = usePickerData('customers');

  const form = useForm<Values>(
    {
      name: editing?.name ?? '',
      email: editing?.email ?? '',
      phone: editing?.phone ?? '',
      source: editing?.source ?? 'WEBSITE',
      status: (editing?.status === 'CONVERTED' ? 'QUALIFIED' : editing?.status) ?? 'NEW',
      assignedToId: editing?.assignedToId ?? null,
      customerId: editing?.customerId ?? null,
    },
    FORM_RULES,
  );
  const { values, setField } = form;

  const submit = form.handleSubmit(async v => {
    const payload = {
      name: v.name.trim(),
      email: v.email.trim() || undefined,
      phone: v.phone.trim() || undefined,
      source: v.source,
      customerId: v.customerId ?? undefined,
      ...(canAssign ? { assignedToId: v.assignedToId ?? undefined } : {}),
    };

    const saved = await saveWithDuplicateCheck(async allowDuplicate => {
      if (editing) {
        await updateLead(editing.id, {
          ...payload,
          email: v.email.trim(),
          phone: v.phone.trim(),
          customerId: v.customerId,
          ...(canAssign ? { assignedToId: v.assignedToId } : {}),
          allowDuplicate,
        });
        if (v.status !== editing.status && editing.status !== 'CONVERTED') {
          await updateLeadStatus(editing.id, v.status);
        }
      } else {
        await createLead({ ...payload, allowDuplicate });
      }
    }, 'lead');

    if (saved) navigation.goBack();
  }, `Couldn't ${editing ? 'update' : 'create'} the lead.`);

  return (
    <FormScreen
      title={editing ? 'Edit lead' : 'New lead'}
      subtitle={editing ? editing.name : 'Capture a new opportunity in seconds'}
      icon="person-add-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={editing ? 'Save changes' : 'Create lead'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Contact" icon="person-outline" description="Who is this lead?">
        <InputField
          label="Full name or company"
          icon="person-outline"
          required
          value={values.name}
          onChangeText={v => setField('name', v)}
          onBlur={() => form.touch('name')}
          autoCapitalize="words"
          maxLength={200}
          error={form.errorFor('name')}
          placeholder="e.g. Priya Sharma"
        />
        <InputField
          label="E-mail"
          icon="mail-outline"
          value={values.email}
          onChangeText={v => setField('email', v)}
          onBlur={() => form.touch('email')}
          keyboardType="email-address"
          autoCapitalize="none"
          error={form.errorFor('email')}
          placeholder="name@company.com"
        />
        <InputField
          label="Phone"
          icon="call-outline"
          value={values.phone}
          onChangeText={v => setField('phone', v)}
          onBlur={() => form.touch('phone')}
          keyboardType="phone-pad"
          error={form.errorFor('phone')}
          placeholder="+91 98765 43210"
          hint="We'll warn you if this e-mail or phone already exists."
        />
      </FormSection>

      <FormSection title="Qualification" icon="funnel-outline">
        <ChoiceField
          label="Where did it come from?"
          options={leadSourceOptions}
          value={values.source}
          onChange={v => setField('source', v)}
        />
        {editing && editing.status !== 'CONVERTED' ? (
          <ChoiceField
            label="Status"
            options={leadStatusOptions(theme)}
            value={values.status}
            onChange={v => setField('status', v)}
            hint="Use “Convert lead” on the lead screen to turn it into a customer."
          />
        ) : null}
      </FormSection>

      <FormSection title="Ownership" icon="people-outline">
        {canAssign ? (
          <PickerField
            label="Assigned to"
            placeholder="Unassigned"
            items={users.items}
            loading={users.loading}
            value={values.assignedToId}
            onChange={v => setField('assignedToId', v)}
            allowClear
            icon="person-circle-outline"
            hint="The assignee sees this lead and gets a notification."
          />
        ) : (
          <InfoRow icon="person-circle-outline" text="This lead will be assigned to you." />
        )}
        <PickerField
          label="Existing customer (optional)"
          placeholder="Not linked"
          items={customers.items}
          loading={customers.loading}
          value={values.customerId}
          onChange={v => setField('customerId', v)}
          allowClear
          icon="business-outline"
        />
      </FormSection>
    </FormScreen>
  );
}
