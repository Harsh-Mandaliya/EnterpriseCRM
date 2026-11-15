import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { updateMe } from '@/api/auth.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { InfoRow, InputField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import type { AppStackParamList } from '@/navigation/types';
import { setUser } from '@/redux/slices/authSlice';

type Props = NativeStackScreenProps<AppStackParamList, 'AccountDetails'>;

type Values = { name: string; phone: string; jobTitle: string; email: string; currentPassword: string };

/** Every role: edit your own name, phone, job title and sign-in e-mail. */
export function AccountDetailsScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const user = useAppSelector(state => state.auth.user);
  const google = user?.authProvider === 'GOOGLE';

  const form = useForm<Values>(
    {
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      jobTitle: user?.jobTitle ?? '',
      email: user?.email ?? '',
      currentPassword: '',
    },
    {
      name: rules.minLength('Name', 2),
      phone: rules.phone,
      email: value => rules.required('E-mail')(value) ?? rules.email(value),
      currentPassword: (value, values) =>
        values.email.trim().toLowerCase() !== (user?.email ?? '') && !String(value ?? '')
          ? 'Enter your current password to change the e-mail'
          : undefined,
    },
  );
  const { values, setField } = form;
  const emailChanged = values.email.trim().toLowerCase() !== (user?.email ?? '');

  const submit = form.handleSubmit(async v => {
    const me = await updateMe({
      name: v.name.trim(),
      phone: v.phone.trim(),
      jobTitle: v.jobTitle.trim(),
      ...(emailChanged ? { email: v.email.trim().toLowerCase(), currentPassword: v.currentPassword } : {}),
    });
    dispatch(setUser(me));
    navigation.goBack();
  }, "Couldn't save your details.");

  return (
    <FormScreen
      title="Account details"
      subtitle="Your own name, contact and sign-in"
      icon="person-circle-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel="Save details"
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Personal" icon="person-outline">
        <InputField label="Full name" required icon="person-outline" value={values.name} onChangeText={v => setField('name', v)} onBlur={() => form.touch('name')} error={form.errorFor('name')} autoCapitalize="words" />
        <InputField label="Phone" icon="call-outline" value={values.phone} onChangeText={v => setField('phone', v)} onBlur={() => form.touch('phone')} error={form.errorFor('phone')} keyboardType="phone-pad" placeholder="+91 98765 43210" />
        <InputField label="Job title" icon="briefcase-outline" value={values.jobTitle} onChangeText={v => setField('jobTitle', v)} placeholder="e.g. Accounts executive" autoCapitalize="words" />
      </FormSection>

      <FormSection title="Sign-in" icon="lock-closed-outline">
        <InputField label="E-mail" required icon="mail-outline" value={values.email} onChangeText={v => setField('email', v)} onBlur={() => form.touch('email')} error={form.errorFor('email')} keyboardType="email-address" autoCapitalize="none" editable={!google} />
        {emailChanged ? (
          <InputField label="Current password" required icon="key-outline" value={values.currentPassword} onChangeText={v => setField('currentPassword', v)} onBlur={() => form.touch('currentPassword')} error={form.errorFor('currentPassword')} secureTextEntry autoCapitalize="none" />
        ) : null}
        <InfoRow
          icon="information-circle-outline"
          text={google ? 'This account signs in with Google, so the e-mail cannot be changed here.' : 'Changing the e-mail changes what you sign in with, so it needs your password.'}
        />
        <InfoRow icon="shield-checkmark-outline" text={`Role: ${user?.role ?? ''} at ${user?.company?.name ?? ''}. Only an Owner or Admin can change your role.`} />
      </FormSection>
    </FormScreen>
  );
}
