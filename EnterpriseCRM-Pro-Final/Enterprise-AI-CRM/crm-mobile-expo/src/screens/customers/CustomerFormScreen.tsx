import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createCustomer, updateCustomer } from '@/api/customer.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { InfoRow, InputField, PickerField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { MainStackParamList } from '@/navigation/OwnerNavigator';
import { saveWithDuplicateCheck } from '@/screens/forms/useDuplicateAwareSave';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<MainStackParamList, 'CustomerForm'>;

type Values = {
  name: string;
  email: string;
  phone: string;
  gstin: string;
  address: string;
  notes: string;
  ownerId: string | null;
};

/** 15-character Indian GSTIN: 2 digits, PAN (10), entity, Z, checksum. */
const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const FORM_RULES = {
  name: rules.minLength('Customer name', 2),
  email: rules.email,
  phone: rules.phone,
  gstin: (value: string) =>
    value.trim() && !GSTIN_PATTERN.test(value.trim().toUpperCase())
      ? 'GSTIN should look like 27ABCDE1234F1Z5'
      : undefined,
};

/**
 * Create / edit a customer. Reps own the customers they create;
 * managers and admins can choose the owner.
 */
export function CustomerFormScreen({ navigation, route }: Props) {
  const editing = route.params?.customer ?? null;
  const canReassign = useCan('customer.reassign');
  const users = usePickerData('users', canReassign);

  const form = useForm<Values>(
    {
      name: editing?.name ?? '',
      email: editing?.email ?? '',
      phone: editing?.phone ?? '',
      gstin: editing?.gstin ?? '',
      address: editing?.address ?? '',
      notes: editing?.notes ?? '',
      ownerId: editing?.ownerId ?? null,
    },
    FORM_RULES,
  );
  const { values, setField } = form;

  const submit = form.handleSubmit(async v => {
    const payload = {
      name: v.name.trim(),
      email: v.email.trim() || undefined,
      phone: v.phone.trim() || undefined,
      gstin: v.gstin.trim().toUpperCase() || undefined,
      address: v.address.trim() || undefined,
      notes: v.notes.trim() || undefined,
    };

    const saved = await saveWithDuplicateCheck(async allowDuplicate => {
      if (editing) {
        await updateCustomer(editing.id, {
          ...payload,
          // Empty strings clear optional fields on update.
          email: v.email.trim(),
          phone: v.phone.trim(),
          gstin: v.gstin.trim().toUpperCase(),
          address: v.address.trim(),
          notes: v.notes.trim(),
          ...(canReassign && v.ownerId !== (editing.ownerId ?? null) ? { ownerId: v.ownerId } : {}),
          allowDuplicate,
        });
      } else {
        await createCustomer({
          ...payload,
          ...(canReassign && v.ownerId ? { ownerId: v.ownerId } : {}),
          allowDuplicate,
        });
      }
    }, 'customer');

    if (saved) navigation.goBack();
  }, `Couldn't ${editing ? 'update' : 'create'} this customer.`);

  return (
    <FormScreen
      title={editing ? 'Edit customer' : 'New customer'}
      subtitle={editing ? editing.name : 'Add a business or person you sell to'}
      icon="business-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel={editing ? 'Save customer' : 'Create customer'}
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Contact" icon="person-outline">
        <InputField label="Customer name" required icon="business-outline" value={values.name} onChangeText={v => setField('name', v)} onBlur={() => form.touch('name')} error={form.errorFor('name')} autoCapitalize="words" placeholder="e.g. Sharma Textiles Pvt Ltd" maxLength={200} />
        <InputField label="E-mail" icon="mail-outline" value={values.email} onChangeText={v => setField('email', v)} onBlur={() => form.touch('email')} error={form.errorFor('email')} keyboardType="email-address" autoCapitalize="none" placeholder="accounts@company.com" />
        <InputField label="Phone" icon="call-outline" value={values.phone} onChangeText={v => setField('phone', v)} onBlur={() => form.touch('phone')} error={form.errorFor('phone')} keyboardType="phone-pad" placeholder="+91 98765 43210" />
      </FormSection>

      <FormSection title="Business" icon="document-text-outline" description="Used on invoices.">
        <InputField label="GSTIN" icon="receipt-outline" value={values.gstin} onChangeText={v => setField('gstin', v.toUpperCase())} onBlur={() => form.touch('gstin')} error={form.errorFor('gstin')} autoCapitalize="characters" maxLength={15} placeholder="27ABCDE1234F1Z5" hint="Optional. Format is checked; the number is not verified with the GST portal." />
        <InputField label="Billing address" icon="location-outline" value={values.address} onChangeText={v => setField('address', v)} multiline maxLength={500} placeholder="Street, city, state, PIN" />
        <InputField label="Internal notes" value={values.notes} onChangeText={v => setField('notes', v)} multiline maxLength={2000} placeholder="Visible to your team only" />
      </FormSection>

      <FormSection title="Ownership" icon="people-outline">
        {canReassign ? (
          <PickerField label="Owner" placeholder="Me" items={users.items} loading={users.loading} value={values.ownerId} onChange={v => setField('ownerId', v)} allowClear icon="person-circle-outline" hint="The owner (and anyone it's shared with) can see this customer." />
        ) : (
          <InfoRow icon="person-circle-outline" text={editing ? 'Ask a manager to transfer this customer to someone else.' : 'You will own this customer.'} />
        )}
      </FormSection>
    </FormScreen>
  );
}
