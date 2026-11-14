import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { updateCompanyProfile } from '@/api/company.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { InfoRow, InputField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { useAppSelector } from '@/hooks/useRedux';
import type { AppStackParamList } from '@/navigation/types';

type Props = NativeStackScreenProps<AppStackParamList, 'CompanyBilling'>;

type Values = {
  legalName: string;
  address: string;
  gstin: string;
  phone: string;
  email: string;
  bankDetails: string;
};

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/;

/** OWNER: the "from" block printed on every invoice and receipt. */
export function CompanyBillingScreen({ navigation }: Props) {
  const company = useAppSelector(state => state.branding.data?.company);
  const b = company?.billing;

  const form = useForm<Values>(
    {
      legalName: b?.legalName ?? company?.name ?? '',
      address: b?.address ?? '',
      gstin: b?.gstin ?? '',
      phone: b?.phone ?? '',
      email: b?.email ?? '',
      bankDetails: b?.bankDetails ?? '',
    },
    {
      legalName: rules.minLength('Legal name', 2),
      gstin: value => {
        const text = String(value ?? '').trim().toUpperCase();
        return text && !GSTIN.test(text) ? 'Enter a valid 15-character GSTIN' : undefined;
      },
      phone: rules.phone,
      email: rules.email,
    },
  );
  const { values, setField } = form;

  const submit = form.handleSubmit(async v => {
    const clean = (s: string) => s.trim() || null;
    await updateCompanyProfile({
      billing: {
        legalName: clean(v.legalName),
        address: clean(v.address),
        gstin: clean(v.gstin.toUpperCase()),
        phone: clean(v.phone),
        email: clean(v.email),
        bankDetails: clean(v.bankDetails),
      },
    });
    navigation.goBack();
  }, "Couldn't save the billing details.");

  return (
    <FormScreen
      title="Billing details"
      subtitle="Printed on invoices and receipts"
      icon="business-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel="Save details"
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Company" icon="business-outline">
        <InputField label="Legal name" required icon="briefcase-outline" value={values.legalName} onChangeText={v => setField('legalName', v)} onBlur={() => form.touch('legalName')} error={form.errorFor('legalName')} autoCapitalize="words" />
        <InputField label="Address" icon="location-outline" value={values.address} onChangeText={v => setField('address', v)} multiline placeholder="Street, city, state, PIN" />
        <InputField label="GSTIN" icon="shield-checkmark-outline" value={values.gstin} onChangeText={v => setField('gstin', v.toUpperCase())} onBlur={() => form.touch('gstin')} error={form.errorFor('gstin')} autoCapitalize="characters" placeholder="e.g. 24AABCS1234Q1Z5" />
      </FormSection>
      <FormSection title="Contact" icon="call-outline">
        <InputField label="Phone" icon="call-outline" value={values.phone} onChangeText={v => setField('phone', v)} onBlur={() => form.touch('phone')} error={form.errorFor('phone')} keyboardType="phone-pad" />
        <InputField label="E-mail" icon="mail-outline" value={values.email} onChangeText={v => setField('email', v)} onBlur={() => form.touch('email')} error={form.errorFor('email')} keyboardType="email-address" autoCapitalize="none" />
      </FormSection>
      <FormSection title="Payment instructions" icon="card-outline">
        <InputField label="Bank details" value={values.bankDetails} onChangeText={v => setField('bankDetails', v)} multiline placeholder={'Bank name, A/c no., IFSC, UPI ID'} />
        <InfoRow icon="information-circle-outline" text="Only the owner can change these. Everyone's bills and receipts use them." />
      </FormSection>
    </FormScreen>
  );
}
