import React from 'react';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import authReducer from '@/redux/slices/authSlice';
import brandingReducer from '@/redux/slices/brandingSlice';
import { ThemeSettingsScreen } from '@/screens/settings/ThemeSettingsScreen';
import { ThemeProvider } from '@/theme/ThemeProvider';
import type { BrandingResponse, Me, Role } from '@/types';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

const mockGetBranding = jest.fn<() => Promise<BrandingResponse>>();
const mockUpdatePreferences = jest.fn<(update: unknown) => Promise<BrandingResponse>>();

jest.mock('@/api/company.api', () => ({
  getBranding: () => mockGetBranding(),
  updateMyThemePreferences: (update: unknown) => mockUpdatePreferences(update),
  updateBranding: jest.fn(),
  updateCompanyProfile: jest.fn(),
  getPublicBranding: jest.fn(),
}));

function brandingFor(canEdit: boolean, allowUserThemes = true): BrandingResponse {
  return {
    company: { id: 'c1', name: 'Acme Traders', slug: 'acme', timezone: 'Asia/Kolkata', locale: 'en-IN', currency: 'INR' },
    settings: {
      displayName: null,
      logoUrl: null,
      preset: 'classic',
      primaryColor: null,
      accentColor: null,
      cornerStyle: 'rounded',
      density: 'comfortable',
      colorMode: 'system',
      roleThemes: {},
      allowUserThemes,
    },
    preferences: { themePreset: null, colorMode: null },
    resolved: {
      preset: 'classic',
      colorMode: 'system',
      primaryColor: null,
      accentColor: null,
      cornerStyle: 'rounded',
      density: 'comfortable',
      displayName: 'Acme Traders',
      logoUrl: null,
      source: 'company',
    },
    canEdit,
  };
}

function renderAs(role: Role, branding: BrandingResponse) {
  mockGetBranding.mockResolvedValue(branding);

  const user = {
    id: 'u1',
    name: 'Test User',
    email: 't@example.test',
    role,
    companyId: 'c1',
    createdAt: '2026-01-01',
    company: { id: 'c1', name: 'Acme Traders' },
    branding,
  } as Me;

  const store = configureStore({
    reducer: { auth: authReducer, branding: brandingReducer },
    preloadedState: {
      auth: { status: 'authenticated' as const, isSubmitting: false, error: null, user },
      branding: { data: branding, preLogin: null, isSaving: false, isLoadingPublic: false, error: null, notice: null },
    },
  });

  render(
    <Provider store={store}>
      <SafeAreaProvider
        initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}
      >
        <ThemeProvider>
          <ThemeSettingsScreen />
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>,
  );

  return store;
}

describe('ThemeSettingsScreen', () => {
  beforeEach(() => {
    mockGetBranding.mockReset();
    mockUpdatePreferences.mockReset();
  });

  it('shows company branding controls to an OWNER', async () => {
    renderAs('OWNER', brandingFor(true));
    expect(await screen.findByText('Company branding')).toBeTruthy();
    expect(screen.getByText('Theme per role')).toBeTruthy();
    expect(screen.getByText('Save company code')).toBeTruthy();
  });

  it('hides company branding from a SALES user but keeps personal appearance', async () => {
    renderAs('SALES', brandingFor(false));
    expect(await screen.findByText('My appearance')).toBeTruthy();
    expect(screen.queryByText('Company branding')).toBeNull();
    expect(screen.queryByText('Save company code')).toBeNull();
  });

  it('explains when personal themes are disabled by the company', async () => {
    renderAs('EMPLOYEE', brandingFor(false, false));
    expect(await screen.findByText('Your company uses one theme for everyone.')).toBeTruthy();
  });

  it('saves a personal dark-mode choice', async () => {
    const branding = brandingFor(false);
    mockUpdatePreferences.mockResolvedValue({
      ...branding,
      preferences: { themePreset: null, colorMode: 'dark' },
      resolved: { ...branding.resolved, colorMode: 'dark' },
    });

    const store = renderAs('SALES', branding);
    await screen.findByText('My appearance');

    fireEvent.press(screen.getAllByLabelText('Dark')[0]);
    fireEvent.press(screen.getByLabelText('Save my appearance'));

    await waitFor(() => expect(mockUpdatePreferences).toHaveBeenCalledWith({ colorMode: 'dark' }));
    await waitFor(() => expect(store.getState().branding.data?.resolved.colorMode).toBe('dark'));
  });
});
