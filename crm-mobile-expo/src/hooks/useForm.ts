import { useCallback, useMemo, useRef, useState } from 'react';
import axios from 'axios';

import { getApiErrorMessage } from '@/api/client';

/* ============================================================
   useForm
   ------------------------------------------------------------
   Small form-state helper shared by every create/edit screen:
   values, per-field validation, touched state, submit handling
   and mapping of server validation errors (zod "fieldErrors")
   back onto fields.
============================================================ */

export type Validator<T> = (value: T[keyof T], values: T) => string | undefined;
export type Rules<T> = Partial<{ [K in keyof T]: (value: T[K], values: T) => string | undefined }>;

export function useForm<T extends Record<string, unknown>>(initial: T, rules: Rules<T>) {
  const [values, setValues] = useState<T>(initial);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<Partial<Record<keyof T, string>>>({});
  const initialRef = useRef(initial);

  const validationErrors = useMemo(() => {
    const errors: Partial<Record<keyof T, string>> = {};
    for (const key of Object.keys(rules) as (keyof T)[]) {
      const rule = rules[key];
      const message = rule?.(values[key], values);
      if (message) errors[key] = message;
    }
    return errors;
  }, [rules, values]);

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValues(current => ({ ...current, [key]: value }));
    setServerErrors(current => ({ ...current, [key]: undefined }));
  }, []);

  const touch = useCallback((key: keyof T) => setTouched(current => ({ ...current, [key]: true })), []);

  /** Error to show for a field: after blur or a submit attempt. */
  const errorFor = useCallback(
    (key: keyof T): string | undefined =>
      serverErrors[key] ?? (submitted || touched[key] ? validationErrors[key] : undefined),
    [serverErrors, submitted, touched, validationErrors],
  );

  const isValid = Object.keys(validationErrors).length === 0;
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialRef.current);

  /** Share of rule-checked fields that are currently valid (0–1). */
  const completion = useMemo(() => {
    const keys = Object.keys(rules);
    if (keys.length === 0) return 1;
    return keys.filter(key => !validationErrors[key as keyof T]).length / keys.length;
  }, [rules, validationErrors]);

  const handleSubmit = useCallback(
    (onValid: (values: T) => Promise<void>, fallbackMessage = 'Could not save. Please try again.') =>
      async () => {
        setSubmitted(true);
        setFormError(null);
        if (!isValid || submitting) return;
        setSubmitting(true);
        try {
          await onValid(values);
        } catch (error) {
          // Map zod `fieldErrors` from the API onto fields.
          if (axios.isAxiosError(error)) {
            const details = (error.response?.data as { details?: { fieldErrors?: Record<string, string[]> } })
              ?.details;
            const bodyErrors = details?.fieldErrors?.body;
            if (details?.fieldErrors && !bodyErrors) {
              const mapped: Partial<Record<keyof T, string>> = {};
              for (const [key, messages] of Object.entries(details.fieldErrors)) {
                if (key in values && messages?.[0]) mapped[key as keyof T] = messages[0];
              }
              setServerErrors(mapped);
            }
          }
          setFormError(getApiErrorMessage(error, fallbackMessage));
        } finally {
          setSubmitting(false);
        }
      },
    [isValid, submitting, values],
  );

  return {
    values,
    setField,
    setValues,
    touch,
    errorFor,
    isValid,
    isDirty,
    completion,
    submitting,
    submitted,
    formError,
    setFormError,
    handleSubmit,
  };
}

/* ============================================================
   COMMON RULES
============================================================ */

export const rules = {
  required: (label: string) => (value: unknown) =>
    value === undefined || value === null || String(value).trim() === '' ? `${label} is required` : undefined,
  minLength: (label: string, min: number) => (value: unknown) => {
    const length = String(value ?? '').trim().length;
    if (length >= min) return undefined;
    return length === 0 ? `${label} is required` : `${label} needs at least ${min} characters`;
  },
  email: (value: unknown) => {
    const text = String(value ?? '').trim();
    return text && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text) ? 'Enter a valid e-mail address' : undefined;
  },
  phone: (value: unknown) => {
    const digits = String(value ?? '').replace(/\D/g, '');
    return String(value ?? '').trim() && (digits.length < 7 || digits.length > 15)
      ? 'Enter a valid phone number'
      : undefined;
  },
  money: (label: string, { min = 0, required = false } = {}) => (value: unknown) => {
    const text = String(value ?? '').replace(/,/g, '').trim();
    if (!text) return required ? `${label} is required` : undefined;
    const amount = Number(text);
    if (!Number.isFinite(amount)) return `${label} must be a number`;
    if (amount < min) return min > 0 ? `${label} must be more than ${min - 0.01}` : `${label} cannot be negative`;
    return undefined;
  },
};

export function parseMoney(value: string): number {
  return Number(value.replace(/,/g, '').trim() || 0);
}
