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
type IconName = React.ComponentProps<typeof Ionicons>['name'];

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

/** What the company code will roughly look like (the server makes it unique). */
export function previewCompanyCode(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'your-company'
  );
}

const INCLUDED: { icon: IconName; title: string; text: string }[] = [
  { icon: 'people-outline', title: 'Your team, your rules', text: 'Add admins, managers, sales and staff — each sees only what their role allows.' },
  { icon: 'receipt-outline', title: 'GST bills & receipts', text: 'Create invoices, record payments and download them as PDF.' },
  { icon: 'bar-chart-outline', title: 'Reports that matter', text: 'Pipeline, money owed and who did what — for the whole company.' },
];

const STEPS: { n: 1 | 2; label: string; icon: IconName }[] = [
  { n: 1, label: 'Company', icon: 'business-outline' },
  { n: 2, label: 'Your account', icon: 'person-outline' },
];

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

  const stepOneValid = !FORM_RULES.companyName(form.values.companyName);

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
      title={step === 1 ? 'Set up your company' : 'Create your owner account'}
      subtitle={step === 1 ? 'Takes about a minute. You can change everything later.' : `Owner of ${form.values.companyName.trim() || 'your company'} — full access to every module.`}
      footer={
        <FadeInView delay={300} style={styles.footer}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>Already have an account?</Text>
          <Pressable onPress={() => navigation.navigate('Login')} accessibilityRole="link" hitSlop={8}>
            <Text style={[styles.link, { color: theme.colors.primary }]}>Sign in</Text>
          </Pressable>
        </FadeInView>
      }
    >
      {/* labelled step indicator */}
      <View style={styles.steps} accessibilityLabel={`Step ${step} of 2`}>
        {STEPS.map((s, i) => {
          const done = s.n < step;
          const active = s.n === step;
          const color = active || done ? theme.colors.primary : theme.colors.textFaint;
          return (
            <React.Fragment key={s.n}>
              {i > 0 ? <View style={[styles.stepLine, { backgroundColor: done || active ? theme.colors.primary : theme.colors.border }]} /> : null}
              <Pressable
                onPress={() => (s.n === 1 ? setStep(1) : next())}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={styles.stepItem}
              >
                <View style={[styles.stepDot, { borderColor: color, backgroundColor: done ? theme.colors.primary : active ? theme.colors.primaryLight : 'transparent' }]}>
                  <Ionicons name={done ? 'checkmark' : s.icon} size={16} color={done ? theme.colors.onPrimary : color} />
                </View>
                <Text style={[styles.stepLabel, { color: active ? theme.colors.text : theme.colors.textMuted }]}>{s.label}</Text>
              </Pressable>
            </React.Fragment>
          );
        })}
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
            placeholder="e.g. Sunrise Exports Pvt Ltd"
            autoCapitalize="words"
            maxLength={120}
            error={form.errorFor('companyName')}
            returnKeyType="next"
            onSubmitEditing={next}
          />
          <View style={[styles.codeBox, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
            <Ionicons name="key-outline" size={16} color={theme.colors.textMuted} />
            <Text style={[styles.codeText, { color: theme.colors.textSecondary }]}>
              Company code: <Text style={{ fontWeight: '800', color: theme.colors.text }}>{previewCompanyCode(form.values.companyName)}</Text>
            </Text>
          </View>
          <Text style={[styles.codeHint, { color: theme.colors.textMuted }]}>Your team enters this code on the sign-in screen to see your company’s name and colours.</Text>

          <View style={[styles.included, { borderColor: theme.colors.border }]}>
            <Text style={[styles.includedTitle, { color: theme.colors.text }]}>What’s included</Text>
            {INCLUDED.map(item => (
              <View key={item.title} style={styles.includedRow}>
                <View style={[styles.includedIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={17} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.includedHead, { color: theme.colors.text }]}>{item.title}</Text>
                  <Text style={[styles.includedText, { color: theme.colors.textMuted }]}>{item.text}</Text>
                </View>
              </View>
            ))}
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
            hint="You'll sign in with this e-mail."
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
          <View style={[styles.secure, { backgroundColor: theme.colors.surfaceAlt }]}>
            <Ionicons name="shield-checkmark-outline" size={16} color={theme.colors.success} />
            <Text style={[styles.secureText, { color: theme.colors.textMuted }]}>Passwords are stored encrypted. Your company’s data is kept separate from every other company.</Text>
          </View>
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
  steps: { flexDirection: 'row', alignItems: 'center', marginTop: -6, marginBottom: 20 },
  stepItem: { alignItems: 'center', gap: 4 },
  stepDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { fontSize: 12, fontWeight: '700' },
  stepLine: { flex: 1, height: 2, marginHorizontal: 8, marginBottom: 18, borderRadius: 1 },
  alert: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 14 },
  alertText: { flex: 1, fontSize: 14, lineHeight: 19 },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginTop: -4 },
  codeText: { flex: 1, fontSize: 13 },
  codeHint: { fontSize: 12, marginTop: 6, marginBottom: 16, lineHeight: 17 },
  included: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 18, gap: 12 },
  includedTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  includedRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  includedIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  includedHead: { fontSize: 14, fontWeight: '700' },
  includedText: { fontSize: 12.5, lineHeight: 17, marginTop: 1 },
  secure: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 10, marginBottom: 16, alignItems: 'flex-start' },
  secureText: { flex: 1, fontSize: 12, lineHeight: 17 },
  row: { flexDirection: 'row', gap: 10 },
  link: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
});
