import type { ChoiceOption } from '@/components/form/fields';
import type { Theme } from '@/theme/types';
import type {
  ActivityType,
  CalendarEventType,
  LeadSource,
  LeadStatus,
  OpportunityStage,
  PaymentMethod,
} from '@/types';

/* ============================================================
   SHARED CHOICE OPTIONS
   Labels, icons and theme colours for every enum the forms use,
   so a stage or status looks the same everywhere in the app.
============================================================ */

export const leadSourceOptions: ChoiceOption<LeadSource>[] = [
  { value: 'WEBSITE', label: 'Website', icon: 'globe-outline' },
  { value: 'REFERRAL', label: 'Referral', icon: 'people-outline' },
  { value: 'COLD_CALL', label: 'Cold call', icon: 'call-outline' },
  { value: 'SOCIAL_MEDIA', label: 'Social', icon: 'share-social-outline' },
  { value: 'EVENT', label: 'Event', icon: 'ticket-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export function leadStatusOptions(theme: Theme): ChoiceOption<LeadStatus>[] {
  return [
    { value: 'NEW', label: 'New', icon: 'sparkles-outline', color: theme.colors.status.new },
    { value: 'CONTACTED', label: 'Contacted', icon: 'chatbubble-outline', color: theme.colors.status.contacted },
    { value: 'QUALIFIED', label: 'Qualified', icon: 'star-outline', color: theme.colors.status.qualified },
    { value: 'UNQUALIFIED', label: 'Unqualified', icon: 'remove-circle-outline', color: theme.colors.textMuted },
    { value: 'LOST', label: 'Lost', icon: 'close-circle-outline', color: theme.colors.status.lost },
  ];
}

export const DEAL_STAGES: OpportunityStage[] = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

/** Typical win probability per stage, used for weighted forecasts. */
export const STAGE_PROBABILITY: Record<OpportunityStage, number> = {
  PROSPECTING: 0.1,
  QUALIFICATION: 0.25,
  PROPOSAL: 0.5,
  NEGOTIATION: 0.75,
  WON: 1,
  LOST: 0,
};

export function stageColor(theme: Theme, stage: OpportunityStage): string {
  return {
    PROSPECTING: theme.colors.textMuted,
    QUALIFICATION: theme.colors.info,
    PROPOSAL: theme.colors.primary,
    NEGOTIATION: theme.colors.accent,
    WON: theme.colors.success,
    LOST: theme.colors.danger,
  }[stage];
}

export function dealStageOptions(theme: Theme): ChoiceOption<OpportunityStage>[] {
  const meta: Record<OpportunityStage, { label: string; icon: ChoiceOption<OpportunityStage>['icon'] }> = {
    PROSPECTING: { label: 'Prospecting', icon: 'search-outline' },
    QUALIFICATION: { label: 'Qualification', icon: 'filter-outline' },
    PROPOSAL: { label: 'Proposal', icon: 'document-text-outline' },
    NEGOTIATION: { label: 'Negotiation', icon: 'swap-horizontal-outline' },
    WON: { label: 'Won', icon: 'trophy-outline' },
    LOST: { label: 'Lost', icon: 'close-circle-outline' },
  };
  return DEAL_STAGES.map(stage => ({
    value: stage,
    label: meta[stage].label,
    icon: meta[stage].icon,
    color: stageColor(theme, stage),
    description: `${Math.round(STAGE_PROBABILITY[stage] * 100)}% typical win chance`,
  }));
}

export const stageLabel = (stage: OpportunityStage) => stage.charAt(0) + stage.slice(1).toLowerCase();

export const activityTypeOptions: ChoiceOption<ActivityType>[] = [
  { value: 'TASK', label: 'Task', icon: 'checkbox-outline' },
  { value: 'CALL', label: 'Call', icon: 'call-outline' },
  { value: 'EMAIL', label: 'E-mail', icon: 'mail-outline' },
  { value: 'MEETING', label: 'Meeting', icon: 'people-outline' },
  { value: 'NOTE', label: 'Note', icon: 'document-text-outline' },
];

export const paymentMethodOptions: ChoiceOption<PaymentMethod>[] = [
  { value: 'UPI', label: 'UPI', icon: 'phone-portrait-outline' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer', icon: 'business-outline' },
  { value: 'CARD', label: 'Card', icon: 'card-outline' },
  { value: 'CASH', label: 'Cash', icon: 'cash-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

export const eventTypeOptions: ChoiceOption<CalendarEventType>[] = [
  { value: 'MEETING', label: 'Meeting', icon: 'people-outline' },
  { value: 'CALL', label: 'Call', icon: 'call-outline' },
  { value: 'FOLLOW_UP', label: 'Follow-up', icon: 'repeat-outline' },
  { value: 'DEADLINE', label: 'Deadline', icon: 'flag-outline' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];
