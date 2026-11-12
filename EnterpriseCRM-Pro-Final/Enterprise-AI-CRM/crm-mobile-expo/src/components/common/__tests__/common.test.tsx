import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AxiosError, AxiosHeaders } from 'axios';

import { Button } from '@/components/common/Button';
import { ScreenState } from '@/components/common/ScreenState';
import { getApiErrorMessage } from '@/api/client';

jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));

describe('Button', () => {
  it('calls onPress and exposes its label to screen readers', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not fire while disabled or loading', () => {
    const onPress = jest.fn();
    render(<Button label="Save" onPress={onPress} disabled />);
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});

describe('ScreenState', () => {
  it('renders an error with a retry action', () => {
    const onRetry = jest.fn();
    render(<ScreenState kind="error" message="Network down" onRetry={onRetry} />);
    expect(screen.getByText('Network down')).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('getApiErrorMessage', () => {
  const config = { headers: new AxiosHeaders() };

  it('prefers the server error message', () => {
    const error = new AxiosError('Request failed', '403', config, null, {
      status: 403,
      statusText: 'Forbidden',
      headers: {},
      config,
      data: { error: 'You do not have permission to do this' },
    });
    expect(getApiErrorMessage(error)).toBe('You do not have permission to do this');
  });

  it('explains network failures', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', config);
    expect(getApiErrorMessage(error)).toMatch(/cannot reach the server/i);
  });

  it('falls back for unknown values', () => {
    expect(getApiErrorMessage(undefined, 'Fallback')).toBe('Fallback');
  });
});
