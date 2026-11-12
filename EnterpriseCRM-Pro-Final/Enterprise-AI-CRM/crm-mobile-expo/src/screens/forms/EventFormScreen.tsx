import React from 'react';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { createEvent } from '@/api/calendar.api';
import { FormScreen, FormSection } from '@/components/form/FormScreen';
import { ChoiceField, DateField, InputField, PickerField } from '@/components/form/fields';
import { rules, useForm } from '@/hooks/useForm';
import { usePickerData } from '@/hooks/usePickerData';
import type { AppStackParamList } from '@/navigation/types';
import { eventTypeOptions } from '@/screens/forms/options';
import type { CalendarEventType } from '@/types';
import { parseDateInput } from '@/utils/dates';

type Props = NativeStackScreenProps<AppStackParamList, 'EventForm'>;

type Duration = '15' | '30' | '60' | '90' | '120';

type Values = {
  title: string;
  type: CalendarEventType;
  startAt: Date | null;
  duration: Duration;
  location: string;
  notes: string;
  customerId: string | null;
  leadId: string | null;
  opportunityId: string | null;
};

const DURATIONS: { value: Duration; label: string }[] = [
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 hour' },
  { value: '90', label: '1.5 h' },
  { value: '120', label: '2 hours' },
];

/** Default start: the requested day (or tomorrow) at 10:00. */
function defaultStart(date?: string): Date {
  const parsed = date ? parseDateInput(date, '10:00') : null;
  if (parsed) return parsed;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return tomorrow;
}

/** Schedule a meeting, call, follow-up or deadline. */
export function EventFormScreen({ navigation, route }: Props) {
  const customers = usePickerData('customers');
  const leads = usePickerData('leads');
  const deals = usePickerData('deals');

  const form = useForm<Values>(
    {
      title: '',
      type: 'MEETING',
      startAt: defaultStart(route.params?.date),
      duration: '60',
      location: '',
      notes: '',
      customerId: null,
      leadId: null,
      opportunityId: null,
    },
    {
      title: rules.minLength('Title', 1),
      startAt: value => (value ? undefined : 'Choose when it starts'),
    },
  );
  const { values, setField } = form;

  const end = values.startAt ? new Date(values.startAt.getTime() + Number(values.duration) * 60_000) : null;

  const submit = form.handleSubmit(async v => {
    await createEvent({
      title: v.title.trim(),
      type: v.type,
      startAt: v.startAt!.toISOString(),
      endAt: end!.toISOString(),
      location: v.location.trim() || undefined,
      notes: v.notes.trim() || undefined,
      customerId: v.customerId ?? undefined,
      leadId: v.leadId ?? undefined,
      opportunityId: v.opportunityId ?? undefined,
    });
    navigation.goBack();
  }, "Couldn't schedule the event.");

  return (
    <FormScreen
      title="New event"
      subtitle="Add it to the shared team calendar"
      icon="calendar-outline"
      onBack={navigation.goBack}
      onSecondary={navigation.goBack}
      submitLabel="Schedule"
      onSubmit={submit}
      submitting={form.submitting}
      error={form.formError}
      completion={form.completion}
      footerNote={
        end && values.startAt
          ? `${values.startAt.toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} – ${end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
          : undefined
      }
    >
      <FormSection title="Event" icon="calendar-outline">
        <ChoiceField label="Type" options={eventTypeOptions} value={values.type} onChange={v => setField('type', v)} />
        <InputField label="Title" required icon="create-outline" value={values.title} onChangeText={v => setField('title', v)} onBlur={() => form.touch('title')} error={form.errorFor('title')} placeholder="e.g. Product demo with Sharma Textiles" maxLength={200} />
      </FormSection>

      <FormSection title="When" icon="time-outline">
        <DateField label="Starts" required withTime value={values.startAt} onChange={v => setField('startAt', v)} quickDays={[0, 1, 2, 7]} error={form.errorFor('startAt')} />
        <ChoiceField label="Duration" options={DURATIONS} value={values.duration} onChange={v => setField('duration', v)} />
      </FormSection>

      <FormSection title="Details" icon="information-circle-outline">
        <InputField label="Location or link" icon="location-outline" value={values.location} onChangeText={v => setField('location', v)} placeholder="Office, address or meeting link" />
        <InputField label="Notes" value={values.notes} onChangeText={v => setField('notes', v)} multiline placeholder="Agenda, things to bring…" />
      </FormSection>

      <FormSection title="Related to" icon="link-outline">
        <PickerField label="Customer" placeholder="None" items={customers.items} loading={customers.loading} value={values.customerId} onChange={v => setField('customerId', v)} allowClear icon="business-outline" />
        <PickerField label="Lead" placeholder="None" items={leads.items} loading={leads.loading} value={values.leadId} onChange={v => setField('leadId', v)} allowClear icon="person-outline" />
        <PickerField label="Deal" placeholder="None" items={deals.items} loading={deals.loading} value={values.opportunityId} onChange={v => setField('opportunityId', v)} allowClear icon="briefcase-outline" />
      </FormSection>
    </FormScreen>
  );
}
