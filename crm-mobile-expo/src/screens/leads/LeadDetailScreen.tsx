import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import { listActivities } from '@/api/activities.api';
import { getApiErrorMessage } from '@/api/client';
import { describeWork, getWorkLog, type WorkLogEntry } from '@/api/insights.api';
import { convertLead, deleteLead, getLead, updateLeadStatus } from '@/api/leads.api';
import { ActionButton, InfoRow, Panel } from '@/components/common/Panel';
import { ResponsiveGrid } from '@/components/common/ResponsiveGrid';
import { ScreenState } from '@/components/common/ScreenState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { HeroHeader } from '@/components/graphics/HeroHeader';
import { FadeInView } from '@/components/motion/FadeInView';
import { PressableScale } from '@/components/motion/PressableScale';
import { SkeletonCard } from '@/components/motion/Skeleton';
import { useRefreshOnFocus } from '@/hooks/useRefreshOnFocus';
import { useResponsive } from '@/hooks/useResponsive';
import type { AppStackParamList } from '@/navigation/types';
import { LeadConvertCard } from '@/screens/leads/components/LeadConvertCard';
import { ageLabel, leadStatusColor, leadStatusLabel, leadStatusTone, sourceMeta } from '@/screens/leads/LeadListScreen';
import { useTheme, useThemedStyles } from '@/theme/ThemeProvider';
import type { Theme } from '@/theme/types';
import type { Activity, ConvertLeadResult, Lead, LeadStatus } from '@/types';
import { confirmAction } from '@/utils/confirm';
import { longDate } from '@/utils/pdf';
import { useCan } from '@/utils/permissions';

type Props = NativeStackScreenProps<AppStackParamList, 'LeadDetail'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

const FLOW: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'];
const STEP_ICON: Record<LeadStatus, IconName> = {
  NEW: 'add-circle-outline',
  CONTACTED: 'chatbubble-outline',
  QUALIFIED: 'star-outline',
  CONVERTED: 'checkmark-done-outline',
  UNQUALIFIED: 'remove-circle-outline',
  LOST: 'close-circle-outline',
};

