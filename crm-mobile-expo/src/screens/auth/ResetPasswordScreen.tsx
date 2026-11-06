import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { resetPassword } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { InputField } from '@/components/form/fields';
import { FadeInView } from '@/components/motion/FadeInView';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { BackToSignIn } from '@/screens/auth/ForgotPasswordScreen';
import { AuthLayout } from '@/screens/auth/components/AuthLayout';
import { PASSWORD_RULES, PasswordStrength } from '@/screens/auth/components/PasswordStrength';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

/** Mirrors the server policy (auth.validation.ts). */
export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push('at least 8 characters');
  if (password.length > 128) problems.push('at most 128 characters');
  if (!/[A-Z]/.test(password)) problems.push('an uppercase letter');
  if (!/[0-9]/.test(password)) problems.push('a number');
  return problems;
}

/**
 * Sets a new password with the one-time token from the reset
 * e-mail. Opened from the e-mail link
 * (crmmobile://reset-password?token=…) or by pasting the token.
 */
export function ResetPasswordScreen({ navigation, route }: Props) {
  const theme = useTheme();
  const [token, setToken] = useState(route.params?.token ?? '');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const problems = passwordProblems(password);
  const tokenError = submitted && token.trim().length < 20 ? 'Paste the code from your reset e-mail' : undefined;
  const passwordError = submitted && problems.length > 0 ? `Needs ${problems.join(', ')}` : undefined;
  const confirmError = submitted && confirm !== password ? 'Passwords do not match' : undefined;

  async function handleSubmit() {
    setSubmitted(true);
    if (token.trim().length < 20 || problems.length > 0 || confirm !== password) return;

    setSaving(true);
    setError(null);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not reset your password.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={done ? 'All set.' : 'The reset link works once and expires after 30 minutes.'}
      footer={<BackToSignIn onPress={() => navigation.navigate('Login')} />}
    >
      {done ? (
        <FadeInView>
          <View style={[styles.success, { backgroundColor: theme.colors.successSoft }]} accessibilityLiveRegion="polite">
            <Ionicons name="shield-checkmark-outline" size={22} color={theme.colors.success} />
            <Text style={[styles.successText, { color: theme.colors.text }]}>
              Your password was changed and you were signed out everywhere. Sign in with the new password.
            </Text>
          </View>
          <Button label="Sign in" onPress={() => navigation.navigate('Login')} />
        </FadeInView>
      ) : (
        <>
          {route.params?.token ? null : (
            <InputField
              label="Reset code"
              icon="key-outline"
              value={token}
              onChangeText={setToken}
              autoCorrect={false}
              autoCapitalize="none"
              error={tokenError}
              hint="From the reset e-mail"
            />
          )}
          <InputField
            label="New password"
            icon="lock-closed-outline"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={passwordError}
            hint={PASSWORD_RULES.map(r => r.label).join(' · ')}
            suffix={
              <Pressable
                onPress={() => setShow(v => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={show ? 'Hide password' : 'Show password'}
              >
                <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.colors.textMuted} />
              </Pressable>
            }
          />
          <PasswordStrength password={password} />
          <InputField
            label="Confirm new password"
            icon="checkmark-done-outline"
            value={confirm}
            onChangeText={setConfirm}
            secureTextEntry={!show}
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
            error={confirmError}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
          <Button label="Save new password" onPress={handleSubmit} loading={saving} />
        </>
      )}
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'flex-start' },
  successText: { flex: 1, fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13, marginBottom: 12 },
});
