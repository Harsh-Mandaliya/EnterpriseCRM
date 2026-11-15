import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { changePassword } from '@/api/auth.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { InfoRow, InputField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import type { AppStackParamList } from '@/navigation/types';
import { passwordProblems } from '@/screens/auth/ResetPasswordScreen';
import { saveTokens } from '@/storage/secureStorage';

type Props = NativeStackScreenProps<AppStackParamList, 'ChangePassword'>;

type Values = { currentPassword: string; newPassword: string; confirm: string };

/** Every role: change your own password. Other devices are signed out. */
export function ChangePasswordScreen({ navigation }: Props) {
  const form = useForm<Values>(
    { currentPassword: '', newPassword: '', confirm: '' },
    {
      currentPassword: rules.required('Current password'),
      newPassword: (value, values) => {
        const problems = passwordProblems(String(value ?? ''));
        if (problems.length) return `Needs ${problems.join(', ')}`;
        return value === values.currentPassword ? 'Choose a password different from the current one' : undefined;
      },
      confirm: (value, values) => (value === values.newPassword ? undefined : 'Passwords do not match'),
    },
  );
  const { values, setField } = form;

  const submit = form.handleSubmit(async v => {
    // The server ends every session and returns a fresh one for this device.
    await saveTokens(await changePassword(v.currentPassword, v.newPassword));
    navigation.goBack();
  }, "Couldn't change the password.");

  const field = (key: keyof Values, label: string) => (
    <InputField label={label} required icon="key-outline" value={values[key]} onChangeText={v => setField(key, v)} onBlur={() => form.touch(key)} error={form.errorFor(key)} secureTextEntry autoCapitalize="none" autoCorrect={false} />
  );

  return (
    <FormScreen
      title="Change password"
      subtitle="Keeps this device signed in"
      icon="lock-closed-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel="Change password"
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
    >
      <FormSection title="Password" icon="lock-closed-outline">
        {field('currentPassword', 'Current password')}
        {field('newPassword', 'New password')}
        {field('confirm', 'Confirm new password')}
        <InfoRow icon="information-circle-outline" text="At least 8 characters with an uppercase letter and a number. Your other devices will be signed out." />
      </FormSection>
    </FormScreen>
  );
}