export function LeadDetailScreen({ navigation, route }: Props) {
  const { leadId, leadName } = route.params;
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const r = useResponsive();
  const canEdit = useCan('lead.create');
  const canConvert = useCan('lead.convert');
  const canDelete = useCan('lead.assign');
  const canDeal = useCan('deal.create');

  const [lead, setLead] = useState<Lead | null>(null);
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [history, setHistory] = useState<WorkLogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<LeadStatus | 'delete' | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setLead(await getLead(leadId));
      setError(null);
      listActivities({ leadId }).then(setTasks).catch(() => setTasks([]));
      getWorkLog({ targetType: 'Lead', targetId: leadId, limit: 40 }).then(setHistory).catch(() => setHistory([]));
    } catch (err) {
      setError(getApiErrorMessage(err, 'This lead may have been removed or is not visible to you.'));
    }
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);
  useRefreshOnFocus(load);

  const openCustomer = (customerId: string, customerName: string) => navigation.navigate('CustomerDetail', { customerId, customerName });

  const onConverted = (result: ConvertLeadResult) => {
    setLead(result.lead);
    openCustomer(result.customerId, result.lead.customer?.name ?? result.lead.name);
  };

  const changeStatus = async (status: LeadStatus) => {
    if (!lead || status === lead.status || busy) return;
    setActionError(null);
    if (status === 'CONVERTED') {
      const ok = await confirmAction('Convert lead', `Create a customer from “${lead.name}” and a new deal?`, 'Convert');
      if (!ok) return;
      setBusy(status);
      try {
        onConverted(await convertLead(lead.id));
      } catch (err) {
        setActionError(getApiErrorMessage(err, 'Could not convert this lead.'));
      } finally {
        setBusy(null);
      }
      return;
    }
    setBusy(status);
    try {
      setLead(await updateLeadStatus(lead.id, status));
      load();
    } catch (err) {
      setActionError(getApiErrorMessage(err, 'Could not change the status.'));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!lead) return;
    const ok = await confirmAction('Delete lead?', `“${lead.name}” will be permanently removed.`, 'Delete');
    if (!ok) return;
    setBusy('delete');
    try {
      await deleteLead(lead.id);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Could not delete', getApiErrorMessage(err));
      setBusy(null);
    }
  };

  const open = (url: string, fail: string) => Linking.openURL(url).catch(() => Alert.alert(fail));

  const header = (
    <HeroHeader
      title={lead?.name ?? leadName}
      subtitle={lead ? `Lead · ${sourceMeta(lead.source).label} · added ${ageLabel(lead.createdAt)}` : 'Lead'}
      icon="person-outline"
      onBack={navigation.canGoBack() ? navigation.goBack : undefined}
      right={
        canEdit && lead ? (
          <PressableScale onPress={() => navigation.navigate('LeadForm', { lead })} accessibilityRole="button" accessibilityLabel="Edit lead" style={styles.headerBtn}>
            <Ionicons name="create-outline" size={18} color={theme.colors.onPrimary} />
          </PressableScale>
        ) : undefined
      }
    />
  );

  if (!lead) {
    return (
      <View style={styles.screen}>
        {header}
        <View style={[styles.content, { paddingHorizontal: r.gutter }]}>
          {error ? <ScreenState kind="error" message={error} onRetry={load} /> : [0, 1, 2].map(i => <SkeletonCard key={i} lines={3} />)}
        </View>
      </View>
    );
  }

  const color = leadStatusColor(theme, lead.status);
  const initials = lead.name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?';
  const flowIndex = FLOW.indexOf(lead.status);
  const closedOut = lead.status === 'LOST' || lead.status === 'UNQUALIFIED';
  const openTasks = tasks.filter(t => t.status === 'PENDING');

  const quick: { icon: IconName; label: string; show: boolean; onPress: () => void }[] = [
    { icon: 'call-outline', label: 'Call', show: !!lead.phone, onPress: () => open(`tel:${lead.phone}`, 'Calling is not available on this device.') },
    { icon: 'logo-whatsapp', label: 'WhatsApp', show: !!lead.phone, onPress: () => open(`https://wa.me/${(lead.phone ?? '').replace(/\D/g, '').replace(/^(\d{10})$/, '91$1')}`, 'Could not open WhatsApp.') },
    { icon: 'mail-outline', label: 'E-mail', show: !!lead.email, onPress: () => open(`mailto:${lead.email}`, 'No e-mail app found.') },
    { icon: 'checkbox-outline', label: 'Task', show: true, onPress: () => navigation.navigate('TaskForm', { leadId }) },
    { icon: 'git-branch-outline', label: 'Deal', show: canDeal && lead.status !== 'LOST', onPress: () => navigation.navigate('DealForm', { leadId, customerId: lead.customerId ?? undefined }) },
  ];

  return (
    <View style={styles.screen}>
      {header}
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: r.gutter, maxWidth: r.maxWidth }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            tintColor={theme.colors.primary}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {/* identity */}
        <FadeInView index={0} style={[styles.identity, { borderLeftColor: color }]}>
          <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
            <Text style={[styles.avatarText, { color }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name}>{lead.name}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {[lead.phone, lead.email].filter(Boolean).join(' · ') || 'No contact details yet'}
            </Text>
            <View style={styles.badges}>
              <StatusBadge label={leadStatusLabel(lead.status)} tone={leadStatusTone(lead.status)} />
              {lead.score != null ? <StatusBadge label={`Score ${lead.score}`} tone="accent" /> : null}
            </View>
          </View>
        </FadeInView>

        {/* quick actions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
          {quick
            .filter(q => q.show)
            .map(q => (
              <PressableScale key={q.label} onPress={q.onPress} accessibilityRole="button" accessibilityLabel={q.label} style={styles.quick}>
                <View style={[styles.quickIcon, { backgroundColor: theme.colors.primaryLight }]}>
                  <Ionicons name={q.icon} size={19} color={theme.colors.primary} />
                </View>
                <Text style={styles.quickText}>{q.label}</Text>
              </PressableScale>
            ))}
        </ScrollView>

        {/* status tracker */}
        <Panel title="Lead status" icon="trail-sign-outline" subtitle={canEdit ? 'Tap a step to move the lead' : 'Your role can view the status'}>
          <View style={styles.flow}>
            {FLOW.map((s, i) => {
              const done = !closedOut && flowIndex >= i;
              const current = lead.status === s;
              const c = done ? leadStatusColor(theme, s) : theme.colors.border;
              return (
                <React.Fragment key={s}>
                  {i > 0 ? <View style={[styles.flowLine, { backgroundColor: !closedOut && flowIndex >= i ? c : theme.colors.border }]} /> : null}
                  <PressableScale
                    onPress={() => changeStatus(s)}
                    disabled={!canEdit || lead.status === 'CONVERTED' || (s === 'CONVERTED' && !canConvert)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: current }}
                    accessibilityLabel={`Set status ${leadStatusLabel(s)}`}
                    style={styles.flowStep}
                  >
                    <View style={[styles.flowDot, { borderColor: c, backgroundColor: done ? c : theme.colors.surface }, current ? styles.flowDotCurrent : null]}>
                      <Ionicons name={busy === s ? 'hourglass-outline' : STEP_ICON[s]} size={current ? 18 : 15} color={done ? theme.colors.onPrimary : theme.colors.textFaint} />
                    </View>
                    <Text style={[styles.flowLabel, current ? { color: theme.colors.text, fontWeight: '800' } : null]} numberOfLines={1}>
                      {leadStatusLabel(s)}
                    </Text>
                  </PressableScale>
                </React.Fragment>
              );
            })}
          </View>
          {canEdit && lead.status !== 'CONVERTED' ? (
            <View style={styles.closeRow}>
              {(['UNQUALIFIED', 'LOST'] as LeadStatus[]).map(s => {
                const active = lead.status === s;
                const c = leadStatusColor(theme, s);
                return (
                  <PressableScale key={s} onPress={() => changeStatus(s)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.closeBtn, { borderColor: c }, active ? { backgroundColor: c } : null]}>
                    <Ionicons name={STEP_ICON[s]} size={15} color={active ? theme.colors.onPrimary : c} />
                    <Text style={[styles.closeText, { color: active ? theme.colors.onPrimary : c }]}>{active ? leadStatusLabel(s) : `Mark ${leadStatusLabel(s).toLowerCase()}`}</Text>
                  </PressableScale>
                );
              })}
            </View>
          ) : null}
          {actionError ? <Text style={styles.error}>{actionError}</Text> : null}
        </Panel>

        {/* conversion */}
        {lead.status === 'CONVERTED' && lead.customer ? (
          <PressableScale onPress={() => openCustomer(lead.customer!.id, lead.customer!.name)} accessibilityRole="link" style={[styles.converted, { backgroundColor: theme.colors.successSoft }]}>
            <Ionicons name="checkmark-circle" size={22} color={theme.colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.convertedTitle, { color: theme.colors.success }]}>Converted to customer</Text>
              <Text style={styles.meta}>{lead.customer.name} — open the customer page</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={theme.colors.success} />
          </PressableScale>
        ) : canConvert && !closedOut && lead.status !== 'CONVERTED' ? (
          <LeadConvertCard lead={lead} error={actionError} onConverted={onConverted} onOpenCustomer={openCustomer} />
        ) : null}

        <ResponsiveGrid>
          <Panel title="Details" icon="id-card-outline">
            <InfoRow icon="call-outline" label="Phone" value={lead.phone} onPress={lead.phone ? () => open(`tel:${lead.phone}`, 'Calling is not available.') : undefined} />
            <InfoRow icon="mail-outline" label="E-mail" value={lead.email} onPress={lead.email ? () => open(`mailto:${lead.email}`, 'No e-mail app found.') : undefined} />
            <InfoRow icon={sourceMeta(lead.source).icon} label="Source" value={sourceMeta(lead.source).label} />
            <InfoRow icon="person-circle-outline" label="Assigned to" value={lead.assignedTo?.name ?? 'Unassigned'} />
            <InfoRow icon="business-outline" label="Customer" value={lead.customer?.name ?? '—'} onPress={lead.customer ? () => openCustomer(lead.customer!.id, lead.customer!.name) : undefined} />
            <InfoRow icon="calendar-outline" label="Added" value={longDate(lead.createdAt)} />
            <InfoRow icon="refresh-outline" label="Last update" value={longDate(lead.updatedAt)} />
          </Panel>

          <Panel title="Tasks" icon="checkbox-outline" subtitle={`${openTasks.length} open · ${tasks.length - openTasks.length} done`} action={{ label: 'Add', icon: 'add', onPress: () => navigation.navigate('TaskForm', { leadId }) }}>
            {tasks.length === 0 ? (
              <Text style={styles.empty}>No follow-ups yet. Add a call or meeting to keep this lead warm.</Text>
            ) : (
              tasks.slice(0, 12).map(t => {
                const overdue = t.status === 'PENDING' && t.dueAt && new Date(t.dueAt) < new Date();
                return (
                  <View key={t.id} style={styles.taskRow}>
                    <Ionicons
                      name={t.status === 'COMPLETED' ? 'checkmark-circle' : overdue ? 'alert-circle' : 'ellipse-outline'}
                      size={18}
                      color={t.status === 'COMPLETED' ? theme.colors.success : overdue ? theme.colors.danger : theme.colors.warning}
                    />
                    <Text style={[styles.taskText, t.status === 'COMPLETED' ? styles.done : null]} numberOfLines={2}>
                      {t.summary}
                    </Text>
                    <Text style={[styles.taskDate, overdue ? { color: theme.colors.danger } : null]}>{t.dueAt ? longDate(t.dueAt) : ''}</Text>
                  </View>
                );
              })
            )}
          </Panel>
        </ResponsiveGrid>

        <Panel title="History" icon="time-outline" subtitle="Who did what on this lead">
          {history.length === 0 ? (
            <Text style={styles.empty}>No recorded changes yet.</Text>
          ) : (
            history.map(h => (
              <View key={h.id} style={styles.histRow}>
                <View style={[styles.histDot, { backgroundColor: theme.colors.primary }]} />
                <Text style={styles.histText}>
                  <Text style={{ fontWeight: '800', color: theme.colors.text }}>{h.actor?.name ?? 'Someone'}</Text> {describeWork(h)}
                </Text>
                <Text style={styles.taskDate}>{longDate(h.at)}</Text>
              </View>
            ))
          )}
        </Panel>

        {canDelete ? <ActionButton label="Delete lead" icon="trash-outline" variant="danger" onPress={remove} busy={busy === 'delete'} /> : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(theme: Theme) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { paddingTop: 16, paddingBottom: 60, width: '100%', alignSelf: 'center' },
    headerBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.border, borderLeftWidth: 4, padding: 16 },
    avatar: { width: 56, height: 56, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    avatarText: { fontSize: 20, fontWeight: '800' },
    name: { color: theme.colors.text, fontSize: 19, fontWeight: '800' },
    meta: { color: theme.colors.textMuted, fontSize: 13, marginTop: 2 },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    quickRow: { gap: 10, paddingVertical: 14 },
    quick: { alignItems: 'center', width: 68, gap: 6 },
    quickIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    quickText: { color: theme.colors.textSecondary, fontSize: 11, fontWeight: '700' },
    flow: { flexDirection: 'row', alignItems: 'flex-start' },
    flowStep: { alignItems: 'center', width: 64 },
    flowDot: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    flowDotCurrent: { width: 40, height: 40, borderRadius: 20, marginTop: -3 },
    flowLine: { flex: 1, height: 3, borderRadius: 2, marginTop: 16, marginHorizontal: -10 },
    flowLabel: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', marginTop: 6 },
    closeRow: { flexDirection: 'row', gap: 10, marginTop: 16, flexWrap: 'wrap' },
    closeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7 },
    closeText: { fontSize: 12, fontWeight: '800' },
    error: { color: theme.colors.danger, fontSize: 13, marginTop: 10 },
    converted: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: theme.radius.lg, padding: 14, marginBottom: 14 },
    convertedTitle: { fontWeight: '800', fontSize: 15 },
    empty: { color: theme.colors.textFaint, textAlign: 'center', paddingVertical: 10, lineHeight: 19 },
    taskRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
    taskText: { flex: 1, color: theme.colors.text, fontSize: 13 },
    done: { color: theme.colors.textMuted, textDecorationLine: 'line-through' },
    taskDate: { color: theme.colors.textFaint, fontSize: 11 },
    histRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 6 },
    histDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
    histText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 19 },
  });
}
