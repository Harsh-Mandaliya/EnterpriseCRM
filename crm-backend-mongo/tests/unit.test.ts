import './setup';

import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { computeTotals } from '@/modules/invoices/invoices.service';
import { resolveTheme } from '@/modules/company/company.service';
import { canManageUserWithRole } from '@/utils/permissions';
import { slugify } from '@/models/Company.model';
import type { CompanyBranding } from '@/models/Company.model';

describe('invoice totals', () => {
  test('sums line items and rounds tax to paise', () => {
    const totals = computeTotals(
      [
        { quantity: 3, unitPrice: 333.33 },
        { quantity: 1, unitPrice: 0.01 },
      ],
      18,
    );
    assert.equal(totals.subtotal, 1000);
    assert.equal(totals.tax, 180);
    assert.equal(totals.total, 1180);
  });

  test('zero tax and empty items', () => {
    assert.deepEqual(computeTotals([], 0), { subtotal: 0, tax: 0, total: 0 });
  });
});

describe('theme resolution', () => {
  const base: CompanyBranding = {
    displayName: null,
    logoUrl: null,
    preset: 'classic',
    primaryColor: '#123456',
    accentColor: null,
    cornerStyle: 'rounded',
    density: 'comfortable',
    colorMode: 'light',
    roleThemes: { SALES: 'emerald' },
    allowUserThemes: true,
  };

  test('company preset and colour overrides apply by default', () => {
    const theme = resolveTheme({ name: 'Acme' }, base, 'MANAGER', null);
    assert.equal(theme.preset, 'classic');
    assert.equal(theme.primaryColor, '#123456');
    assert.equal(theme.displayName, 'Acme');
    assert.equal(theme.source, 'company');
  });

  test('role preset beats company preset', () => {
    const theme = resolveTheme({ name: 'Acme' }, base, 'SALES', null);
    assert.equal(theme.preset, 'emerald');
    assert.equal(theme.primaryColor, null);
    assert.equal(theme.source, 'role');
  });

  test('user preset beats role preset only when allowed', () => {
    const prefs = { themePreset: 'royal' as const, colorMode: 'dark' as const };
    assert.equal(resolveTheme({ name: 'Acme' }, base, 'SALES', prefs).preset, 'royal');
    const locked = resolveTheme({ name: 'Acme' }, { ...base, allowUserThemes: false }, 'SALES', prefs);
    assert.equal(locked.preset, 'emerald');
    assert.equal(locked.colorMode, 'dark');
  });
});

describe('role hierarchy', () => {
  test('owner manages admins; admins do not manage admins or owners', () => {
    assert.equal(canManageUserWithRole('OWNER', 'ADMIN'), true);
    assert.equal(canManageUserWithRole('ADMIN', 'ADMIN'), false);
    assert.equal(canManageUserWithRole('ADMIN', 'OWNER'), false);
    assert.equal(canManageUserWithRole('ADMIN', 'SALES'), true);
    assert.equal(canManageUserWithRole('MANAGER', 'SALES'), false);
  });
});

describe('company code', () => {
  test('slugify produces a URL-safe code', () => {
    assert.equal(slugify('Shree Ganesh Traders Pvt. Ltd.'), 'shree-ganesh-traders-pvt-ltd');
    assert.equal(slugify('AB'), 'company-ab');
  });
});

describe('csv utilities', async () => {
  const { parseCsv, toCsv, rowsToRecords } = await import('@/utils/csv');

  test('parses quotes, escaped quotes, embedded newlines and CRLF', () => {
    const rows = parseCsv('\uFEFFa,b\r\n"x, y","say ""hi"""\r\n"multi\nline",z\r\n\r\n');
    assert.deepEqual(rows, [
      ['a', 'b'],
      ['x, y', 'say "hi"'],
      ['multi\nline', 'z'],
    ]);
  });

  test('throws on an unterminated quote', () => {
    assert.throws(() => parseCsv('a\n"oops'));
  });

  test('writes escaped cells and neutralises formulas', () => {
    const csv = toCsv(['name'], [['=1+1'], ['a,b'], ['+cmd'], ['plain'], [null]]);
    assert.equal(csv, "\uFEFFname\r\n'=1+1\r\n\"a,b\"\r\n'+cmd\r\nplain\r\n\r\n");
  });

  test('normalises header names', () => {
    const { records } = rowsToRecords([['Assigned To Email', 'Name'], ['a@b.c', 'X']]);
    assert.deepEqual(records, [{ assignedtoemail: 'a@b.c', name: 'X' }]);
  });
});

describe('phone normalisation', async () => {
  const { normalizePhone } = await import('@/utils/duplicates');
  test('compares the last 10 digits', () => {
    assert.equal(normalizePhone('+91 98765-43210'), '9876543210');
    assert.equal(normalizePhone('098765 43210'), '9876543210');
    assert.equal(normalizePhone('123'), null);
    assert.equal(normalizePhone(undefined), null);
  });
});
