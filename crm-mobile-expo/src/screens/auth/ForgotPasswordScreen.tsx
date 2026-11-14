import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { forgotPassword } from '@/api/auth.api';
import { getApiErrorMessage } from '@/api/client';
import { Button } from '@/components/common/Button';
import { InputField } from '@/components/form/fields';
import { FadeInView } from '@/components/motion/FadeInView';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { AuthLayout } from '@/screens/auth/components/AuthLayout';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Requests a password-reset link. The server answers the same
 * way whether or not the e-mail has an account.
 */
export function ForgotPasswordScreen({ navigation }: Props) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailError = touched && !EMAIL_PATTERN.test(email.trim()) ? 'Enter a valid e-mail address' : undefined;

  async function handleSubmit() {
    setTouched(true);
    if (!EMAIL_PATTERN.test(email.trim())) return;

    setSending(true);
    setError(null);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <AuthLayout
      title="Forgot your password?"
      subtitle={sent ? 'Check your inbox.' : "Enter the e-mail you sign in with and we'll send you a reset link."}
      footer={<BackToSignIn onPress={() => navigation.navigate('Login')} />}
    >
      {sent ? (
        <FadeInView>
          <View style={[styles.success, { backgroundColor: theme.colors.successSoft }]} accessibilityLiveRegion="polite">
            <Ionicons name="mail-open-outline" size={22} color={theme.colors.success} />
            <Text style={[styles.successText, { color: theme.colors.text }]}>
              If {email.trim()} has an account, a reset link is on its way. It expires in 30 minutes.
            </Text>
          </View>
          <Button label="I have a reset code" variant="secondary" onPress={() => navigation.navigate('ResetPassword', {})} />
        </FadeInView>
      ) : (
        <>
          <InputField
            label="E-mail"
            icon="mail-outline"
            value={email}
            onChangeText={setEmail}
            onBlur={() => setTouched(true)}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            placeholder="you@company.com"
            error={emailError}
            returnKeyType="send"
            onSubmitEditing={handleSubmit}
          />
          {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
          <Button label="Send reset link" onPress={handleSubmit} loading={sending} />
        </>
      )}
    </AuthLayout>
  );
}

export function BackToSignIn({ onPress }: { onPress: () => void }) {
  const theme = useTheme();
  return (
    <FadeInView delay={300} style={styles.footer}>
      <Pressable onPress={onPress} accessibilityRole="link" hitSlop={8} style={styles.footerLink}>
        <Ionicons name="arrow-back" size={16} color={theme.colors.primary} />
        <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '700' }}>Back to sign in</Text>
      </Pressable>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  success: { flexDirection: 'row', gap: 10, borderRadius: 14, padding: 14, marginBottom: 16, alignItems: 'flex-start' },
  successText: { flex: 1, fontSize: 14, lineHeight: 20 },
  error: { fontSize: 13, marginBottom: 12 },
  footer: { alignItems: 'center', marginTop: 22 },
  footerLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
