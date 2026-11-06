import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { InputField } from '@/components/form/fields';
import { FadeInView } from '@/components/motion/FadeInView';
import { rules, useForm } from '@/hooks/useForm';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { clearError, register } from '@/redux/slices/authSlice';
import { AuthLayout } from '@/screens/auth/components/AuthLayout';
import { PASSWORD_RULES, PasswordStrength } from '@/screens/auth/components/PasswordStrength';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

type Values = {
  companyName: string;
  ownerName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const FORM_RULES = {
  companyName: rules.minLength('Company name', 2),
  ownerName: rules.minLength('Your name', 2),
  email: (value: string) => rules.required('E-mail')(value) ?? rules.email(value),
  password: (value: string) =>
    PASSWORD_RULES.every(rule => rule.test(value)) ? undefined : 'Use 8+ characters with an uppercase letter and a number',
  confirmPassword: (value: string, values: Values) =>
    !value ? 'Confirm your password' : value !== values.password ? 'Passwords do not match' : undefined,
};

/**
 * Creates a new company workspace; the person registering becomes
 * its OWNER. Teammates are added later from Team management.
 */
export function RegisterScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isSubmitting, error } = useAppSelector(state => state.auth);
  const [step, setStep] = useState<1 | 2>(1);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<Values>(
    { companyName: '', ownerName: '', email: '', password: '', confirmPassword: '' },
    FORM_RULES,
  );

  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
    }, [dispatch]),
  );

  const stepOneValid = !form.errorFor('companyName') && !FORM_RULES.companyName(form.values.companyName);

  function next() {
    form.touch('companyName');
    if (FORM_RULES.companyName(form.values.companyName)) return;
    setStep(2);
  }

  function submit() {
    form.touch('ownerName');
    form.touch('email');
    form.touch('password');
    form.touch('confirmPassword');
    if (!form.isValid || isSubmitting) return;
    dispatch(
      register({
        companyName: form.values.companyName.trim(),
        ownerName: form.values.ownerName.trim(),
        email: form.values.email.trim().toLowerCase(),
        password: form.values.password,
      }),
    );
  }

  const setField = <K extends keyof Values>(key: K, value: Values[K]) => {
    form.setField(key, value);
    if (error) dispatch(clearError());
  };

  return (
    <AuthLayout
      title="Create your workspace"
      subtitle={step === 1 ? 'Step 1 of 2 · Your company' : 'Step 2 of 2 · Your owner account'}
      footer={
        <FadeInView delay={300} style={styles.footer}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Sign in</Text>
          </Pressable>
        </FadeInView>
      }
    >
      <View style={styles.steps} accessibilityLabel={`Step ${step} of 2`}>
        {[1, 2].map(n => (
          <View
            key={n}
            style={[styles.stepBar, { backgroundColor: n <= step ? theme.colors.primary : theme.colors.surfaceAlt }]}
          />
        ))}
      </View>

      {error ? (
        <View style={[styles.alert, { backgroundColor: theme.colors.dangerSoft }]} accessibilityRole="alert">
          <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
          <Text style={[styles.alertText, { color: theme.colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      {step === 1 ? (
        <FadeInView key="step1">
          <InputField
            label="Company name"
            icon="business-outline"
            required
            value={form.values.companyName}
            onChangeText={v => setField('companyName', v)}
            onBlur={() => form.touch('companyName')}
            placeholder="e.g. Sunrise Exports"
            autoCapitalize="words"
            maxLength={120}
            error={form.errorFor('companyName')}
            hint="You can change the display name, logo and colours later."
            returnKeyType="next"
            onSubmitEditing={next}
          />
          <View style={[styles.perk, { backgroundColor: theme.colors.primaryLight }]}>
            <Ionicons name="sparkles-outline" size={18} color={theme.colors.primary} />
            <Text style={[styles.perkText, { color: theme.colors.textSecondary }]}>
              You'll be the Owner: invite your team, set roles and choose your company's look.
            </Text>
          </View>
          <Button label="Continue" onPress={next} disabled={!stepOneValid && form.submitted} />
        </FadeInView>
      ) : (
        <FadeInView key="step2">
          <InputField
            label="Your full name"
            icon="person-outline"
            required
            value={form.values.ownerName}
            onChangeText={v => setField('ownerName', v)}
            onBlur={() => form.touch('ownerName')}
            autoCapitalize="words"
            autoComplete="name"
            error={form.errorFor('ownerName')}
          />
          <InputField
            label="Work e-mail"
            icon="mail-outline"
            required
            value={form.values.email}
            onChangeText={v => setField('email', v)}
            onBlur={() => form.touch('email')}
            placeholder="you@company.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            error={form.errorFor('email')}
          />
          <InputField
            label="Password"
            icon="lock-closed-outline"
            required
            value={form.values.password}
            onChangeText={v => setField('password', v)}
            onBlur={() => form.touch('password')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={form.errorFor('password')}
            suffix={
              <Pressable
                onPress={() => setShowPassword(v => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
              </Pressable>
            }
          />
          <PasswordStrength password={form.values.password} />
          <InputField
            label="Confirm password"
            icon="checkmark-done-outline"
            required
            value={form.values.confirmPassword}
            onChangeText={v => setField('confirmPassword', v)}
            onBlur={() => form.touch('confirmPassword')}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoComplete="new-password"
            error={form.errorFor('confirmPassword')}
            returnKeyType="go"
            onSubmitEditing={submit}
          />
          <View style={styles.row}>
            <Button label="Back" variant="secondary" onPress={() => setStep(1)} style={{ flex: 1 }} />
            <Button label="Create workspace" onPress={submit} loading={isSubmitting} style={{ flex: 2 }} />
          </View>
        </FadeInView>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  steps: { flexDirection: 'row', gap: 6, marginTop: -8, marginBottom: 18 },
  stepBar: { flex: 1, height: 4, borderRadius: 2 },
  alert: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 14 },
  alertText: { flex: 1, fontSize: 14, lineHeight: 19 },
  perk: { flexDirection: 'row', gap: 10, borderRadius: 12, padding: 12, marginBottom: 18, alignItems: 'flex-start' },
  perkText: { flex: 1, fontSize: 13, lineHeight: 18 },
  row: { flexDirection: 'row', gap: 10 },
  link: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
});
