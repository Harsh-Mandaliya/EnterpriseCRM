import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { CompanyCodeLookup } from '@/components/auth/CompanyCodeLookup';
import { Button } from '@/components/common/Button';
import { InputField } from '@/components/form/fields';
import { FadeInView } from '@/components/motion/FadeInView';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import type { AuthStackParamList } from '@/navigation/AuthNavigator';
import { clearError, login } from '@/redux/slices/authSlice';
import { AuthLayout } from '@/screens/auth/components/AuthLayout';
import { useTheme } from '@/theme/ThemeProvider';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sign in. Sessions are stored securely on the device and kept
 * until sign-out (or until the server ends them).
 */
export function LoginScreen({ navigation }: Props) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const { isSubmitting, error } = useAppSelector(state => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A stale error from another screen must not show here.
  useFocusEffect(
    useCallback(() => {
      dispatch(clearError());
      setSubmitted(false);
    }, [dispatch]),
  );

  const emailError = !email.trim()
    ? 'Enter your work e-mail'
    : !EMAIL_PATTERN.test(email.trim())
      ? 'Enter a valid e-mail address'
      : undefined;
  const passwordError = password ? undefined : 'Enter your password';

  function clearServerError() {
    if (error) dispatch(clearError());
  }

  function handleSubmit() {
    setSubmitted(true);
    if (emailError || passwordError || isSubmitting) return;
    dispatch(login({ email: email.trim().toLowerCase(), password }));
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your CRM workspace."
      footer={
        <FadeInView delay={300} style={styles.footer}>
          <Text style={{ color: theme.colors.textMuted, fontSize: 14 }}>New company?</Text>
          <Pressable
            onPress={() => navigation.navigate('Register')}
            accessibilityRole="link"
            hitSlop={8}
          >
            <Text style={[styles.link, { color: theme.colors.primary }]}>Create a workspace</Text>
          </Pressable>
        </FadeInView>
      }
    >
      <CompanyCodeLookup />

      {error ? (
        <View
          style={[styles.alert, { backgroundColor: theme.colors.dangerSoft }]}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
        >
          <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
          <Text style={[styles.alertText, { color: theme.colors.danger }]}>{error}</Text>
        </View>
      ) : null}

      <InputField
        label="E-mail"
        icon="mail-outline"
        value={email}
        onChangeText={value => {
          setEmail(value);
          clearServerError();
        }}
        placeholder="you@company.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="next"
        error={submitted ? emailError : undefined}
      />

      <InputField
        label="Password"
        icon="lock-closed-outline"
        value={password}
        onChangeText={value => {
          setPassword(value);
          clearServerError();
        }}
        placeholder="Your password"
        secureTextEntry={!showPassword}
        autoCapitalize="none"
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={handleSubmit}
        error={submitted ? passwordError : undefined}
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

      <Pressable
        onPress={() => navigation.navigate('ForgotPassword')}
        accessibilityRole="link"
        hitSlop={8}
        style={styles.forgot}
      >
        <Text style={[styles.link, { color: theme.colors.primary }]}>Forgot password?</Text>
      </Pressable>

      <Button label="Sign in" onPress={handleSubmit} loading={isSubmitting} />

      <View style={styles.secure}>
        <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.textFaint} />
        <Text style={{ color: theme.colors.textFaint, fontSize: 12 }}>
          Your session is stored securely on this device.
        </Text>
      </View>
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
  alert: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 12, marginBottom: 14, alignItems: 'flex-start' },
  alertText: { flex: 1, fontSize: 14, lineHeight: 19 },
  forgot: { alignSelf: 'flex-end', marginTop: -6, marginBottom: 18 },
  link: { fontSize: 14, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 22 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
});
