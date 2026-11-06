import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  Switch,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { CompanyBrand } from '@/components/common/CompanyBrand';
import { ScreenState } from '@/components/common/ScreenState';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { TextField } from '@/components/common/TextField';
import { useAppDispatch, useAppSelector } from '@/hooks/useRedux';
import {
  clearBrandingError,
  clearBrandingNotice,
  fetchBranding,
  saveCompanyBranding,
  saveCompanyProfile,
  saveMyThemePreferences,
} from '@/redux/slices/brandingSlice';
import { ColorField } from '@/screens/settings/components/ColorField';
import { PresetPicker } from '@/screens/settings/components/PresetPicker';
import { ThemePreview } from '@/screens/settings/components/ThemePreview';
import { makeThemeSettingsStyles } from '@/screens/settings/ThemeSettingsScreen.styles';
import {
  previewConfig,
  useThemeSettingsForm,
} from '@/screens/settings/useThemeSettingsForm';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import { confirmAction } from '@/utils/confirm';

import type { Role, ThemeColorMode } from '@/types';

const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  SALES: 'Sales',
  EMPLOYEE: 'Employee',
};

const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES', 'EMPLOYEE'];

const MODE_OPTIONS: { value: ThemeColorMode; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

/* ============================================================
   THEME & BRANDING SETTINGS
   ------------------------------------------------------------
   • Everyone: personal colour mode and (if the company allows
     it) a personal theme preset.
   • OWNER / ADMIN: company branding — display name, logo,
     preset, brand colours, corner style, density, default
     colour mode, a preset per role, and whether users may pick
     their own preset.
   • OWNER: company code (used on the login screen), currency
     and time zone.
   The server enforces every one of these permissions.
============================================================ */

export function ThemeSettingsScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const styles = useThemedStyles(makeThemeSettingsStyles);
  const systemScheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  const role = useAppSelector(state => state.auth.user?.role ?? 'EMPLOYEE');
  const { data: branding, isSaving, error, notice } = useAppSelector(state => state.branding);

  const form = useThemeSettingsForm(branding);
  const [previewAs, setPreviewAs] = useState<'me' | 'company'>('me');
  const [previewRole, setPreviewRole] = useState<Role>(role);
  const [loadFailed, setLoadFailed] = useState(false);

  /* Always refresh on open so the form edits the latest values. */
  useEffect(() => {
    dispatch(fetchBranding())
      .unwrap()
      .then(() => setLoadFailed(false))
      .catch(() => setLoadFailed(true));
  }, [dispatch]);

  /* Saved-message banner fades after a few seconds. */
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => dispatch(clearBrandingNotice()), 3500);
    return () => clearTimeout(timer);
  }, [notice, dispatch]);

  useEffect(() => () => {
    dispatch(clearBrandingError());
  }, [dispatch]);

  if (!branding || !form.company) {
    return loadFailed ? (
      <ScreenState
        kind="error"
        message="Could not load your theme settings."
        onRetry={() => {
          setLoadFailed(false);
          dispatch(fetchBranding());
        }}
      />
    ) : (
      <ScreenState kind="loading" message="Loading theme settings" />
    );
  }

  const canEditCompany = branding.canEdit;
  const isOwner = role === 'OWNER';
  const allowUserThemes = branding.settings.allowUserThemes;

  const config = previewConfig(
    branding,
    form.company,
    form.personal,
    previewAs === 'me' ? role : previewRole,
    previewAs,
  );

  /* ---------------- actions ---------------- */

  const savePersonal = () => {
    dispatch(saveMyThemePreferences(form.personalUpdate));
  };

  const saveCompany = () => {
    if (!form.companyValid) return;
    dispatch(saveCompanyBranding(form.companyUpdate));
  };

  const resetCompanyToDefaults = async () => {
    const ok = await confirmAction(
      'Reset company branding?',
      'Everyone in your company will go back to the Classic theme with no logo, custom colours or role themes.',
      'Reset',
    );
    if (!ok) return;
    dispatch(
      saveCompanyBranding({
        displayName: null,
        logoUrl: null,
        preset: 'classic',
        primaryColor: null,
        accentColor: null,
        cornerStyle: 'rounded',
        density: 'comfortable',
        colorMode: 'system',
        allowUserThemes: true,
        roleThemes: Object.fromEntries(ROLES.map(r => [r, null])),
      }),
    );
  };

  const saveCompanyCode = () => {
    dispatch(saveCompanyProfile({ slug: form.companyCode.trim().toLowerCase() }));
  };

  const companyCodeError =
    form.companyCode.length > 0 && !/^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/.test(form.companyCode.trim().toLowerCase())
      ? '3–40 characters: lowercase letters, numbers and dashes.'
      : undefined;

  /* ---------------- render ---------------- */

  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.section}>
          <CompanyBrand size={44} subtitle={`Signed in as ${ROLE_LABELS[role]} · ${theme.presetName} theme`} />
        </View>

        {error ? (
          <Text style={styles.error} accessibilityLiveRegion="assertive">
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text style={styles.success} accessibilityLiveRegion="polite">
            {notice}
          </Text>
        ) : null}

        {/* ================= PREVIEW ================= */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preview</Text>
          <Text style={styles.sectionSubtitle}>
            Changes appear here first. They apply to the app when you save.
          </Text>

          {canEditCompany ? (
            <View style={styles.previewToggle}>
              <SegmentedControl
                accessibilityLabel="Preview as"
                value={previewAs}
                onChange={setPreviewAs}
                options={[
                  { value: 'me', label: 'My view' },
                  { value: 'company', label: 'A role’s view' },
                ]}
              />
            </View>
          ) : null}

          {canEditCompany && previewAs === 'company' ? (
            <View style={styles.previewToggle}>
              <SegmentedControl
                accessibilityLabel="Role to preview"
                value={previewRole}
                onChange={setPreviewRole}
                options={ROLES.map(r => ({ value: r, label: ROLE_LABELS[r] }))}
              />
            </View>
          ) : null}

          <ThemePreview
            config={config}
            systemScheme={systemScheme}
            roleLabel={ROLE_LABELS[previewAs === 'me' ? role : previewRole]}
          />
        </View>

        {/* ================= MY APPEARANCE ================= */}
        <Card style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="person-circle-outline" size={22} color={theme.colors.primary} />
            <Text style={styles.sectionTitle}>My appearance</Text>
          </View>
          <Text style={styles.sectionSubtitle}>Only affects your account, on every device you sign in to.</Text>

          <Text style={styles.label}>Colour mode</Text>
          <SegmentedControl
            accessibilityLabel="Colour mode"
            value={form.personal.colorMode ?? 'company'}
            onChange={value =>
              form.setPersonal(current => ({
                ...current,
                colorMode: value === 'company' ? null : (value as ThemeColorMode),
              }))
            }
            options={[{ value: 'company', label: 'Company' }, ...MODE_OPTIONS]}
          />

          <Text style={styles.label}>My theme</Text>
          {allowUserThemes ? (
            <PresetPicker
              value={form.personal.themePreset}
              onChange={value => form.setPersonal(current => ({ ...current, themePreset: value }))}
              allowInherit
              inheritLabel="Company theme"
            />
          ) : (
            <Text style={styles.lockedNote}>Your company uses one theme for everyone.</Text>
          )}

          <View style={styles.actions}>
            <Button
              label="Save my appearance"
              onPress={savePersonal}
              disabled={!form.hasPersonalChanges}
              loading={isSaving && form.hasPersonalChanges}
              style={styles.action}
            />
          </View>
        </Card>

        {/* ================= COMPANY BRANDING ================= */}
        {canEditCompany ? (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="color-palette-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Company branding</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Applies to everyone in {branding.company.name}. Other companies are never affected.
            </Text>

            <TextField
              label="App display name"
              value={form.company.displayName}
              onChangeText={value => form.updateCompany('displayName', value)}
              placeholder={branding.company.name}
              maxLength={60}
              autoCapitalize="words"
              error={form.companyErrors.displayName}
            />

            <TextField
              label="Logo URL"
              value={form.company.logoUrl}
              onChangeText={value => form.updateCompany('logoUrl', value)}
              placeholder="https://your-company.com/logo.png"
              keyboardType="url"
              autoCorrect={false}
              error={form.companyErrors.logoUrl}
              hint="Square PNG/JPG over https. Shown in the app header and login screen."
            />

            <Text style={styles.label}>Theme preset</Text>
            <PresetPicker
              value={form.company.preset}
              onChange={value => value && form.updateCompany('preset', value)}
            />

            <Text style={styles.label}>Brand colours (optional)</Text>
            <ColorField
              label="Primary colour"
              value={form.company.primaryColor}
              onChange={value => form.updateCompany('primaryColor', value)}
              error={form.companyErrors.primaryColor}
            />
            <ColorField
              label="Accent colour"
              value={form.company.accentColor}
              onChange={value => form.updateCompany('accentColor', value)}
              error={form.companyErrors.accentColor}
            />

            <Text style={styles.label}>Corners</Text>
            <SegmentedControl
              accessibilityLabel="Corner style"
              value={form.company.cornerStyle}
              onChange={value => form.updateCompany('cornerStyle', value)}
              options={[
                { value: 'sharp', label: 'Sharp' },
                { value: 'rounded', label: 'Rounded' },
                { value: 'pill', label: 'Pill' },
              ]}
            />

            <Text style={styles.label}>Density</Text>
            <SegmentedControl
              accessibilityLabel="Density"
              value={form.company.density}
              onChange={value => form.updateCompany('density', value)}
              options={[
                { value: 'comfortable', label: 'Comfortable' },
                { value: 'compact', label: 'Compact' },
              ]}
            />

            <Text style={styles.label}>Default colour mode</Text>
            <SegmentedControl
              accessibilityLabel="Default colour mode"
              value={form.company.colorMode}
              onChange={value => form.updateCompany('colorMode', value)}
              options={MODE_OPTIONS}
            />

            <View style={styles.switchRow}>
              <View style={styles.switchText}>
                <Text style={styles.switchTitle}>Let people choose their own theme</Text>
                <Text style={styles.switchHint}>Colour mode is always personal.</Text>
              </View>
              <Switch
                value={form.company.allowUserThemes}
                onValueChange={value => form.updateCompany('allowUserThemes', value)}
                trackColor={{ true: theme.colors.primary, false: theme.colors.borderStrong }}
                accessibilityLabel="Let people choose their own theme"
              />
            </View>

            <Text style={styles.label}>Theme per role</Text>
            <Text style={styles.sectionSubtitle}>
              Give a role its own look — for example a different theme for the sales team.
            </Text>
            {ROLES.map(r => (
              <View key={r} style={styles.roleRow}>
                <Text style={styles.roleName}>{ROLE_LABELS[r]}</Text>
                <PresetPicker
                  value={form.company?.roleThemes[r] ?? null}
                  onChange={value => form.setRoleTheme(r, value)}
                  allowInherit
                />
              </View>
            ))}

            <View style={styles.actions}>
              <Button
                label="Discard"
                variant="secondary"
                onPress={form.resetCompanyDraft}
                disabled={!form.hasCompanyChanges || isSaving}
                style={styles.action}
              />
              <Button
                label="Save for company"
                onPress={saveCompany}
                disabled={!form.hasCompanyChanges || !form.companyValid}
                loading={isSaving && form.hasCompanyChanges}
                style={styles.action}
              />
            </View>

            <Button
              label="Reset to default branding"
              variant="outline"
              onPress={resetCompanyToDefaults}
              disabled={isSaving}
              style={{ marginTop: theme.spacing.sm }}
            />

            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={18} color={theme.colors.info} />
              <Text style={styles.noteText}>
                Branding changes the app’s colours, logo and name inside the app. The icon and name on the
                phone’s home screen come from the installed build and need a separate app build per brand.
              </Text>
            </View>
          </Card>
        ) : null}

        {/* ================= COMPANY CODE ================= */}
        {isOwner ? (
          <Card style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="key-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Company code</Text>
            </View>
            <Text style={styles.sectionSubtitle}>
              Teammates enter this code on the sign-in screen to see your branding before they log in.
            </Text>
            <TextField
              label="Company code"
              value={form.companyCode}
              onChangeText={form.setCompanyCode}
              autoCorrect={false}
              maxLength={40}
              error={companyCodeError}
            />
            <Button
              label="Save company code"
              onPress={saveCompanyCode}
              disabled={form.companyCode === branding.company.slug || Boolean(companyCodeError) || isSaving}
            />
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
